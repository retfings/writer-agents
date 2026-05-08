import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db';
import { authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware as any);

// List notes for a project
router.get('/project/:projectId', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const items = db.prepare(
      'SELECT * FROM world_notes WHERE project_id = ? ORDER BY created_at ASC'
    ).all(req.params.projectId);
    res.json({ notes: items });
  } catch (err: any) {
    res.status(500).json({ error: '获取笔记失败' });
  }
});

// Create
router.post('/', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { projectId, title, content, category, chapterId } = req.body;
    if (!projectId || !title) {
      return res.status(400).json({ error: 'projectId 和 title 必填' });
    }

    const id = uuidv4();
    db.prepare(
      `INSERT INTO world_notes (id, project_id, title, content, category, chapter_id)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(id, projectId, title, content || '', category || 'general', chapterId || null);

    const item = db.prepare('SELECT * FROM world_notes WHERE id = ?').get(id);
    res.status(201).json({ note: item });
  } catch (err: any) {
    res.status(500).json({ error: '创建笔记失败' });
  }
});

// Update
router.put('/:id', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM world_notes WHERE id = ?').get(req.params.id) as any;
    if (!existing) return res.status(404).json({ error: '笔记不存在' });

    const { title, content, category, chapterId } = req.body;
    db.prepare(
      `UPDATE world_notes SET
        title = COALESCE(?, title),
        content = COALESCE(?, content),
        category = COALESCE(?, category),
        chapter_id = COALESCE(?, chapter_id),
        updated_at = datetime('now')
       WHERE id = ?`
    ).run(
      title ?? null, content ?? null,
      category ?? null, chapterId ?? null,
      req.params.id
    );

    const item = db.prepare('SELECT * FROM world_notes WHERE id = ?').get(req.params.id);
    res.json({ note: item });
  } catch (err: any) {
    res.status(500).json({ error: '更新笔记失败' });
  }
});

// Delete
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM world_notes WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: '删除笔记失败' });
  }
});

export default router;
