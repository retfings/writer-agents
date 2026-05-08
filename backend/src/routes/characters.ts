import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { getDb } from '../db';
import { authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

// List characters for project
router.get('/project/:projectId', (req: Request, res: Response) => {
  const user = (req as any).user;
  const db = getDb();
  
  const project = db.prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?')
    .get(req.params.projectId, user.id);
  if (!project) {
    res.status(404).json({ error: '项目不存在' });
    return;
  }

  const characters = db.prepare('SELECT * FROM characters WHERE project_id = ? ORDER BY created_at ASC')
    .all(req.params.projectId) as any[];

  res.json({
    characters: characters.map(c => ({
      ...c,
      traits: JSON.parse(c.traits || '[]'),
      relationships: JSON.parse(c.relationships || '[]'),
    })),
  });
});

// Create character
router.post('/', (req: Request, res: Response) => {
  const user = (req as any).user;
  const { projectId, name, role, description, traits, relationships, arc } = req.body;
  const db = getDb();

  const project = db.prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?')
    .get(projectId, user.id);
  if (!project) {
    res.status(404).json({ error: '项目不存在' });
    return;
  }

  const id = uuid();
  db.prepare(`
    INSERT INTO characters (id, project_id, name, role, description, traits, relationships, arc)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, projectId, name, role || '', description || '', JSON.stringify(traits || []), JSON.stringify(relationships || []), arc || '');

  const character = db.prepare('SELECT * FROM characters WHERE id = ?').get(id) as any;
  res.json({
    character: {
      ...character,
      traits: JSON.parse(character.traits || '[]'),
      relationships: JSON.parse(character.relationships || '[]'),
    },
  });
});

// Update character
router.put('/:id', (req: Request, res: Response) => {
  const user = (req as any).user;
  const { name, role, description, traits, relationships, arc } = req.body;
  const db = getDb();

  const character = db.prepare(`
    SELECT c.id FROM characters c
    JOIN projects p ON c.project_id = p.id
    WHERE c.id = ? AND p.user_id = ?
  `).get(req.params.id, user.id) as any;

  if (!character) {
    res.status(404).json({ error: '角色不存在' });
    return;
  }

  db.prepare(`
    UPDATE characters SET
      name = COALESCE(?, name),
      role = COALESCE(?, role),
      description = COALESCE(?, description),
      traits = COALESCE(?, traits),
      relationships = COALESCE(?, relationships),
      arc = COALESCE(?, arc)
    WHERE id = ?
  `).run(
    name, role, description,
    traits ? JSON.stringify(traits) : null,
    relationships ? JSON.stringify(relationships) : null,
    arc,
    req.params.id,
  );

  const updated = db.prepare('SELECT * FROM characters WHERE id = ?').get(req.params.id) as any;
  res.json({
    character: {
      ...updated,
      traits: JSON.parse(updated.traits || '[]'),
      relationships: JSON.parse(updated.relationships || '[]'),
    },
  });
});

// Delete character
router.delete('/:id', (req: Request, res: Response) => {
  const user = (req as any).user;
  const db = getDb();
  const result = db.prepare(`
    DELETE FROM characters WHERE id IN (
      SELECT c.id FROM characters c
      JOIN projects p ON c.project_id = p.id
      WHERE c.id = ? AND p.user_id = ?
    )
  `).run(req.params.id, user.id);
  res.json({ success: result.changes > 0 });
});

// SSE: Extract characters from selected chapters
// NOTE: Not async - uses internal promise chain to avoid Express 4 interference
router.post('/extract/:projectId/stream', (req: Request, res: Response) => {
  const user = (req as any).user;
  const db = getDb();
  const { chapterIds } = req.body as { chapterIds: string[] };

  const project = db.prepare('SELECT id, title FROM projects WHERE id = ? AND user_id = ?')
    .get(req.params.projectId, user.id) as any;
  if (!project) { res.status(404).json({ error: '项目不存在' }); return; }
  if (!chapterIds?.length) { res.status(400).json({ error: '请选择章节' }); return; }

  // Set up SSE headers before any await to prevent Express from flushing early
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  // Disable Nagle's algorithm to flush SSE events immediately
  if ((res as any).socket) {
    (res as any).socket.setNoDelay(true);
  }
  res.flushHeaders?.();

  let aborted = false;
  let bytesWritten = 0;
  req.on('close', () => {
    console.log('[Extract] req close event fired. bytes written:', bytesWritten);
    aborted = true;
  });
  req.on('error', (err) => {
    console.log('[Extract] req error:', err.message);
    aborted = true;
  });
  res.on('close', () => {
    console.log('[Extract] res close event fired. bytes written:', bytesWritten);
  });

  const send = (event: string, data: any): boolean => {
    if (aborted) return false;
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    bytesWritten += Buffer.byteLength(payload);
    console.log('[Extract] send', event, 'bytes:', Buffer.byteLength(payload), 'total:', bytesWritten);
    return res.write(payload);
  };

  const chapters = db.prepare(`
    SELECT id, number, title, content, outline FROM chapters
    WHERE project_id = ? AND id IN (${chapterIds.map(() => '?').join(',')})
    ORDER BY number ASC
  `).all(req.params.projectId, ...chapterIds) as any[];

  if (!chapters.length) {
    send('error', { message: '未找到章节' });
    res.end();
    return;
  }

  const existingChars = db.prepare('SELECT id, name, role, description, traits, relationships, arc FROM characters WHERE project_id = ?')
    .all(req.params.projectId) as any[];

  // Start processing asynchronously; Express has already sent headers
  processAllChapters(project.title, chapters, existingChars, send, () => aborted)
    .then(() => {
      if (!aborted) {
        send('done', { message: '分析完成' });
        console.log('[Extract] Done. total bytes:', bytesWritten);
      }
      res.end();
    })
    .catch((err: any) => {
      console.error('[Extract] Fatal error:', err.message);
      if (!aborted) send('error', { message: err.message });
      res.end();
    });
});

async function processAllChapters(
  title: string,
  chapters: any[],
  existingChars: any[],
  send: (event: string, data: any) => boolean,
  isAborted: () => boolean,
): Promise<void> {
  const total = chapters.length;
  console.log('[Extract] Starting processing', total, 'chapters');

  // Keep-alive heartbeat every 2s to prevent proxy/browser idle disconnect
  const heartbeat = setInterval(() => {
    if (isAborted()) return;
    resWriteKeepalive(send);
  }, 2000);

  for (let i = 0; i < total; i++) {
    if (isAborted()) { console.log('[Extract] Aborted at ch', i + 1); break; }
    const ch = chapters[i];

    send('progress', {
      current: i + 1,
      total,
      chapterId: ch.id,
      chapterTitle: `第${ch.number}章 ${ch.title}`,
      message: `正在分析第${ch.number}章...`,
    });

    try {
      const chars = await extractFromContent(title, ch.content, ch.number, ch.outline);
      console.log('[Extract] Ch', ch.number, 'found', chars.length, 'characters:', chars.map((c: any) => c.name).join(', '));
      
      for (const c of chars) {
        if (isAborted()) break;
        const existing = existingChars.find((e: any) => e.name === c.name);
        send('character', {
          ...c,
          chapterNumber: ch.number,
          chapterId: ch.id,
          matchType: existing ? 'merge' : 'new',
          existingId: existing?.id || null,
          existingData: existing ? {
            role: existing.role,
            description: existing.description,
            traits: JSON.parse(existing.traits || '[]'),
            relationships: JSON.parse(existing.relationships || '[]'),
            arc: existing.arc,
          } : null,
        });
      }
    } catch (err: any) {
      send('warn', { chapterId: ch.id, message: `第${ch.number}章分析失败: ${err.message}` });
    }
  }

  clearInterval(heartbeat);
}

// Helper: send SSE keepalive comment
let _keepaliveCount = 0;
function resWriteKeepalive(send: (event: string, data: any) => boolean) {
  _keepaliveCount++;
  // Use raw res.write for heartbeat to avoid double JSON stringify
  // send() already handles the write, just pass empty data
  const ok = send('keepalive', { t: _keepaliveCount });
  if (!ok) {
    console.log('[Extract] keepalive write returned false (backpressure)');
  }
}

async function extractFromContent(title: string, content: string, chapterNum: number, outline?: string): Promise<any[]> {
  const { default: OpenAI } = await import('openai');
  const client = new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY || '',
    baseURL: 'https://api.deepseek.com/v1',
  });

  const maxLen = 8000;
  let text = content.length > maxLen
    ? content.slice(0, maxLen / 2) + '\n\n...\n\n' + content.slice(-maxLen / 2)
    : content;

  // If body text is empty but outline has a summary, use that as fallback
  if (!text.trim() && outline) {
    text = `[本章大纲] ${outline}`;
  }

  // Skip chapters with no text at all (not written yet)
  if (!text.trim()) {
    console.log('[Extract] Ch', chapterNum, 'skipped: no content');
    return [];
  }

  console.log('[Extract] Sending to DeepSeek for Ch', chapterNum, '- text length:', text.length);

  const response = await client.chat.completions.create({
    model: 'deepseek-chat',
    messages: [
      { role: 'system', content: '你是小说角色提取助手。只返回JSON，不要markdown代码块。' },
      { role: 'user', content: `小说《${title}》第${chapterNum}章。提取所有有名有姓的角色。规则：1) 只提取有明确名字或稳定称呼的角色 2) 路人/一次性龙套不提取 3) 性格从行为和对话推断 4) 关系必须是文中体现的 5) 仅返回JSON对象。

JSON格式：{"characters":[{"name":"姓名","aliases":["别名"],"role":"主角|配角|反派","occupation":"职业","appearance":"外貌","personality":["标签"],"relations":[{"target":"对方","relation":"关系"}],"summary":"50字简介"}]}

正文：${text}` },
    ],
    temperature: 0.3,
    max_tokens: 4096,
  });

  const raw = response.choices[0]?.message?.content || '';
  console.log('[Extract] DeepSeek response for Ch', chapterNum, '- raw length:', raw.length);
  
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.log('[Extract] Ch', chapterNum, '- no JSON found in response');
    return [];
  }
  const parsed = JSON.parse(jsonMatch[0]);
  const chars = parsed.characters || [];
  console.log('[Extract] Ch', chapterNum, '- parsed', chars.length, 'characters');
  return chars;
}

export default router;
