import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { getDb } from '../db';
import { authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

// ── List endpoints ──

router.get('/conflicts/:projectId', (req, res) => {
  const user = (req as any).user;
  const db = getDb();
  const project = db.prepare('SELECT id FROM projects WHERE id=? AND user_id=?').get(req.params.projectId, user.id);
  if (!project) { res.status(404).json({ error: '项目不存在' }); return; }
  const items = db.prepare('SELECT * FROM conflicts WHERE project_id=? ORDER BY created_at ASC').all(req.params.projectId) as any[];
  res.json({ conflicts: items.map(i => ({ ...i, parties: JSON.parse(i.parties || '[]') })) });
});

router.get('/suspense/:projectId', (req, res) => {
  const user = (req as any).user;
  const db = getDb();
  const project = db.prepare('SELECT id FROM projects WHERE id=? AND user_id=?').get(req.params.projectId, user.id);
  if (!project) { res.status(404).json({ error: '项目不存在' }); return; }
  const items = db.prepare('SELECT * FROM suspense WHERE project_id=? ORDER BY created_at ASC').all(req.params.projectId) as any[];
  res.json({ suspense: items });
});

router.get('/structure/:projectId', (req, res) => {
  const user = (req as any).user;
  const db = getDb();
  const project = db.prepare('SELECT id FROM projects WHERE id=? AND user_id=?').get(req.params.projectId, user.id);
  if (!project) { res.status(404).json({ error: '项目不存在' }); return; }
  const items = db.prepare('SELECT * FROM story_structures WHERE project_id=? ORDER BY order_index ASC').all(req.params.projectId) as any[];
  res.json({ structure: items });
});

// ── CRUD ──

router.post('/conflicts', (req, res) => {
  const user = (req as any).user;
  const db = getDb();
  const { projectId, type, title, description, parties, chapterId, intensity } = req.body;
  const project = db.prepare('SELECT id FROM projects WHERE id=? AND user_id=?').get(projectId, user.id);
  if (!project) { res.status(404).json({ error: '项目不存在' }); return; }
  const id = uuid();
  db.prepare('INSERT INTO conflicts (id,project_id,type,title,description,parties,chapter_id,intensity) VALUES (?,?,?,?,?,?,?,?)')
    .run(id, projectId, type || 'character_vs_character', title, description || '', JSON.stringify(parties || []), chapterId || null, intensity || 'medium');
  res.json({ conflict: db.prepare('SELECT * FROM conflicts WHERE id=?').get(id) });
});

router.delete('/conflicts/:id', (req, res) => {
  const user = (req as any).user;
  const db = getDb();
  const result = db.prepare('DELETE FROM conflicts WHERE id IN (SELECT c.id FROM conflicts c JOIN projects p ON c.project_id=p.id WHERE c.id=? AND p.user_id=?)').run(req.params.id, user.id);
  res.json({ success: result.changes > 0 });
});

router.post('/suspense', (req, res) => {
  const user = (req as any).user;
  const db = getDb();
  const { projectId, type, title, description, chapterId, payoffChapterId } = req.body;
  const project = db.prepare('SELECT id FROM projects WHERE id=? AND user_id=?').get(projectId, user.id);
  if (!project) { res.status(404).json({ error: '项目不存在' }); return; }
  const id = uuid();
  db.prepare('INSERT INTO suspense (id,project_id,type,title,description,chapter_id,payoff_chapter_id) VALUES (?,?,?,?,?,?,?)')
    .run(id, projectId, type || 'mystery', title, description || '', chapterId || null, payoffChapterId || null);
  res.json({ suspense: db.prepare('SELECT * FROM suspense WHERE id=?').get(id) });
});

router.delete('/suspense/:id', (req, res) => {
  const user = (req as any).user;
  const db = getDb();
  const result = db.prepare('DELETE FROM suspense WHERE id IN (SELECT s.id FROM suspense s JOIN projects p ON s.project_id=p.id WHERE s.id=? AND p.user_id=?)').run(req.params.id, user.id);
  res.json({ success: result.changes > 0 });
});

router.post('/structure', (req, res) => {
  const user = (req as any).user;
  const db = getDb();
  const { projectId, element, title, description, chapterId, chapterNumber, orderIndex } = req.body;
  const project = db.prepare('SELECT id FROM projects WHERE id=? AND user_id=?').get(projectId, user.id);
  if (!project) { res.status(404).json({ error: '项目不存在' }); return; }
  const id = uuid();
  db.prepare('INSERT INTO story_structures (id,project_id,element,title,description,chapter_id,chapter_number,order_index) VALUES (?,?,?,?,?,?,?,?)')
    .run(id, projectId, element, title, description || '', chapterId || null, chapterNumber || 0, orderIndex || 0);
  res.json({ structure: db.prepare('SELECT * FROM story_structures WHERE id=?').get(id) });
});

router.delete('/structure/:id', (req, res) => {
  const user = (req as any).user;
  const db = getDb();
  const result = db.prepare('DELETE FROM story_structures WHERE id IN (SELECT s.id FROM story_structures s JOIN projects p ON s.project_id=p.id WHERE s.id=? AND p.user_id=?)').run(req.params.id, user.id);
  res.json({ success: result.changes > 0 });
});

// ── Unified SSE extraction ──
// POST /api/analysis/extract/:projectId/stream
// body: { chapterIds: string[], types: ('foreshadowing'|'conflicts'|'suspense'|'structure')[] }
router.post('/extract/:projectId/stream', (req: Request, res: Response) => {
  const user = (req as any).user;
  const db = getDb();
  const { chapterIds, types } = req.body as { chapterIds: string[]; types: string[] };

  const project = db.prepare('SELECT id, title FROM projects WHERE id = ? AND user_id = ?')
    .get(req.params.projectId, user.id) as any;
  if (!project) { res.status(404).json({ error: '项目不存在' }); return; }
  if (!chapterIds?.length) { res.status(400).json({ error: '请选择章节' }); return; }
  if (!types?.length) { res.status(400).json({ error: '请选择分析类型' }); return; }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  if ((res as any).socket) (res as any).socket.setNoDelay(true);
  res.flushHeaders?.();

  let aborted = false;
  let bytesWritten = 0;
  res.on('close', () => { aborted = true; });
  req.on('error', () => { aborted = true; });

  const send = (event: string, data: any): boolean => {
    if (aborted) return false;
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    bytesWritten += Buffer.byteLength(payload);
    return res.write(payload);
  };

  const chapters = db.prepare(`
    SELECT id, number, title, content, outline FROM chapters
    WHERE project_id = ? AND id IN (${chapterIds.map(() => '?').join(',')})
    ORDER BY number ASC
  `).all(req.params.projectId, ...chapterIds) as any[];

  if (!chapters.length) { send('error', { message: '未找到章节' }); res.end(); return; }

  const isAborted = () => aborted;
  const title = project.title;

  // Start async processing
  processAnalysis(title, chapters, types, send, isAborted)
    .then(() => {
      if (!aborted) send('done', { message: '分析完成', types });
      res.end();
    })
    .catch((err: any) => {
      console.error('[Analysis] Fatal error:', err.message);
      if (!aborted) send('error', { message: err.message });
      res.end();
    });
});

async function processAnalysis(
  title: string,
  chapters: any[],
  types: string[],
  send: (event: string, data: any) => boolean,
  isAborted: () => boolean,
): Promise<void> {
  const total = chapters.length;

  // Heartbeat
  const heartbeat = setInterval(() => {
    if (isAborted()) return;
    send('keepalive', {});
  }, 2000);

  for (let i = 0; i < total; i++) {
    if (isAborted()) break;
    const ch = chapters[i];
    const text = ch.content || (ch.outline ? `[大纲] ${ch.outline}` : '');

    send('progress', {
      current: i + 1, total,
      chapterId: ch.id, chapterTitle: `第${ch.number}章 ${ch.title}`,
      message: `正在分析第${ch.number}章...`,
    });

    if (!text.trim()) continue;

    for (const type of types) {
      if (isAborted()) break;
      try {
        const items = await extractByType(title, text, ch, type);
        for (const item of items) {
          if (isAborted()) break;
          send(type, { ...item, chapterId: ch.id, chapterNumber: ch.number });
        }
      } catch (err: any) {
        send('warn', { chapterId: ch.id, type, message: `第${ch.number}章${type}分析失败: ${err.message}` });
      }
    }
  }

  clearInterval(heartbeat);
}

async function extractByType(title: string, text: string, ch: any, type: string): Promise<any[]> {
  const { default: OpenAI } = await import('openai');
  const client = new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY || '',
    baseURL: 'https://api.deepseek.com/v1',
  });

  const maxLen = 6000;
  const snippet = text.length > maxLen
    ? text.slice(0, maxLen / 2) + '\n\n...\n\n' + text.slice(-maxLen / 2)
    : text;

  const prompts: Record<string, { system: string; user: string }> = {
    foreshadowing: {
      system: '你是小说伏笔分析助手。只返回JSON，不要markdown代码块。',
      user: `小说《${title}》第${ch.number}章。找出本章埋下的伏笔线索。规则：1) 只提取明确的伏笔（为后续情节做铺垫的细节/暗示/未解之谜）2) 每条伏笔简要说明它可能如何影响后续情节 3) 仅返回JSON。

JSON格式：{"items":[{"title":"伏笔名称","description":"伏笔内容和可能的发展方向","plantedInChapter":${ch.number}}]}

正文：${snippet}`
    },
    conflicts: {
      system: '你是小说冲突分析助手。只返回JSON，不要markdown代码块。',
      user: `小说《${title}》第${ch.number}章。分析本章中出现的冲突。规则：1) 类型包括：人物vs人物、人物vs自身、人物vs环境、人物vs社会 2) 描述冲突双方和冲突本质 3) 标注冲突强度（low/medium/high/critical）4) 仅返回JSON。

JSON格式：{"items":[{"type":"冲突类型","title":"冲突名称","description":"冲突描述","parties":["参与方1","参与方2"],"intensity":"强度等级"}]}

正文：${snippet}`
    },
    suspense: {
      system: '你是小说悬念分析助手。只返回JSON，不要markdown代码块。',
      user: `小说《${title}》第${ch.number}章。分析本章制造了哪些悬念。规则：1) 类型包括：mystery(谜团)、cliffhanger(断章)、dilemma(两难)、foreshadow(预示) 2) 描述悬念内容和读者的期待 3) 仅返回JSON。

JSON格式：{"items":[{"type":"悬念类型","title":"悬念名称","description":"悬念描述和读者想知道什么"}]}

正文：${snippet}`
    },
    structure: {
      system: '你是小说结构分析助手。只返回JSON，不要markdown代码块。',
      user: `小说《${title}》第${ch.number}章。分析本章在故事结构中的功能。规则：1) 识别本章属于哪个结构节点（激励事件/上升行动/中点转折/高潮/下降行动/结局/铺垫/过渡）2) 描述本章如何推进整体结构 3) 仅返回JSON。

JSON格式：{"items":[{"element":"结构节点","title":"节点名称","description":"本章在整体结构中的功能描述"}]}

正文：${snippet}`
    },
  };

  const prompt = prompts[type];
  if (!prompt) return [];

  const response = await client.chat.completions.create({
    model: 'deepseek-chat',
    messages: [
      { role: 'system', content: prompt.system },
      { role: 'user', content: prompt.user },
    ],
    temperature: 0.3,
    max_tokens: 2048,
  });

  const raw = response.choices[0]?.message?.content || '';
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return [];
  const parsed = JSON.parse(jsonMatch[0]);
  return (parsed.items || []).map((item: any, idx: number) => ({
    ...item,
    _idx: idx,
    type: item.type || type,
  }));
}

export default router;
