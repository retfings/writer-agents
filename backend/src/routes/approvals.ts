import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { getDb } from '../db';
import { authMiddleware } from '../middleware/auth';
import type { ApprovalStatus } from '../types';

const router = Router();
router.use(authMiddleware);

router.get('/project/:projectId/pending', (req: Request, res: Response) => {
  const user = (req as any).user;
  const db = getDb();

  const project = db.prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?')
    .get(req.params.projectId, user.id);
  if (!project) {
    res.status(404).json({ error: '项目不存在' });
    return;
  }

  const requests = db.prepare(
    'SELECT * FROM llm_approval_requests WHERE project_id = ? AND status = ? ORDER BY created_at DESC'
  ).all(req.params.projectId, 'pending') as any[];

  console.log(`[Approvals] GET /project/${req.params.projectId}/pending - found ${requests.length} requests`);

  const mapped = requests.map(r => ({
    id: r.id,
    projectId: r.project_id,
    userId: r.user_id,
    agentType: r.agent_type,
    systemPrompt: r.system_prompt,
    userPrompt: r.user_prompt,
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));

  if (mapped.length > 0) {
    console.log(`[Approvals] First request:`, {
      id: mapped[0].id,
      systemPromptLength: mapped[0].systemPrompt?.length,
      userPromptLength: mapped[0].userPrompt?.length,
    });
  }

  res.json({
    requests: mapped,
  });
});

router.get('/:id', (req: Request, res: Response) => {
  const user = (req as any).user;
  const db = getDb();

  const request = db.prepare(`
    SELECT r.* FROM llm_approval_requests r
    JOIN projects p ON r.project_id = p.id
    WHERE r.id = ? AND p.user_id = ?
  `).get(req.params.id, user.id) as any;

  if (!request) {
    res.status(404).json({ error: '审批请求不存在' });
    return;
  }

  res.json({
    request: {
      id: request.id,
      projectId: request.project_id,
      userId: request.user_id,
      agentType: request.agent_type,
      systemPrompt: request.system_prompt,
      userPrompt: request.user_prompt,
      status: request.status,
      llmResponse: request.llm_response,
      createdAt: request.created_at,
      updatedAt: request.updated_at,
    },
  });
});

router.post('/:id/approve', async (req: Request, res: Response) => {
  const user = (req as any).user;
  const db = getDb();
  const { systemPrompt, userPrompt } = req.body || {};

  const request = db.prepare(`
    SELECT r.* FROM llm_approval_requests r
    JOIN projects p ON r.project_id = p.id
    WHERE r.id = ? AND p.user_id = ?
  `).get(req.params.id, user.id) as any;

  if (!request) {
    res.status(404).json({ error: '审批请求不存在' });
    return;
  }

  if (request.status !== 'pending') {
    res.status(400).json({ error: '该请求已处理' });
    return;
  }

  const updates: string[] = ["status = 'approved', updated_at = datetime('now')"];
  const params: any[] = [];

  if (typeof systemPrompt === 'string' && systemPrompt.trim()) {
    updates.push('system_prompt = ?');
    params.push(systemPrompt);
  }
  if (typeof userPrompt === 'string' && userPrompt.trim()) {
    updates.push('user_prompt = ?');
    params.push(userPrompt);
  }

  params.push(req.params.id);
  db.prepare(`UPDATE llm_approval_requests SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  const updated = db.prepare('SELECT system_prompt, user_prompt FROM llm_approval_requests WHERE id = ?').get(req.params.id) as any;
  res.json({ success: true, systemPrompt: updated?.system_prompt, userPrompt: updated?.user_prompt });
});

router.post('/:id/reject', (req: Request, res: Response) => {
  const user = (req as any).user;
  const db = getDb();

  const request = db.prepare(`
    SELECT r.* FROM llm_approval_requests r
    JOIN projects p ON r.project_id = p.id
    WHERE r.id = ? AND p.user_id = ?
  `).get(req.params.id, user.id) as any;

  if (!request) {
    res.status(404).json({ error: '审批请求不存在' });
    return;
  }

  if (request.status !== 'pending') {
    res.status(400).json({ error: '该请求已处理' });
    return;
  }

  db.prepare(`
    UPDATE llm_approval_requests
    SET status = 'rejected', updated_at = datetime('now')
    WHERE id = ?
  `).run(req.params.id);

  res.json({ success: true });
});

export function createApprovalRequest(params: {
  projectId: string;
  userId: string;
  agentType: string;
  systemPrompt: string;
  userPrompt: string;
}): string {
  const db = getDb();
  const id = uuid();

  let effectiveSystemPrompt = params.systemPrompt;
  let effectiveUserPrompt = params.userPrompt;

  // Check if project has a custom prompt template
  const project = db.prepare('SELECT prompt_template_id FROM projects WHERE id = ?').get(params.projectId) as any;
  if (project?.prompt_template_id) {
    const template = db.prepare('SELECT * FROM approval_prompt_templates WHERE id = ?').get(project.prompt_template_id) as any;
    if (template) {
      effectiveSystemPrompt = template.system_prompt;
      effectiveUserPrompt = template.user_prompt;
      console.log(`[createApprovalRequest] Using template: ${template.name}`);
    }
  }

  console.log(`[createApprovalRequest] Creating request:`, {
    id,
    projectId: params.projectId,
    agentType: params.agentType,
    systemPromptLength: effectiveSystemPrompt.length,
    userPromptLength: effectiveUserPrompt.length,
  });
  db.prepare(`
    INSERT INTO llm_approval_requests (id, project_id, user_id, agent_type, system_prompt, user_prompt, status)
    VALUES (?, ?, ?, ?, ?, ?, 'pending')
  `).run(id, params.projectId, params.userId, params.agentType, effectiveSystemPrompt, effectiveUserPrompt);
  return id;
}

export function waitForApproval(requestId: string): Promise<{ approved: boolean; llmResponse?: string; systemPrompt?: string; userPrompt?: string }> {
  return new Promise((resolve) => {
    const poll = () => {
      const db = getDb();
      const request = db.prepare('SELECT status, llm_response, system_prompt, user_prompt FROM llm_approval_requests WHERE id = ?').get(requestId) as any;
      if (!request) {
        resolve({ approved: false });
        return;
      }
      if (request.status === 'approved') {
        resolve({ approved: true, llmResponse: request.llm_response, systemPrompt: request.system_prompt, userPrompt: request.user_prompt });
        return;
      }
      if (request.status === 'rejected') {
        resolve({ approved: false });
        return;
      }
      setTimeout(poll, 1000);
    };
    poll();
  });
}

export function updateApprovalResponse(requestId: string, llmResponse: string): void {
  const db = getDb();
  db.prepare(`
    UPDATE llm_approval_requests
    SET llm_response = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(llmResponse, requestId);
}

// Debug endpoint - list all approval requests for a project (including non-pending)
router.get('/project/:projectId/debug', (req: Request, res: Response) => {
  const user = (req as any).user;
  const db = getDb();

  const project = db.prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?')
    .get(req.params.projectId, user.id);
  if (!project) {
    res.status(404).json({ error: '项目不存在' });
    return;
  }

  const requests = db.prepare(
    'SELECT * FROM llm_approval_requests WHERE project_id = ? ORDER BY created_at DESC LIMIT 10'
  ).all(req.params.projectId) as any[];

  res.json({
    debug: true,
    projectId: req.params.projectId,
    totalRequests: requests.length,
    requests: requests.map(r => ({
      id: r.id,
      projectId: r.project_id,
      userId: r.user_id,
      agentType: r.agent_type,
      systemPrompt: r.system_prompt?.slice(0, 100) + '...',
      userPrompt: r.user_prompt?.slice(0, 100) + '...',
      status: r.status,
      createdAt: r.created_at,
    })),
  });
});

export default router;