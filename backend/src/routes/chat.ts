import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../logger';

const router = Router();
router.use(authMiddleware as any);

// Get chat history
router.get('/project/:projectId/history', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const messages = db.prepare(
      'SELECT id, role, content, context, token_usage, created_at FROM chat_messages WHERE project_id = ? ORDER BY created_at ASC'
    ).all(req.params.projectId);
    res.json({ messages });
  } catch (err: any) {
    logger.error('Get chat history error:', err.message);
    res.status(500).json({ error: '获取对话历史失败' });
  }
});

// Clear chat history
router.delete('/project/:projectId/history', (req: Request, res: Response) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM chat_messages WHERE project_id = ?').run(req.params.projectId);
    res.json({ success: true });
  } catch (err: any) {
    logger.error('Clear chat history error:', err.message);
    res.status(500).json({ error: '清除对话历史失败' });
  }
});

// AI Chat (SSE streaming)
router.post('/project/:projectId/chat', async (req: Request, res: Response) => {
  const { projectId } = req.params;
  const { message, chapterId } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ error: '消息不能为空' });
  }

  try {
    const db = getDb();

    // Gather context
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as any;
    if (!project) return res.status(404).json({ error: '项目不存在' });

    const chapters = db.prepare(
      'SELECT number, title, outline, content, status, word_count FROM chapters WHERE project_id = ? ORDER BY number'
    ).all(projectId);

    const characters = db.prepare(
      'SELECT name, role, description, traits FROM characters WHERE project_id = ?'
    ).all(projectId);

    const foreshadowing = db.prepare(
      'SELECT title, description, status FROM foreshadowing WHERE project_id = ?'
    ).all(projectId);

    // Build context for the current chapter
    let currentChapter: any = null;
    if (chapterId) {
      currentChapter = db.prepare('SELECT * FROM chapters WHERE id = ?').get(chapterId);
    }

    // Get recent chat history (last 20 messages)
    const history = db.prepare(
      'SELECT role, content FROM chat_messages WHERE project_id = ? ORDER BY created_at DESC LIMIT 20'
    ).all(projectId).reverse();

    // Save user message
    const userMsgId = uuidv4();
    const contextJson = JSON.stringify({
      chapterId: chapterId || null,
      chapterTitle: currentChapter?.title || null,
      chapterNumber: currentChapter?.number || null,
    });
    db.prepare(
      'INSERT INTO chat_messages (id, project_id, role, content, context) VALUES (?, ?, ?, ?, ?)'
    ).run(userMsgId, projectId, 'user', message, contextJson);

    // Build system prompt
    const systemPrompt = `你是 NovelFlow 的 AI 写作助手，帮助作者创作小说。

项目信息：
- 书名：${project.title}
- 类型：${project.genre}
- 简介：${project.synopsis || '无'}
- 目标字数：${(project.target_words || 0).toLocaleString()} 字
- 章节数：${chapters.length}

主要角色：
${characters.map((c: any) => {
  const traits = JSON.parse(c.traits || '[]');
  return `- ${c.name}（${c.role || '未知身份'}）：${c.description || '无描述'}，性格：${traits.join('、') || '无'}`;
}).join('\n')}

${foreshadowing.length > 0 ? `伏笔线索：\n${foreshadowing.map((f: any) => `- ${f.title}：[${f.status === 'revealed' ? '已揭' : '未揭'}] ${f.description}`).join('\n')}\n` : ''}

${currentChapter ? `当前章节：第${currentChapter.number}章 ${currentChapter.title}
概要：${currentChapter.outline || '无'}
正文（前2000字）：${(currentChapter.content || '').slice(0, 2000)}` : ''}

你的职责：
1. 帮助作者构思情节、完善设定
2. 分析角色动机和行为合理性
3. 提供写作建议和润色意见
4. 检查逻辑漏洞和前后矛盾
5. 解答关于角色、情节、世界观的任何问题
6. 根据当前章节内容给出具体建议

请用中文回答，风格简洁专业，像一位经验丰富的编辑。`;

    // Build messages array
    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: systemPrompt },
    ];
    for (const h of history as any[]) {
      messages.push({ role: h.role, content: h.content });
    }
    messages.push({ role: 'user', content: message });

    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
    res.flushHeaders();

    const abortController = new AbortController();
    const stopFlag = { stopped: false };

    req.on('close', () => {
      if (!stopFlag.stopped) {
        stopFlag.stopped = true;
        abortController.abort();
      }
    });

    const { default: OpenAI } = await import('openai');
    const client = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY || '',
      baseURL: 'https://api.deepseek.com/v1',
    });

    let fullContent = '';
    let inputTokens = 0;
    let outputTokens = 0;

    try {
      const stream = await client.chat.completions.create({
        model: 'deepseek-chat',
        messages: messages as any,
        temperature: 0.7,
        max_tokens: 4096,
        stream: true,
      }, {
        signal: abortController.signal,
      });

      for await (const chunk of stream) {
        if (stopFlag.stopped) break;
        const delta = chunk.choices?.[0]?.delta?.content;
        if (delta) {
          fullContent += delta;
          res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
        }
        if (chunk.usage) {
          inputTokens = chunk.usage.prompt_tokens || 0;
          outputTokens = chunk.usage.completion_tokens || 0;
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError' || stopFlag.stopped) {
        stopFlag.stopped = true;
      } else {
        throw err;
      }
    }

    // Save assistant message
    const assistantMsgId = uuidv4();
    db.prepare(
      'INSERT INTO chat_messages (id, project_id, role, content, context, token_usage) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(
      assistantMsgId,
      projectId,
      'assistant',
      fullContent,
      contextJson,
      JSON.stringify({ inputTokens, outputTokens })
    );

    res.write(`data: ${JSON.stringify({ done: true, messageId: assistantMsgId, tokenUsage: { inputTokens, outputTokens } })}\n\n`);
    res.end();

  } catch (err: any) {
    logger.error('Chat error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'AI 对话失败: ' + err.message });
    } else {
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    }
  }
});

export default router;
