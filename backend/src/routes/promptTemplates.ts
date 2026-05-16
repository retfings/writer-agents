import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { getDb } from '../db';
import { authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

const DEFAULT_SYSTEM_PROMPT = `你是番茄小说平台的 AI 写作助手。`;

const DEFAULT_USER_PROMPT = `请为以下任务提供输出：`;

// List all prompt templates for user
router.get('/', (req: Request, res: Response) => {
  const user = (req as any).user;
  const db = getDb();

  const templates = db.prepare(`
    SELECT * FROM approval_prompt_templates
    WHERE user_id = ? ORDER BY is_default DESC, updated_at DESC
  `).all(user.id) as any[];

  res.json({ templates });
});

// Get single template with versions
router.get('/:id', (req: Request, res: Response) => {
  const user = (req as any).user;
  const db = getDb();

  const template = db.prepare(`
    SELECT * FROM approval_prompt_templates WHERE id = ? AND user_id = ?
  `).get(req.params.id, user.id) as any;

  if (!template) {
    res.status(404).json({ error: '模板不存在' });
    return;
  }

  const versions = db.prepare(`
    SELECT * FROM approval_prompt_versions
    WHERE template_id = ? ORDER BY version DESC
  `).all(req.params.id) as any[];

  res.json({ template, versions });
});

// Create new template
router.post('/', (req: Request, res: Response) => {
  const user = (req as any).user;
  const db = getDb();
  const { name, systemPrompt, userPrompt, isDefault } = req.body;

  if (!name) {
    res.status(400).json({ error: '模板名称不能为空' });
    return;
  }

  const id = uuid();
  const system = systemPrompt || DEFAULT_SYSTEM_PROMPT;
  const userP = userPrompt || DEFAULT_USER_PROMPT;

  db.prepare(`
    INSERT INTO approval_prompt_templates (id, user_id, name, system_prompt, user_prompt, version, is_default)
    VALUES (?, ?, ?, ?, ?, 1, ?)
  `).run(id, user.id, name, system, userP, isDefault ? 1 : 0);

  // If this is default, unset other defaults
  if (isDefault) {
    db.prepare(`
      UPDATE approval_prompt_templates SET is_default = 0
      WHERE user_id = ? AND id != ?
    `).run(user.id, id);
  }

  // Save first version
  db.prepare(`
    INSERT INTO approval_prompt_versions (id, template_id, version, system_prompt, user_prompt)
    VALUES (?, ?, 1, ?, ?)
  `).run(uuid(), id, system, userP);

  const template = db.prepare('SELECT * FROM approval_prompt_templates WHERE id = ?').get(id);
  res.json({ template });
});

// Update template (creates new version)
router.put('/:id', (req: Request, res: Response) => {
  const user = (req as any).user;
  const db = getDb();
  const { name, systemPrompt, userPrompt, isDefault } = req.body;

  const template = db.prepare(`
    SELECT * FROM approval_prompt_templates WHERE id = ? AND user_id = ?
  `).get(req.params.id, user.id) as any;

  if (!template) {
    res.status(404).json({ error: '模板不存在' });
    return;
  }

  const newVersion = template.version + 1;
  const system = systemPrompt || template.system_prompt;
  const userP = userPrompt || template.user_prompt;
  const templateName = name || template.name;

  // Update template
  db.prepare(`
    UPDATE approval_prompt_templates
    SET name = ?, system_prompt = ?, user_prompt = ?, version = ?, is_default = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(templateName, system, userP, newVersion, isDefault ? 1 : 0, req.params.id);

  // If this is default, unset other defaults
  if (isDefault) {
    db.prepare(`
      UPDATE approval_prompt_templates SET is_default = 0
      WHERE user_id = ? AND id != ?
    `).run(user.id, req.params.id);
  }

  // Save new version
  db.prepare(`
    INSERT INTO approval_prompt_versions (id, template_id, version, system_prompt, user_prompt)
    VALUES (?, ?, ?, ?, ?)
  `).run(uuid(), req.params.id, newVersion, system, userP);

  const updated = db.prepare('SELECT * FROM approval_prompt_templates WHERE id = ?').get(req.params.id);
  res.json({ template: updated });
});

// Delete template
router.delete('/:id', (req: Request, res: Response) => {
  const user = (req as any).user;
  const db = getDb();

  const template = db.prepare(`
    SELECT * FROM approval_prompt_templates WHERE id = ? AND user_id = ?
  `).get(req.params.id, user.id) as any;

  if (!template) {
    res.status(404).json({ error: '模板不存在' });
    return;
  }

  db.prepare('DELETE FROM approval_prompt_templates WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Get default template for user
router.get('/default/current', (req: Request, res: Response) => {
  const user = (req as any).user;
  const db = getDb();

  const template = db.prepare(`
    SELECT * FROM approval_prompt_templates
    WHERE user_id = ? AND is_default = 1
    LIMIT 1
  `).get(user.id) as any;

  if (!template) {
    // Return empty if no default set
    res.json({ template: null });
    return;
  }

  res.json({ template });
});

// Initialize default templates for user (if none exist)
router.post('/init-defaults', (req: Request, res: Response) => {
  const user = (req as any).user;
  const db = getDb();

  const existing = db.prepare(`
    SELECT COUNT(*) as cnt FROM approval_prompt_templates WHERE user_id = ?
  `).get(user.id) as any;

  if (existing.cnt > 0) {
    res.json({ message: 'Templates already exist' });
    return;
  }

  const templates = [
    { name: '标准助手', system: DEFAULT_SYSTEM_PROMPT, user: DEFAULT_USER_PROMPT },
    { name: '详细分析', system: '你是一个专业的写作分析师，提供详细和深入的反馈。', user: '请分析以下内容并提供详细建议：' },
    { name: '简洁快速', system: '你是一个简洁高效的写作助手，直接给出答案。', user: '快速处理以下请求：' },
  ];

  const results: any[] = [];
  for (const t of templates) {
    const id = uuid();
    db.prepare(`
      INSERT INTO approval_prompt_templates (id, user_id, name, system_prompt, user_prompt, version, is_default)
      VALUES (?, ?, ?, ?, ?, 1, 0)
    `).run(id, user.id, t.name, t.system, t.user);
    results.push(db.prepare('SELECT * FROM approval_prompt_templates WHERE id = ?').get(id));
  }

  // Set first one as default
  if (results.length > 0) {
    db.prepare(`UPDATE approval_prompt_templates SET is_default = 1 WHERE id = ?`).run(results[0].id);
  }

  res.json({ templates: results });
});

export default router;