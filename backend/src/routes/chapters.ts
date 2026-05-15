import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { getDb } from '../db';
import { authMiddleware } from '../middleware/auth';
import { AgentOrchestrator } from '../agents/orchestrator';
import type { AgentConfig } from '../types';

const router = Router();
router.use(authMiddleware);

// orchestrator cache per project
const orchestrators = new Map<string, AgentOrchestrator>();

function inferPacing(content: string): string {
  if (!content) return '';
  // Rough heuristic: more action verbs/movement = intense pace
  const actionWords = ['冲','跑','跳','杀','死','血','追','逃','吼','撞','摔','炸'];
  const count = actionWords.filter(w => content.includes(w)).length;
  if (count > 8) return 'intense';
  if (count < 3) return 'slow';
  return 'medium';
}

function getOrchestrator(projectId: string): AgentOrchestrator {
  if (!orchestrators.has(projectId)) {
    const db = getDb();
    const project = db.prepare('SELECT agent_config FROM projects WHERE id = ?').get(projectId) as any;
    const configs: AgentConfig[] = project ? JSON.parse(project.agent_config || '[]') : [];
    
    if (configs.length === 0) {
      // Default configs with DeepSeek
      const { getAgentConfigs } = require('../models');
      const orchestrator = new AgentOrchestrator(getAgentConfigs('deepseek'));
      orchestrators.set(projectId, orchestrator);
      return orchestrator;
    }
    
    const orchestrator = new AgentOrchestrator(configs);
    orchestrators.set(projectId, orchestrator);
  }
  return orchestrators.get(projectId)!;
}

// List chapters for a project
router.get('/project/:projectId', (req: Request, res: Response) => {
  const user = (req as any).user;
  const db = getDb();
  
  const project = db.prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?')
    .get(req.params.projectId, user.id);
  if (!project) {
    res.status(404).json({ error: '项目不存在' });
    return;
  }

  const chapters = db.prepare(
    'SELECT * FROM chapters WHERE project_id = ? ORDER BY number ASC'
  ).all(req.params.projectId) as any[];

  res.json({
    chapters: chapters.map(c => ({
      ...c,
      characters: JSON.parse(c.characters || '[]'),
      keyEvents: JSON.parse(c.key_events || '[]'),
      agentNotes: JSON.parse(c.agent_notes || '[]'),
    })),
  });
});

// Get single chapter
router.get('/:id', (req: Request, res: Response) => {
  const user = (req as any).user;
  const db = getDb();
  
  const chapter = db.prepare(`
    SELECT c.* FROM chapters c
    JOIN projects p ON c.project_id = p.id
    WHERE c.id = ? AND p.user_id = ?
  `).get(req.params.id, user.id) as any;

  if (!chapter) {
    res.status(404).json({ error: '章节不存在' });
    return;
  }

  res.json({
    chapter: {
      ...chapter,
      characters: JSON.parse(chapter.characters || '[]'),
      keyEvents: JSON.parse(chapter.key_events || '[]'),
      agentNotes: JSON.parse(chapter.agent_notes || '[]'),
    },
  });
});

// Generate chapter outline using Planner agent
router.post('/:projectId/generate-outline', async (req: Request, res: Response) => {
  const user = (req as any).user;
  const db = getDb();

  const project = db.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?')
    .get(req.params.projectId, user.id) as any;
  if (!project) {
    res.status(404).json({ error: '项目不存在' });
    return;
  }

  try {
    const orchestrator = getOrchestrator(req.params.projectId as string);
    const result = await orchestrator.generateOutline({
      genre: project.genre as string,
      synopsis: project.synopsis as string,
      targetWords: project.target_words as number,
      totalChapters: project.total_chapters as number,
    });

    // Save chapters to DB
    const insertStmt = db.prepare(`
      INSERT OR REPLACE INTO chapters (id, project_id, number, title, outline, status)
      VALUES (?, ?, ?, ?, ?, 'outline')
    `);

    for (const ch of result.chapters) {
      insertStmt.run(uuid(), req.params.projectId, ch.number, ch.title, ch.summary);
    }

    db.prepare("UPDATE projects SET updated_at = datetime('now') WHERE id = ?")
      .run(req.params.projectId);

    res.json(result);
  } catch (err: any) {
    console.error('Generate outline error:', err);
    res.status(500).json({ error: err.message || '大纲生成失败' });
  }
});

// Write a chapter using the full multi-agent pipeline
router.post('/:projectId/write', async (req: Request, res: Response) => {
  const user = (req as any).user;
  const db = getDb();

  const project = db.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?')
    .get(req.params.projectId, user.id) as any;
  if (!project) {
    res.status(404).json({ error: '项目不存在' });
    return;
  }

  const { chapterNumber, instructions } = req.body;
  if (!chapterNumber) {
    res.status(400).json({ error: '请指定章节号' });
    return;
  }

  // Get existing chapter outline
  const existingChapter = db.prepare(
    'SELECT * FROM chapters WHERE project_id = ? AND number = ?'
  ).get(req.params.projectId, chapterNumber) as any;

  // Get previous chapters for context (last 3 with content)
  const prevChapters = db.prepare(
    'SELECT number, title, content, outline FROM chapters WHERE project_id = ? AND number < ? AND content IS NOT NULL AND content != \'\' ORDER BY number DESC LIMIT 3'
  ).all(req.params.projectId, chapterNumber) as any[];
  const prevChapter = prevChapters[0] || null;

  // Build comprehensive context
  const previousContent = prevChapters.map(c => c.content).join('\n').slice(-2000);
  const previousChapterEnd = prevChapter?.content?.slice(-300) || '';
  const previousChapterSummary = prevChapter?.outline || '';

  // Extract cliffhanger from last chapter's final paragraph
  let previousCliffhanger = '';
  if (prevChapter?.content) {
    const ending = prevChapter.content.slice(-400);
    const sentences = ending.split(/[。！？\n]/).filter(Boolean);
    previousCliffhanger = sentences.slice(-3).join('。').slice(0, 200);
  }

  // Collect unresolved foreshadowing
  const hangingHooks: string[] = [];
  const foreshadowings = db.prepare(
    'SELECT title, description FROM foreshadowing WHERE project_id = ? AND status = \'pending\' ORDER BY created_at ASC LIMIT 5'
  ).all(req.params.projectId) as any[];
  foreshadowings.forEach((f: any) => {
    hangingHooks.push(`${f.title}：${f.description?.slice(0, 80) || ''}`);
  });

  // Determine pacing context
  const totalChapters = db.prepare(
    'SELECT MAX(number) as total FROM chapters WHERE project_id = ?'
  ).get(req.params.projectId) as any;
  const totalCount = totalChapters?.total || chapterNumber;
  const prevPacingType = chapterNumber > 1 ? inferPacing(prevChapter?.content || '') : '';

  const pacingContext = {
    chapterNumber,
    totalChapters: totalCount,
    prevPacingType,
    tensionLevel: chapterNumber <= 3 ? 'high' : chapterNumber <= 5 ? 'medium' : 'normal',
  };

  // Get characters
  const characters = db.prepare(
    'SELECT * FROM characters WHERE project_id = ?'
  ).all(req.params.projectId) as any[];

  try {
    const orchestrator = getOrchestrator(req.params.projectId as string);
    const result = await orchestrator.writeChapter({
      projectId: req.params.projectId as string,
      chapterNumber: chapterNumber as number,
      outline: existingChapter ? {
        number: existingChapter.number,
        title: existingChapter.title,
        summary: existingChapter.outline,
        keyEvents: JSON.parse(existingChapter.key_events || '[]'),
        characters: JSON.parse(existingChapter.characters || '[]'),
        povCharacter: '',
        estimatedWords: Math.round((project.target_words || 200000) / (project.total_chapters || 100)),
      } : undefined,
      previousContent,
      previousChapterEnd,
      previousChapterSummary,
      previousCliffhanger,
      hangingHooks,
      pacingContext,
      characters: characters.map(c => ({
        id: c.id,
        projectId: c.project_id,
        name: c.name,
        role: c.role,
        description: c.description,
        traits: JSON.parse(c.traits || '[]'),
        relationships: JSON.parse(c.relationships || '[]'),
        arc: c.arc,
      })),
      style: '快节奏爽文',
      instructions,
    });

    // Save or update the chapter
    const chapterId = existingChapter?.id || uuid();
    db.prepare(`
      INSERT OR REPLACE INTO chapters (id, project_id, number, title, outline, content, word_count, status, agent_notes, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?, datetime('now'))
    `).run(
      chapterId,
      req.params.projectId,
      chapterNumber,
      existingChapter?.title || `第${chapterNumber}章`,
      existingChapter?.outline || '',
      result.content,
      result.wordCount,
      JSON.stringify(result.agentResults),
    );

    db.prepare("UPDATE projects SET updated_at = datetime('now') WHERE id = ?")
      .run(req.params.projectId);

    res.json(result);
  } catch (err: any) {
    console.error('Write chapter error:', err);
    res.status(500).json({ error: err.message || '章节生成失败' });
  }
});

// Review a chapter using Editor agent
router.post('/:id/review', async (req: Request, res: Response) => {
  const user = (req as any).user;
  const db = getDb();

  const chapter = db.prepare(`
    SELECT c.*, p.genre, p.id as project_id FROM chapters c
    JOIN projects p ON c.project_id = p.id
    WHERE c.id = ? AND p.user_id = ?
  `).get(req.params.id, user.id) as any;

  if (!chapter) {
    res.status(404).json({ error: '章节不存在' });
    return;
  }

  const characters = db.prepare('SELECT * FROM characters WHERE project_id = ?')
    .all(chapter.project_id) as any[];

  try {
    const orchestrator = getOrchestrator(chapter.project_id);
    const result = await orchestrator.reviewChapter({
      content: chapter.content,
      chapterNumber: chapter.number,
      genre: chapter.genre,
      characters: characters.map((c: any) => ({
        id: c.id,
        projectId: c.project_id,
        name: c.name,
        role: c.role,
        description: c.description,
        traits: JSON.parse(c.traits || '[]'),
        relationships: JSON.parse(c.relationships || '[]'),
        arc: c.arc,
      })),
    });

    res.json(result);
  } catch (err: any) {
    console.error('Review chapter error:', err);
    res.status(500).json({ error: err.message || '审校失败' });
  }
});

// Rewrite a chapter with instructions
router.post('/:id/rewrite', async (req: Request, res: Response) => {
  const user = (req as any).user;
  const db = getDb();

  const chapter = db.prepare(`
    SELECT c.*, p.genre, p.id as project_id FROM chapters c
    JOIN projects p ON c.project_id = p.id
    WHERE c.id = ? AND p.user_id = ?
  `).get(req.params.id, user.id) as any;

  if (!chapter) {
    res.status(404).json({ error: '章节不存在' });
    return;
  }

  const { instructions } = req.body;
  if (!instructions || !instructions.trim()) {
    res.status(400).json({ error: '请提供重写要求' });
    return;
  }

  // Get previous chapter content
  const prevChapter = db.prepare(
    'SELECT content FROM chapters WHERE project_id = ? AND number = ? ORDER BY number DESC LIMIT 1'
  ).get(chapter.project_id, chapter.number - 1) as any;

  // Get characters
  const characters = db.prepare(
    'SELECT * FROM characters WHERE project_id = ?'
  ).all(chapter.project_id) as any[];

  try {
    const orchestrator = getOrchestrator(chapter.project_id);
    const result = await orchestrator.rewriteChapter({
      chapterNumber: chapter.number,
      chapterTitle: chapter.title,
      originalContent: chapter.content || '',
      outline: chapter.outline || '',
      previousContent: prevChapter?.content || '',
      characters: characters.map(c => ({
        id: c.id,
        projectId: c.project_id,
        name: c.name,
        role: c.role,
        description: c.description,
        traits: JSON.parse(c.traits || '[]'),
        relationships: JSON.parse(c.relationships || '[]'),
        arc: c.arc,
      })),
      instructions: instructions.trim(),
      style: '快节奏爽文',
    });

    // Save rewritten content
    db.prepare(`
      UPDATE chapters SET
        content = ?,
        word_count = ?,
        agent_notes = ?,
        status = 'draft',
        updated_at = datetime('now')
      WHERE id = ?
    `).run(
      result.content,
      result.wordCount,
      JSON.stringify(result.agentResults),
      req.params.id,
    );

    db.prepare("UPDATE projects SET updated_at = datetime('now') WHERE id = ?")
      .run(chapter.project_id);

    res.json(result);
  } catch (err: any) {
    console.error('Rewrite chapter error:', err);
    res.status(500).json({ error: err.message || '重写失败' });
  }
});

// Update chapter content manually
router.put('/:id', (req: Request, res: Response) => {
  const user = (req as any).user;
  const db = getDb();
  const { title, content, outline, status } = req.body;

  const chapter = db.prepare(`
    SELECT c.id FROM chapters c
    JOIN projects p ON c.project_id = p.id
    WHERE c.id = ? AND p.user_id = ?
  `).get(req.params.id, user.id) as any;

  if (!chapter) {
    res.status(404).json({ error: '章节不存在' });
    return;
  }

  const wordCount = content ? (content.match(/[\u4e00-\u9fff]/g)?.length || 0) : undefined;

  db.prepare(`
    UPDATE chapters SET
      title = COALESCE(?, title),
      content = COALESCE(?, content),
      outline = COALESCE(?, outline),
      word_count = COALESCE(?, word_count),
      status = COALESCE(?, status),
      updated_at = datetime('now')
    WHERE id = ?
  `).run(title, content, outline, wordCount, status, req.params.id);

  const updated = db.prepare('SELECT * FROM chapters WHERE id = ?').get(req.params.id) as any;
  res.json({
    chapter: {
      ...updated,
      characters: JSON.parse(updated.characters || '[]'),
      keyEvents: JSON.parse(updated.key_events || '[]'),
      agentNotes: JSON.parse(updated.agent_notes || '[]'),
    },
  });
});

// Delete single chapter
router.delete('/:id', (req: Request, res: Response) => {
  const user = (req as any).user;
  const db = getDb();

  const result = db.prepare(`
    DELETE FROM chapters WHERE id IN (
      SELECT c.id FROM chapters c
      JOIN projects p ON c.project_id = p.id
      WHERE c.id = ? AND p.user_id = ?
    )
  `).run(req.params.id, user.id);

  res.json({ success: result.changes > 0 });
});

// Bulk delete all chapters for a project
router.delete('/project/:projectId/all', (req: Request, res: Response) => {
  const user = (req as any).user;
  const db = getDb();

  const project = db.prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?')
    .get(req.params.projectId, user.id) as any;
  if (!project) {
    res.status(404).json({ error: '项目不存在' });
    return;
  }

  const result = db.prepare('DELETE FROM chapters WHERE project_id = ?')
    .run(req.params.projectId);

  db.prepare("UPDATE projects SET updated_at = datetime('now') WHERE id = ?")
    .run(req.params.projectId);

  res.json({ success: true, deleted: result.changes });
});

export default router;
