import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db';
import { authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware as any);

// List foreshadowing for a project
router.get('/project/:projectId', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const items = db.prepare(
      'SELECT * FROM foreshadowing WHERE project_id = ? ORDER BY created_at ASC'
    ).all(req.params.projectId);
    res.json({ foreshadowing: items });
  } catch (err: any) {
    res.status(500).json({ error: '获取伏笔失败' });
  }
});

// Create
router.post('/', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { projectId, title, description, plantedChapterId, revealedChapterId } = req.body;
    if (!projectId || !title) {
      return res.status(400).json({ error: 'projectId 和 title 必填' });
    }

    const id = uuidv4();
    db.prepare(
      `INSERT INTO foreshadowing (id, project_id, title, description, planted_chapter_id, revealed_chapter_id)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(id, projectId, title, description || '', plantedChapterId || null, revealedChapterId || null);

    const item = db.prepare('SELECT * FROM foreshadowing WHERE id = ?').get(id);
    res.status(201).json({ foreshadowing: item });
  } catch (err: any) {
    res.status(500).json({ error: '创建伏笔失败' });
  }
});

// Update
router.put('/:id', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM foreshadowing WHERE id = ?').get(req.params.id) as any;
    if (!existing) return res.status(404).json({ error: '伏笔不存在' });

    const { title, description, plantedChapterId, revealedChapterId, status } = req.body;
    db.prepare(
      `UPDATE foreshadowing SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        planted_chapter_id = COALESCE(?, planted_chapter_id),
        revealed_chapter_id = COALESCE(?, revealed_chapter_id),
        status = COALESCE(?, status),
        updated_at = datetime('now')
       WHERE id = ?`
    ).run(
      title ?? null, description ?? null,
      plantedChapterId ?? null, revealedChapterId ?? null,
      status ?? null, req.params.id
    );

    const item = db.prepare('SELECT * FROM foreshadowing WHERE id = ?').get(req.params.id);
    res.json({ foreshadowing: item });
  } catch (err: any) {
    res.status(500).json({ error: '更新伏笔失败' });
  }
});

// Delete
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM foreshadowing WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: '删除伏笔失败' });
  }
});

export default router;
