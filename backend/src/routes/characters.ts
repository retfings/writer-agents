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
router.post('/extract/:projectId/stream', async (req: Request, res: Response) => {
  const user = (req as any).user;
  const db = getDb();
  const { chapterIds } = req.body as { chapterIds: string[] };

  const project = db.prepare('SELECT id, title FROM projects WHERE id = ? AND user_id = ?')
    .get(req.params.projectId, user.id) as any;
  if (!project) { res.status(404).json({ error: '项目不存在' }); return; }
  if (!chapterIds?.length) { res.status(400).json({ error: '请选择章节' }); return; }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  let aborted = false;
  req.on('close', () => { aborted = true; });

  const send = (event: string, data: any) => {
    if (aborted) return;
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const chapters = db.prepare(`
    SELECT id, number, title, content FROM chapters
    WHERE project_id = ? AND id IN (${chapterIds.map(() => '?').join(',')})
    ORDER BY number ASC
  `).all(req.params.projectId, ...chapterIds) as any[];

  if (!chapters.length) { send('error', { message: '未找到章节' }); res.end(); return; }

  const existingChars = db.prepare('SELECT id, name, role, description, traits, relationships, arc FROM characters WHERE project_id = ?')
    .all(req.params.projectId) as any[];

  const processChapters = async () => {
    console.log('[Extract] Starting processing', chapters.length, 'chapters');
    const total = chapters.length;

    for (let i = 0; i < total; i++) {
      if (aborted) { console.log('[Extract] Aborted'); break; }
      const ch = chapters[i];

      send('progress', {
        current: i + 1,
        total,
        chapterId: ch.id,
        chapterTitle: `第${ch.number}章 ${ch.title}`,
        message: `正在分析第${ch.number}章...`,
      });

      try {
        const chars = await extractFromContent(project.title, ch.content, ch.number);
        console.log('[Extract] Ch', ch.number, 'found', chars.length, 'characters:', chars.map(c => c.name).join(', '));
        for (const c of chars) {
          if (aborted) break;
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

    send('done', { message: '分析完成' });
    console.log('[Extract] Done');
    res.end();
  };

  // Keep connection alive by awaiting the processing
  await new Promise<void>((resolve) => {
    const wrapped = async () => {
      try {
        await processChapters();
      } catch (err: any) {
        console.error('[Extract] Error:', err.message);
        if (!aborted) send('error', { message: err.message });
        res.end();
      }
      resolve();
    };
    wrapped();
  });
});

async function extractFromContent(title: string, content: string, chapterNum: number): Promise<any[]> {
  const { default: OpenAI } = await import('openai');
  const client = new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY || '',
    baseURL: 'https://api.deepseek.com/v1',
  });

  const maxLen = 8000;
  const text = content.length > maxLen
    ? content.slice(0, maxLen / 2) + '\n\n...\n\n' + content.slice(-maxLen / 2)
    : content;

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
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return [];
  const parsed = JSON.parse(jsonMatch[0]);
  return parsed.characters || [];
}

export default router;
