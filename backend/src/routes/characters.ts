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

export default router;
