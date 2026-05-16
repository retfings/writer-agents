import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { getDb } from '../db';
import { authMiddleware } from '../middleware/auth';
import { getAgentConfigs } from '../models';
import { generateBookIdea } from '../models/title-gen';
import { createApprovalRequest, waitForApproval } from './approvals';
import type { NovelGenre, ModelProvider } from '../types';

const router = Router();
router.use(authMiddleware);

// List all projects for user
router.get('/', (req: Request, res: Response) => {
  const user = (req as any).user;
  const db = getDb();
  const projects = db.prepare(
    'SELECT * FROM projects WHERE user_id = ? ORDER BY updated_at DESC'
  ).all(user.id) as any[];

  res.json({
    projects: projects.map(p => ({
      ...p,
      agentConfig: JSON.parse(p.agent_config || '[]'),
    })),
  });
});

// Create project
router.post('/', (req: Request, res: Response) => {
  const user = (req as any).user;
  const { title, genre, synopsis, targetWords, totalChapters, modelProvider } = req.body;

  if (!title) {
    res.status(400).json({ error: '项目标题不能为空' });
    return;
  }

  const db = getDb();
  const id = uuid();
  const provider: ModelProvider = modelProvider || 'deepseek';
  const agentConfig = getAgentConfigs(provider);

  const userSetting = db.prepare('SELECT approval_mode FROM users WHERE id = ?').get(user.id) as any;
  const defaultApprovalMode = userSetting?.approval_mode || 'auto';

  db.prepare(`
    INSERT INTO projects (id, user_id, title, genre, synopsis, target_words, total_chapters, agent_config, model_provider, approval_mode)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, user.id, title, genre || 'urban', synopsis || '', targetWords || 500000, totalChapters || 150, JSON.stringify(agentConfig), provider, defaultApprovalMode);

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as any;
  res.json({
    project: {
      ...project,
      agentConfig: JSON.parse(project.agent_config || '[]'),
    },
  });
});

// Get single project
router.get('/:id', (req: Request, res: Response) => {
  const user = (req as any).user;
  const db = getDb();
  const project = db.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?')
    .get(req.params.id, user.id) as any;

  if (!project) {
    res.status(404).json({ error: '项目不存在' });
    return;
  }

  res.json({
    project: {
      ...project,
      agentConfig: JSON.parse(project.agent_config || '[]'),
    },
  });
});

// Update project
router.put('/:id', (req: Request, res: Response) => {
  const user = (req as any).user;
  const { title, genre, synopsis, targetWords, status, approvalMode } = req.body;
  const db = getDb();

  const project = db.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?')
    .get(req.params.id, user.id) as any;
  if (!project) {
    res.status(404).json({ error: '项目不存在' });
    return;
  }

  db.prepare(`
    UPDATE projects SET
      title = COALESCE(?, title),
      genre = COALESCE(?, genre),
      synopsis = COALESCE(?, synopsis),
      target_words = COALESCE(?, target_words),
      status = COALESCE(?, status),
      approval_mode = COALESCE(?, approval_mode),
      updated_at = datetime('now')
    WHERE id = ?
  `).run(title, genre, synopsis, targetWords, status, approvalMode, req.params.id);

  const updated = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id) as any;
  res.json({
    project: {
      ...updated,
      agentConfig: JSON.parse(updated.agent_config || '[]'),
    },
  });
});

// Delete project
router.delete('/:id', (req: Request, res: Response) => {
  const user = (req as any).user;
  const db = getDb();
  const result = db.prepare('DELETE FROM projects WHERE id = ? AND user_id = ?')
    .run(req.params.id, user.id);
  res.json({ success: result.changes > 0 });
});

// AI generate book idea (title + synopsis)
router.post('/generate-idea', async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { prompt, projectId } = req.body;
  if (!prompt || prompt.trim().length < 3) {
    res.status(400).json({ error: '请输入故事创意（至少3个字）' });
    return;
  }

  let approvalMode = 'auto';
  let effectiveProjectId = projectId;

  if (projectId) {
    const db = getDb();
    const project = db.prepare('SELECT approval_mode FROM projects WHERE id = ? AND user_id = ?')
      .get(projectId, user.id) as any;
    if (project) {
      approvalMode = project.approval_mode || 'auto';
    }
  } else {
    const db = getDb();
    const userSetting = db.prepare('SELECT approval_mode FROM users WHERE id = ?').get(user.id) as any;
    approvalMode = userSetting?.approval_mode || 'auto';
  }

  console.log(`[GenerateIdea] approvalMode=${approvalMode}, projectId=${projectId}`);

  if (approvalMode === 'manual' && effectiveProjectId) {
    const systemPrompt = '你是番茄小说平台的资深内容策划，专门为商业网络小说起书名和写简介。';
    const userPrompt = `故事核心创意：${prompt}`;

    const requestId = createApprovalRequest({
      projectId: effectiveProjectId,
      userId: user.id,
      agentType: 'title-gen',
      systemPrompt,
      userPrompt,
    });

    console.log(`[GenerateIdea] Created approval request: ${requestId}, waiting...`);

    const result = await waitForApproval(requestId);
    console.log(`[GenerateIdea] Approval result: approved=${result.approved}`);

    if (!result.approved) {
      res.status(403).json({ error: '用户拒绝生成' });
      return;
    }

    if (result.llmResponse) {
      try {
        const idea = JSON.parse(result.llmResponse);
        res.json(idea);
        return;
      } catch {}
    }
  }

  try {
    const idea = await generateBookIdea(prompt);
    res.json(idea);
  } catch (err: any) {
    console.error('Generate idea error:', err);
    res.status(500).json({ error: err.message || 'AI 生成失败，请重试' });
  }
});

// AI generate rewrite suggestions for a chapter
router.post('/ai-rewrite-suggestions', async (req: Request, res: Response) => {
  try {
    const { title, content, genre } = req.body;
    if (!content || !content.trim()) {
      res.status(400).json({ error: '请提供章节内容' });
      return;
    }

    const { getAgentConfigs } = await import('../models');
    const configs = await getAgentConfigs();
    const editorConfig = configs.find(c => c.role === 'editor');
    if (!editorConfig) {
      res.status(500).json({ error: 'Editor agent config not found' });
      return;
    }
    const { EditorAgent } = await import('../agents/editor');
    const editor = new EditorAgent(editorConfig);

    const result = await editor.execute({
      content: content.slice(0, 5000),
      chapterNumber: 1,
      genre: genre || '都市',
      characters: [],
    });

    // Extract the logic issues and suggestions from the editor output
    const suggestions = `请根据以下编辑审校意见重写本章：【${title || ''}】

${result.content.slice(0, 2000)}`;

    res.json({ suggestions });
  } catch (err: any) {
    console.error('Generate rewrite suggestions error:', err);
    res.status(500).json({ error: err.message || '生成失败' });
  }
});

export default router;
