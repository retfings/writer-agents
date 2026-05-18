import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { chat as chatApi, projects, chapters } from '../../api';

interface Props {
  projectId: string | null;
  chapterId?: string | null;
  chapterTitle?: string;
  onProjectCreated?: (projectId: string) => void;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  isStreaming?: boolean;
  type?: 'text' | 'projects';
  projects?: ProjectItem[];
}

interface ProjectItem {
  id: string;
  title: string;
  genre: string;
}

interface HistoryMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface CreateProjectData {
  title: string;
  genre: string;
  synopsis: string;
  targetWords: number;
  totalChapters: number;
}

const quickCommands = [
  { label: '续写本章', prompt: '请续写当前章节的下一段内容' },
  { label: '润色这段', prompt: '请润色当前章节，提升文笔和节奏感' },
  { label: '动机分析', prompt: '请分析当前章节中主要角色的行为动机是否合理' },
  { label: '情节建议', prompt: '请根据当前情节发展，给出3个后续可能的走向建议' },
  { label: '逻辑检查', prompt: '请检查当前章节是否存在逻辑漏洞或前后矛盾' },
  { label: '对话优化', prompt: '请优化当前章节中的对话，使其更自然生动' },
];

const slashCommands = [
  { cmd: '/new', desc: '新建项目', requiresProject: false, requiresChapter: false },
  { cmd: '/outline', desc: 'AI 生成大纲', requiresProject: true, requiresChapter: false },
  { cmd: '/write', desc: 'AI 写作当前章节', requiresProject: true, requiresChapter: true },
  { cmd: '/rewrite', desc: '重写当前章节', requiresProject: true, requiresChapter: true },
  { cmd: '/projects', desc: '查看所有项目', requiresProject: false, requiresChapter: false },
  { cmd: '/help', desc: '显示帮助', requiresProject: false, requiresChapter: false },
];

export default function AIAssistant({ projectId, chapterId, chapterTitle, onProjectCreated }: Props) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [promptText, setPromptText] = useState('');
  const [promptLoading, setPromptLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRewriteModal, setShowRewriteModal] = useState(false);
  const [rewriteInstructions, setRewriteInstructions] = useState('');
  const [rewriteLoading, setRewriteLoading] = useState(false);
  const [projectList, setProjectList] = useState<ProjectItem[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const readerRef = useRef<ReadableStreamDefaultReader | null>(null);
  const stoppingRef = useRef(false);

  const loadProjectList = async () => {
    try {
      const { projects: list } = await projects.list();
      setProjectList(list);
    } catch { /* ignore */ }
  };

  const loadPrompt = async () => {
    if (!projectId) return;
    try {
      const res = await chatApi.getPrompt(projectId);
      if (res.success && res.data) {
        setPromptText(res.data.systemPrompt);
      }
    } catch { /* ignore */ }
  };

  useEffect(() => {
    if (showPromptEditor) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadPrompt();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPromptEditor]);

  useEffect(() => {
    if (!projectId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadProjectList();
    }
  }, [projectId]);

  const savePrompt = async () => {
    if (!projectId) return;
    setPromptLoading(true);
    try {
      await chatApi.updatePrompt(projectId, promptText);
      setShowPromptEditor(false);
    } catch { /* ignore */ } finally {
      setPromptLoading(false);
    }
  };

  const resetPrompt = async () => {
    if (!projectId || !confirm('确定重置为默认提示词？')) return;
    setPromptLoading(true);
    try {
      await chatApi.resetPrompt(projectId);
      await loadPrompt();
    } catch { /* ignore */ } finally {
      setPromptLoading(false);
    }
  };

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    if (isNearBottom || messages.length <= 2) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages]);

  const loadHistory = async () => {
    if (!projectId) return;
    try {
      const { messages: hist } = await chatApi.history(projectId);
      setMessages(hist.map((m: HistoryMessage) => ({
        id: m.id,
        role: m.role,
        content: m.content,
      })));
    } catch { /* ignore */ }
  };

  const handleSlashCommand = async (cmd: string) => {
    const cmdLower = cmd.toLowerCase().trim();

    if (cmdLower === '/new') {
      if (!projectId) {
        setShowCreateModal(true);
        return;
      }
      addAssistantMessage('📝 项目创建已打开，请在下方表单中填写项目信息。');
      setShowCreateModal(true);
      return;
    }

    if (cmdLower === '/projects') {
      await loadProjectList();
      if (projectList.length === 0) {
        addAssistantMessage('📚 还没有项目。使用 `/new` 创建一个新项目吧！');
      } else {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: '📚 **你的项目：** 点击卡片打开项目',
          type: 'projects',
          projects: projectList,
        }]);
      }
      return;
    }

    if (cmdLower === '/help') {
      const helpText = `🤖 **AI 写作助手 命令列表：**

| 命令 | 描述 |
|------|------|
| \`/new\` | 新建项目 |
| \`/outline\` | AI 生成大纲 |
| \`/write\` | AI 写作当前章节 |
| \`/rewrite [要求]\` | 重写当前章节 |
| \`/projects\` | 查看所有项目 |
| \`/help\` | 显示帮助 |

**快捷命令：**
${quickCommands.map(c => `• ${c.label}`).join('\n')}

直接输入你的问题，我会尽力帮助你！`;
      addAssistantMessage(helpText);
      return;
    }

    if (cmdLower === '/outline') {
      if (!projectId) {
        addAssistantMessage('⚠️ 请先打开一个项目，再使用 `/outline` 生成大纲。');
        return;
      }
      addAssistantMessage('🤖 正在生成大纲，请稍候...');
      try {
        await chapters.generateOutline(projectId);
        addAssistantMessage('✅ 大纲生成完成！请在左侧目录树中查看生成的章节。');
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : '未知错误';
        addAssistantMessage(`❌ 生成失败：${message}`);
      }
      return;
    }

    if (cmdLower === '/write') {
      if (!projectId) {
        addAssistantMessage('⚠️ 请先打开一个项目，再使用 `/write` 开始写作。');
        return;
      }
      if (!chapterId) {
        addAssistantMessage('⚠️ 请先选择一个章节，再使用 `/write` 开始写作。');
        return;
      }
      addAssistantMessage('✍️ 正在开始 AI 写作，请稍候...');
      try {
        const { chapters: chs } = await chapters.list(projectId);
        const chapter = chs.find((c) => c.id === chapterId);
        if (!chapter) throw new Error('章节未找到');
        await chapters.write(projectId, chapter.number);
        addAssistantMessage('✅ 章节写作完成！请在阅读区查看生成的内容。');
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : '未知错误';
        addAssistantMessage(`❌ 写作失败：${message}`);
      }
      return;
    }

    if (cmdLower.startsWith('/rewrite')) {
      if (!projectId) {
        addAssistantMessage('⚠️ 请先打开一个项目，再使用 `/rewrite` 重写章节。');
        return;
      }
      if (!chapterId) {
        addAssistantMessage('⚠️ 请先选择一个章节，再使用 `/rewrite` 重写。');
        return;
      }
      const instructions = cmd.slice('/rewrite'.length).trim();
      if (instructions) {
        setRewriteInstructions(instructions);
      }
      setShowRewriteModal(true);
      addAssistantMessage('🔄 重写功能已打开，请在弹出的窗口中输入重写要求。');
      return;
    }

    addAssistantMessage(`❓ 未知命令：${cmd}\n输入 \`/help\` 查看所有可用命令。`);
  };

  const addAssistantMessage = (content: string) => {
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'assistant',
      content,
      isStreaming: false,
    }]);
  };

  const handleSend = async (text: string) => {
    if (!text.trim() || loading) return;

    if (text.startsWith('/')) {
      // eslint-disable-next-line react-hooks/purity
      const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text };
      setMessages(prev => [...prev, userMsg]);
      setInput('');
      await handleSlashCommand(text);
      return;
    }

    if (!projectId) {
      addAssistantMessage('⚠️ 请先创建一个项目或打开一个项目。输入 `/help` 查看可用命令。');
      return;
    }

    // eslint-disable-next-line react-hooks/purity
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    stoppingRef.current = false;

    const assistantMsg: Message = {
      // eslint-disable-next-line react-hooks/purity
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      isStreaming: true,
    };
    setMessages(prev => [...prev, assistantMsg]);

    try {
      const resp = await chatApi.send(projectId, text, chapterId || undefined);
      if (!resp.ok) throw new Error('请求失败');
      const reader = resp.body?.getReader();
      if (!reader) throw new Error('No reader');
      readerRef.current = reader;

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        if (stoppingRef.current) {
          reader.cancel();
          break;
        }
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                setMessages(prev => prev.map(m =>
                  m.id === assistantMsg.id ? { ...m, content: m.content + data.content } : m
                ));
              }
              if (data.done) {
                setMessages(prev => prev.map(m =>
                  m.id === assistantMsg.id ? { ...m, isStreaming: false } : m
                ));
              }
            } catch { /* ignore parse errors */ }
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && (err.name === 'AbortError' || stoppingRef.current)) {
        setMessages(prev => prev.map(m =>
          m.id === assistantMsg.id
            ? { ...m, content: m.content + (stoppingRef.current ? '\n\n[已停止]' : ''), isStreaming: false }
            : m
        ));
      } else {
        const message = err instanceof Error ? err.message : '未知错误';
        setMessages(prev => prev.map(m =>
          m.id === assistantMsg.id
            ? { ...m, content: '❌ 对话失败: ' + message, isStreaming: false }
            : m
        ));
      }
    } finally {
      setLoading(false);
      readerRef.current = null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(input);
    }
  };

  const handleStop = () => {
    stoppingRef.current = true;
  };

  const handleRewrite = async () => {
    if (!chapterId || !rewriteInstructions.trim()) return;
    setRewriteLoading(true);
    setShowRewriteModal(false);
    try {
      await chapters.rewrite(chapterId, rewriteInstructions);
      addAssistantMessage('✅ 章节重写完成！请在阅读区查看新内容。');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '未知错误';
      addAssistantMessage(`❌ 重写失败：${message}`);
    } finally {
      setRewriteLoading(false);
      setRewriteInstructions('');
    }
  };

  const handleCreateProject = async (data: { title: string; genre: string; synopsis: string; targetWords: number; totalChapters: number }) => {
    try {
      const { project } = await projects.create(data);
      setShowCreateModal(false);
      if (onProjectCreated) {
        onProjectCreated(project.id);
      } else {
        navigate(`/project/${project.id}`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '未知错误';
      addAssistantMessage(`❌ 创建项目失败：${message}`);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100">
        <h3 className="font-semibold text-gray-800 text-base">🤖 AI 写作助手</h3>
        <div className="flex gap-1">
          {projectId && (
            <button
              onClick={() => setShowPromptEditor(true)}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              提示词
            </button>
          )}
          {messages.length === 0 && (
            <button
              onClick={() => {
                if (showHistory) {
                  setShowHistory(false);
                } else {
                  loadHistory();
                  setShowHistory(true);
                }
              }}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              {showHistory ? '隐藏' : '历史'}
            </button>
          )}
          {messages.length > 0 && projectId && (
            <button
              onClick={async () => {
                if (confirm('清除对话历史？')) {
                  await chatApi.clearHistory(projectId);
                  setMessages([]);
                }
              }}
              className="text-xs text-gray-400 hover:text-red-500"
            >
              清除
            </button>
          )}
        </div>
      </div>

      {chapterTitle && (
        <div className="px-3 py-1.5 bg-orange-50 border-b border-orange-100 text-xs text-orange-600">
          📖 当前上下文：{chapterTitle}
        </div>
      )}

      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <p className="text-4xl mb-2">💬</p>
            <p className="text-sm text-gray-400 mb-3">
              {projectId ? '向 AI 助手提问关于写作的任何问题' : '输入 /help 查看可用命令，或 /new 创建新项目'}
            </p>
            <div className="flex flex-wrap gap-1 justify-center">
              {slashCommands.map((cmd, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(cmd.cmd)}
                  disabled={cmd.requiresProject && !projectId || cmd.requiresChapter && !chapterId}
                  className="text-xs bg-gray-50 hover:bg-orange-50 text-gray-600 hover:text-orange-600 px-2.5 py-1.5 rounded-lg border border-gray-100 transition disabled:opacity-40"
                >
                  {cmd.cmd}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.type === 'projects' && msg.projects ? (
              <div className="max-w-[90%] bg-gray-100 rounded-lg rounded-bl-sm p-2.5">
                <p className="text-sm text-gray-700 mb-2">{msg.content}</p>
                <div className="grid grid-cols-1 gap-1.5">
                  {msg.projects.map(p => {
                    const genreNames: Record<string, string> = {
                      urban: '都市', fantasy: '玄幻', xianxia: '仙侠', scifi: '科幻',
                      historical: '历史', romance: '言情', suspense: '悬疑',
                    };
                    return (
                      <div
                        key={p.id}
                        onClick={() => navigate(`/project/${p.id}`)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-gray-100 hover:border-orange-200 hover:bg-orange-50 cursor-pointer transition active:scale-[0.99]"
                      >
                        <span className="text-lg shrink-0">📖</span>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-gray-800 truncate">{p.title}</div>
                          <div className="text-[11px] text-gray-400">{genreNames[p.genre] || p.genre}</div>
                        </div>
                        <span className="text-xs text-orange-500 shrink-0">打开 →</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div
                className={`max-w-[90%] px-3 py-1.5 rounded-lg text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-orange-500 text-white rounded-br-sm'
                    : msg.role === 'system'
                    ? 'bg-gray-100 text-gray-500 italic text-xs'
                    : 'bg-gray-100 text-gray-700 rounded-bl-sm'
                }`}
              >
                {msg.content}
                {msg.isStreaming && (
                  <span className="inline-block w-1.5 h-4 bg-orange-400 ml-0.5 align-text-bottom animate-blink" />
                )}
                {!msg.isStreaming && !msg.content && !loading && (
                  <span className="inline-flex gap-0.5">
                    <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-2.5 border-t border-gray-100 bg-gray-50/50">
        {projectId && (
          <div className="flex flex-wrap gap-1 mb-2">
            {quickCommands.map((cmd, i) => (
              <button
                key={i}
                onClick={() => handleSend(cmd.prompt)}
                disabled={loading || !chapterId}
                className="text-xs text-gray-500 hover:text-orange-500 hover:bg-orange-50 px-2 py-1 rounded-md border border-gray-100 bg-white transition disabled:opacity-50"
              >
                {cmd.label}
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-1.5">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={projectId ? (chapterTitle ? `问关于「${chapterTitle}」的问题...` : '输入消息或 /命令...') : '输入 /命令...'}
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none outline-none focus:border-orange-300 disabled:opacity-50"
            rows={2}
            disabled={loading}
          />
          {loading ? (
            <button
              onClick={handleStop}
              className="bg-red-500 text-white px-4 rounded-lg text-sm font-medium hover:bg-red-600 self-end h-9 shrink-0"
            >
              停止
            </button>
          ) : (
            <button
              onClick={() => handleSend(input)}
              disabled={loading || !input.trim()}
              className="bg-orange-500 text-white px-4 rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50 self-end h-9 shrink-0"
            >
              发送
            </button>
          )}
        </div>
      </div>

      {showCreateModal && (
        <CreateProjectModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateProject}
        />
      )}

      {showRewriteModal && (
        <RewriteModal
          instructions={rewriteInstructions}
          loading={rewriteLoading}
          onChange={setRewriteInstructions}
          onSubmit={handleRewrite}
          onClose={() => { setShowRewriteModal(false); setRewriteInstructions(''); }}
        />
      )}

      {showPromptEditor && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h4 className="font-semibold text-gray-800">编辑提示词</h4>
              <button onClick={() => setShowPromptEditor(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <textarea
                value={promptText}
                onChange={e => setPromptText(e.target.value)}
                className="w-full h-64 p-3 border border-gray-200 rounded-lg text-sm resize-none focus:border-orange-300 focus:ring-1 focus:ring-orange-200 outline-none font-mono"
                placeholder="输入系统提示词..."
              />
              <p className="text-xs text-gray-400 mt-2">可用变量：{'{title}'} 书名、{'{genre}'} 类型、{'{synopsis}'} 简介、{'{targetWords}'} 目标字数、{'{chapterCount}'} 章节数、{'{characters}'} 角色、{'{foreshadowing}'} 伏笔、{'{currentChapter}'} 当前章节</p>
            </div>
            <div className="flex justify-between px-4 py-3 border-t border-gray-100 gap-2">
              <button
                onClick={resetPrompt}
                disabled={promptLoading}
                className="px-3 py-1.5 text-xs text-gray-500 hover:text-red-500 border border-gray-200 rounded-lg"
              >
                重置默认
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowPromptEditor(false)}
                  className="px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg"
                >
                  取消
                </button>
                <button
                  onClick={savePrompt}
                  disabled={promptLoading}
                  className="px-3 py-1.5 text-xs bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CreateProjectModal({ onClose, onCreate }: { onClose: () => void; onCreate: (data: CreateProjectData) => void }) {
  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState('urban');
  const [synopsis, setSynopsis] = useState('');
  const [targetWords, setTargetWords] = useState(100000);
  const [totalChapters, setTotalChapters] = useState(50);

  const genreNames: Record<string, string> = {
    urban: '都市', fantasy: '玄幻', xianxia: '仙侠', scifi: '科幻',
    historical: '历史', romance: '言情', suspense: '悬疑',
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onCreate({ title, genre, synopsis, targetWords, totalChapters });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h4 className="font-semibold text-gray-800">📝 新建项目</h4>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">书名</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-orange-500 text-sm"
              placeholder="输入书名"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">分类</label>
            <select
              value={genre}
              onChange={e => setGenre(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none text-sm bg-white"
            >
              {Object.entries(genreNames).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">简介</label>
            <textarea
              value={synopsis}
              onChange={e => setSynopsis(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-orange-500 text-sm resize-none"
              rows={3}
              placeholder="一句话简介（番茄风格）"
            />
          </div>
          <div className="bg-gray-50 rounded-lg p-3 space-y-3">
            <p className="text-xs text-gray-500 font-medium">⚙️ 生成配置</p>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">目标总字数</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={targetWords / 10000}
                    onChange={e => { const v = Number(e.target.value); if (v > 0) setTargetWords(v * 10000); }}
                    className="w-16 px-2 py-1.5 border border-gray-300 rounded-lg outline-none text-sm text-center"
                    min={1} max={1000}
                  />
                  <span className="text-sm text-gray-400">万字</span>
                </div>
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">章节数</label>
                <select
                  value={totalChapters}
                  onChange={e => setTotalChapters(Number(e.target.value))}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded-lg outline-none text-sm bg-white"
                >
                  {[50, 100, 150, 200, 250, 300, 400, 500, 600, 800, 1000].map(n => (
                    <option key={n} value={n}>{n} 章</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="flex-1 bg-orange-500 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-orange-600 min-h-[40px]"
            >
              创建项目
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-gray-500 rounded-lg text-sm hover:bg-gray-100 min-h-[40px]"
            >
              取消
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface RewriteModalProps {
  instructions: string;
  loading: boolean;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}

function RewriteModal({ instructions, loading, onChange, onSubmit, onClose }: RewriteModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-5" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-bold mb-1">🔄 重写本章</h3>
        <p className="text-xs text-gray-500 mb-4">
          输入重写要求，AI 将根据你的要求重新生成章节内容。
        </p>
        <textarea
          value={instructions}
          onChange={e => onChange(e.target.value)}
          placeholder={`输入重写要求，例如：
- 加强主角的心理描写
- 增加一段追车戏
- 对话更自然一些
- 去掉脏话和暴力描写`}
          className="w-full px-3 py-2.5 border rounded-lg text-sm resize-none mb-3"
          rows={6}
          disabled={loading}
        />
        <div className="flex gap-2 flex-wrap justify-end">
          <button
            onClick={onClose}
            disabled={loading}
            className="text-gray-500 px-3 py-2 rounded-lg text-xs"
          >
            取消
          </button>
          <button
            onClick={onSubmit}
            disabled={loading || !instructions.trim()}
            className="bg-purple-500 text-white px-4 py-2 rounded-lg text-xs font-medium hover:bg-purple-600 disabled:opacity-50"
          >
            {loading ? '重写中...' : '确认重写'}
          </button>
        </div>
      </div>
    </div>
  );
}