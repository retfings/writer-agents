import { useState, useEffect, useRef, useCallback } from 'react';
import ReviewNotes from './ReviewNotes';

interface Props {
  title: string;
  content: string;
  wordCount: number;
  status: string;
  outline?: string;
  agentNotes?: any[];
  fontSize?: number;
  theme?: 'light' | 'dark' | 'sepia';
  autoSaveInterval?: number;
  lastSavedAt?: Date | null;
  onSave?: (content: string) => Promise<void>;
}

export default function ChapterContent({
  title, content, wordCount: _wordCount, status, outline, agentNotes,
  fontSize = 16, theme = 'light',
  autoSaveInterval = 3,
  lastSavedAt,
  onSave,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState(content);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved' | 'error'>('saved');
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);
  const [showReview, setShowReview] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveRef = useRef(onSave);
  saveRef.current = onSave;

  useEffect(() => {
    setText(content);
    setSaveStatus('saved');
    setLastSavedTime(null);
  }, [content]);

  useEffect(() => {
    if (lastSavedAt) setLastSavedTime(lastSavedAt);
  }, [lastSavedAt]);

  const getTimeAgo = (date: Date) => {
    const secs = Math.floor((Date.now() - date.getTime()) / 1000);
    if (secs < 10) return '刚刚';
    if (secs < 60) return `${secs}秒前`;
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}分钟前`;
    return `${Math.floor(mins / 60)}小时前`;
  };

  const doSave = useCallback(async (value: string) => {
    if (!saveRef.current) return;
    setSaveStatus('saving');
    try {
      await saveRef.current(value);
      setSaveStatus('saved');
      setLastSavedTime(new Date());
    } catch {
      setSaveStatus('error');
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setText(newText);
    setSaveStatus('unsaved');
    if (timerRef.current) clearTimeout(timerRef.current);
    if (autoSaveInterval > 0) {
      timerRef.current = setTimeout(() => doSave(newText), autoSaveInterval * 1000);
    }
  };

  const applyFormat = (cmd: 'bold' | 'italic' | 'quote') => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = text.substring(start, end);
    const before = text.substring(0, start);
    const after = text.substring(end);

    let replacement: string;
    switch (cmd) {
      case 'bold': replacement = `**${selected || '加粗文字'}**`; break;
      case 'italic': replacement = `*${selected || '斜体文字'}*`; break;
      case 'quote': replacement = `> ${selected || '引用内容'}`; break;
    }

    const newText = before + replacement + after;
    setText(newText);
    // Trigger deferred save
    if (timerRef.current) clearTimeout(timerRef.current);
    if (autoSaveInterval > 0) {
      timerRef.current = setTimeout(() => doSave(newText), autoSaveInterval * 1000);
    }
    // Restore focus and selection
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start, start + replacement.length);
    });
  };

  // Ctrl+S manual save
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (timerRef.current) clearTimeout(timerRef.current);
        doSave(text);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [text, doSave]);

  // Expose format function
  useEffect(() => {
    (window as any).__chapterFormat = applyFormat;
    return () => { delete (window as any).__chapterFormat; };
  }, [text]);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const bgColors: Record<string, string> = {
    light: 'bg-white',
    dark: 'bg-gray-900',
    sepia: 'bg-[#f4ecd8]',
  };
  const textColors: Record<string, string> = {
    light: 'text-gray-800',
    dark: 'text-gray-200',
    sepia: 'text-[#5b4636]',
  };
  const borderColors: Record<string, string> = {
    light: 'border-gray-200',
    dark: 'border-gray-700',
    sepia: 'border-[#d5c8a8]',
  };
  const placeholderColors: Record<string, string> = {
    light: 'placeholder-gray-300',
    dark: 'placeholder-gray-600',
    sepia: 'placeholder-[#b8a88a]',
  };

  const wordCountNow = text.length;
  const statusLabels: Record<string, string> = {
    done: '已完成',
    review: '审校中',
    draft: '草稿',
    outline: '大纲',
  };

  if (!content && !text) {
    return (
      <div className={`flex-1 flex flex-col items-center justify-center ${bgColors[theme]} ${textColors[theme]} px-8`}>
        <p className="text-4xl mb-3">📝</p>
        <p className="opacity-40 text-sm mb-2">该章节尚未写作</p>
        {outline && (
          <div className={`max-w-lg text-center`}>
            <p className="text-xs opacity-30 mb-1">AI 生成大纲</p>
            <p className={`text-sm leading-relaxed opacity-50`}
               style={{ fontSize: `${fontSize}px` }}>
              {outline}
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`flex-1 flex flex-col overflow-hidden ${bgColors[theme]} transition-colors duration-300`}>
      {/* Minimal status bar */}
      <div className={`flex items-center justify-between px-5 py-1 text-[11px] border-b ${borderColors[theme]} ${theme === 'dark' ? 'bg-gray-850' : theme === 'sepia' ? 'bg-[#ede0c3]' : 'bg-gray-50'}`}>
        <div className="flex items-center gap-2">
          <span className={`
            ${saveStatus === 'saved' ? 'text-green-600' :
              saveStatus === 'saving' ? 'text-blue-500' :
              saveStatus === 'unsaved' ? 'text-orange-500' :
              'text-red-500'}
          `}>
            {saveStatus === 'saved' && lastSavedTime ? `✅ ${getTimeAgo(lastSavedTime)}保存` :
             saveStatus === 'saved' ? '✅ 已保存' :
             saveStatus === 'saving' ? '⏳ 保存中...' :
             saveStatus === 'unsaved' ? '● 未保存' :
             '⚠ 保存失败'}
          </span>
        </div>
        <div className="flex items-center gap-3 opacity-60">
          <span>{wordCountNow.toLocaleString()} 字</span>
          <span className={`text-[10px] px-1.5 py-px rounded ${
            theme === 'dark' ? 'bg-gray-800 text-gray-400' : 'bg-gray-200 text-gray-500'
          }`}>
            {statusLabels[status] || status}
          </span>
          {agentNotes && agentNotes.length > 0 && (
            <button
              onClick={() => setShowReview(!showReview)}
              className={`text-[10px] px-1.5 py-px rounded cursor-pointer ${
                showReview ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
              }`}
            >
              📝 审校意见 {agentNotes.length}
            </button>
          )}
        </div>
      </div>

      {/* Review notes panel */}
      {showReview && agentNotes && agentNotes.length > 0 && (
        <ReviewNotes
          content={typeof agentNotes[0] === 'string' ? agentNotes[0] : JSON.stringify(agentNotes[0], null, 2)}
          theme={theme}
        />
      )}

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-5 sm:px-8 py-6 sm:py-10">
          {/* Chapter header */}
          <div className="mb-5 sm:mb-6 text-center">
            <h1 className="text-xl sm:text-2xl font-bold mb-2 leading-relaxed" style={{ fontSize: `${fontSize + 6}px` }}>
              {title}
            </h1>
            {outline && (
              <p className={`text-sm opacity-50 leading-relaxed italic`}>
                {outline}
              </p>
            )}
          </div>

          {/* Separator */}
          <div className={`border-t ${borderColors[theme]} mb-5 sm:mb-6`} />

          {/* Directly editable textarea */}
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleChange}
            className={`w-full min-h-[60vh] resize-none bg-transparent border-none outline-none font-serif ${textColors[theme]} ${placeholderColors[theme]} text-[16px] sm:text-base`}
            style={{
              fontSize: `${fontSize}px`,
              lineHeight: '1.75',
              textIndent: '2em',
            }}
            placeholder="在此编辑章节内容..."
            spellCheck={true}
            lang="zh-CN"
          />

          {/* Bottom breathing room */}
          <div className="h-32" />
        </div>
      </div>
    </div>
  );
}
