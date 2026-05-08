import { Router, Request, Response } from 'express';
import { getDb } from '../db';
import { authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

// Export project as TXT
router.get('/project/:projectId/txt', (req: Request, res: Response) => {
  const user = (req as any).user;
  const db = getDb();

  const project = db.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?')
    .get(req.params.projectId, user.id) as any;
  if (!project) {
    res.status(404).json({ error: '项目不存在' });
    return;
  }

  const chapters = db.prepare(
    'SELECT * FROM chapters WHERE project_id = ? AND status != "outline" ORDER BY number ASC'
  ).all(req.params.projectId) as any[];

  let txt = `${project.title}\n\n`;
  txt += `简介：${project.synopsis}\n`;
  txt += `${'='.repeat(50)}\n\n`;

  for (const ch of chapters) {
    txt += `${ch.title}\n\n`;
    txt += ch.content || '(暂无内容)\n';
    txt += `\n${'='.repeat(50)}\n\n`;
  }

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(project.title)}.txt"`);
  res.send(txt);
});

// Export project as HTML
router.get('/project/:projectId/html', (req: Request, res: Response) => {
  const user = (req as any).user;
  const db = getDb();

  const project = db.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?')
    .get(req.params.projectId, user.id) as any;
  if (!project) {
    res.status(404).json({ error: '项目不存在' });
    return;
  }

  const chapters = db.prepare(
    'SELECT * FROM chapters WHERE project_id = ? AND status != "outline" ORDER BY number ASC'
  ).all(req.params.projectId) as any[];

  let html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(project.title)}</title>
  <style>
    body { font-family: 'Noto Serif SC', 'Source Han Serif SC', serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.8; }
    h1 { text-align: center; }
    h2 { border-bottom: 1px solid #ccc; padding-bottom: 10px; }
    p { text-indent: 2em; margin: 15px 0; }
  </style>
</head>
<body>
  <h1>${escapeHtml(project.title)}</h1>
  <p style="text-indent:0;color:#666">${escapeHtml(project.synopsis)}</p>`;

  for (const ch of chapters) {
    html += `<h2>${escapeHtml(ch.title)}</h2>`;
    const paragraphs = (ch.content || '').split('\n').filter((l: string) => l.trim());
    for (const p of paragraphs) {
      html += `<p>${escapeHtml(p.trim())}</p>`;
    }
  }

  html += '</body></html>';

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(project.title)}.html"`);
  res.send(html);
});

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export default router;
