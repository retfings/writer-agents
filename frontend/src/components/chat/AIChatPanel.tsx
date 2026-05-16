import { useState, useRef, useEffect } from 'react';
import { chat as chatApi } from '../../api';
import { useViewport } from '../mobile/useViewport';

interface Props {
  projectId: string;
  chapterId: string | null;
  chapterTitle?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  isStreaming?: boolean;
}

const quickCommands = [
  { label: '续写本章', prompt: '请续写当前章节的下一段内容' },
  { label: '润色这段', prompt: '请润色当前章节，提升文笔和节奏感' },
  { label: '动机分析', prompt: '请分析当前章节中主要角色的行为动机是否合理' },
  { label: '情节建议', prompt: '请根据当前情节发展，给出3个后续可能的走向建议' },
  { label: '逻辑检查', prompt: '请检查当前章节是否存在逻辑漏洞或前后矛盾' },
  { label: '对话优化', prompt: '请优化当前章节中的对话，使其更自然生动' },
];

export default function AIChatPanel({ projectId, chapterId, chapterTitle }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [promptText, setPromptText] = useState('');
  const [promptLoading, setPromptLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const readerRef = useRef<ReadableStreamDefaultReader | null>(null);
  const stoppingRef = useRef(false);
  const { isMobile } = useViewport();

  useEffect(() => {
    if (showPromptEditor) {
      loadPrompt();
    }
  }, [showPromptEditor]);

  const loadPrompt = async () => {
    try {
      const res = await chatApi.getPrompt(projectId);
      if (res.success && res.data) {
        setPromptText(res.data.systemPrompt);
      }
    } catch {}
  };

  const savePrompt = async () => {
    setPromptLoading(true);
    try {
      await chatApi.updatePrompt(projectId, promptText);
      setShowPromptEditor(false);
    } catch {} finally {
      setPromptLoading(false);
    }
  };

  const resetPrompt = async () => {
    if (!confirm('确定重置为默认提示词？')) return;
    setPromptLoading(true);
    try {
      await chatApi.resetPrompt(projectId);
      await loadPrompt();
    } catch {} finally {
      setPromptLoading(false);
    }
  };

  // Auto-scroll to bottom when messages update, but only if user is near bottom
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    if (isNearBottom || messages.length <= 2) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages]);

  const loadHistory = async () => {
    try {
      const { messages: hist } = await chatApi.history(projectId);
      setMessages(hist.map((m: any) => ({
        id: m.id,
        role: m.role,
        content: m.content,
      })));
    } catch {}
  };

  const handleSend = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    stoppingRef.current = false;

    const assistantMsg: Message = {
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
                  m.id === assistantMsg.id
                    ? { ...m, content: m.content + data.content }
                    : m
                ));
              }
              if (data.done) {
                setMessages(prev => prev.map(m =>
                  m.id === assistantMsg.id
                    ? { ...m, isStreaming: false }
                    : m
                ));
              }
            } catch {}
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError' || stoppingRef.current) {
        setMessages(prev => prev.map(m =>
          m.id === assistantMsg.id
            ? { ...m, content: m.content + (stoppingRef.current ? '\n\n[已停止]' : ''), isStreaming: false }
            : m
        ));
      } else {
        setMessages(prev => prev.map(m =>
          m.id === assistantMsg.id
            ? { ...m, content: '❌ 对话失败: ' + err.message, isStreaming: false }
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

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100">
        <h3 className="font-semibold text-gray-800 text-base">🤖 AI 写作助手</h3>
        <div className="flex gap-1">
          <button
            onClick={() => setShowPromptEditor(true)}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            提示词
          </button>
          {messages.length === 0 && (
            <button
              onClick={() => { showHistory ? setShowHistory(false) : (loadHistory(), setShowHistory(true)); }}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              {showHistory ? '隐藏' : '历史'}
            </button>
          )}
          {messages.length > 0 && (
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

      {/* Context indicator */}
      {chapterTitle && (
        <div className="px-3 py-1.5 bg-orange-50 border-b border-orange-100 text-xs text-orange-600">
          📖 当前上下文：{chapterTitle}
        </div>
      )}

      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <p className="text-4xl mb-2">💬</p>
            <p className="text-sm text-gray-400 mb-3">向 AI 助手提问关于写作的任何问题</p>
            <div className="flex flex-wrap gap-1 justify-center">
              {quickCommands.slice(0, 6).map((cmd, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(cmd.prompt)}
                  disabled={loading}
                  className="text-xs bg-gray-50 hover:bg-orange-50 text-gray-600 hover:text-orange-600 px-2.5 py-1.5 rounded-lg border border-gray-100 transition"
                >
                  {cmd.label}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
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
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-2.5 border-t border-gray-100 bg-gray-50/50">
        <div className="flex flex-wrap gap-1 mb-2">
          {quickCommands.map((cmd, i) => (
            <button
              key={i}
              onClick={() => handleSend(cmd.prompt)}
              disabled={loading}
              className="text-xs text-gray-500 hover:text-orange-500 hover:bg-orange-50 px-2 py-1 rounded-md border border-gray-100 bg-white transition"
            >
              {cmd.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={chapterTitle ? `问关于「${chapterTitle}」的问题...` : '输入消息...'}
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
