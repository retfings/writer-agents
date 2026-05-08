import { useState, useEffect, useRef, useCallback } from 'react';

interface Props {
  title: string;
  content: string;
  wordCount: number;
  status: string;
  outline?: string;
  fontSize?: number;
  theme?: 'light' | 'dark' | 'sepia';
  autoSaveInterval?: number; // seconds, 0 = disable auto-save
  onSave?: (content: string) => Promise<void>;
}

export default function ChapterContent({
  title, content, wordCount: _wordCount, status, outline,
  fontSize = 16, theme = 'light',
  autoSaveInterval = 3,
  onSave,
}: Props) {
  const [text, setText] = useState(content);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved' | 'error'>('saved');
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveRef = useRef(onSave);
  saveRef.current = onSave;

  // Sync external content changes (e.g. chapter switch, AI rewrite)
  useEffect(() => {
    setText(content);
    setSaveStatus('saved');
  }, [content]);

  const doSave = useCallback(async (value: string) => {
    if (!saveRef.current) return;
    setSaveStatus('saving');
    try {
      await saveRef.current(value);
      setSaveStatus('saved');
      setLastSaved(new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
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
      timerRef.current = setTimeout(() => {
        doSave(newText);
      }, autoSaveInterval * 1000);
    }
  };

  // Manual save via Ctrl+S
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

  // Cleanup timer on unmount
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

  if (!content && !text) {
    return (
      <div className={`flex-1 flex flex-col items-center justify-center ${bgColors[theme]} ${textColors[theme]}`}>
        <p className="text-4xl mb-3">📝</p>
        <p className="opacity-50 text-sm">该章节尚未写作</p>
      </div>
    );
  }

  return (
    <div className={`flex-1 flex flex-col overflow-hidden ${bgColors[theme]} transition-colors duration-300`}>
      {/* Save status bar */}
      <div className={`flex items-center justify-between px-5 py-1.5 text-xs border-b ${borderColors[theme]} ${bgColors[theme]}`}>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 ${
            saveStatus === 'saved' ? 'text-green-500' :
            saveStatus === 'saving' ? 'text-blue-500' :
            saveStatus === 'unsaved' ? 'text-orange-500' :
            'text-red-500'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              saveStatus === 'saved' ? 'bg-green-500' :
              saveStatus === 'saving' ? 'bg-blue-500 animate-pulse' :
              saveStatus === 'unsaved' ? 'bg-orange-500' :
              'bg-red-500'
            }`} />
            {saveStatus === 'saved' ? '已保存' :
             saveStatus === 'saving' ? '保存中...' :
             saveStatus === 'unsaved' ? '未保存' :
             '保存失败'}
          </span>
          {lastSaved && saveStatus === 'saved' && (
            <span className="text-gray-400">{lastSaved}</span>
          )}
        </div>
        <div className="flex items-center gap-3 text-gray-400">
          <span>{wordCountNow.toLocaleString()} 字</span>
          {autoSaveInterval > 0 && (
            <span>自动保存：{autoSaveInterval}s</span>
          )}
          <span className="text-gray-300">Ctrl+S 手动保存</span>
        </div>
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[720px] mx-auto px-5 sm:px-8 py-6 sm:py-10">
          {/* Chapter header */}
          <div className="mb-6 sm:mb-8 text-center">
            <h1 className="text-xl sm:text-2xl font-bold mb-2" style={{ fontSize: `${fontSize + 4}px`, lineHeight: '1.5' }}>
              {title}
            </h1>
            {outline && (
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} italic`}>
                {outline}
              </p>
            )}
            <div className="flex items-center justify-center gap-3 mt-3">
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                status === 'done' ? 'bg-green-100 text-green-600' :
                status === 'review' ? 'bg-blue-100 text-blue-600' :
                status === 'draft' ? 'bg-yellow-100 text-yellow-600' :
                'bg-gray-100 text-gray-500'
              }`}>
                {status === 'done' ? '✅ 已完成' : status === 'review' ? '🔍 审校中' : status === 'draft' ? '✍️ 草稿' : '📋 大纲'}
              </span>
            </div>
          </div>

          {/* Separator */}
          <div className={`border-t ${borderColors[theme]} mb-6 sm:mb-8`} />

          {/* Directly editable textarea */}
          <textarea
            value={text}
            onChange={handleChange}
            className={`w-full min-h-[60vh] resize-none bg-transparent border-none outline-none font-serif leading-relaxed ${textColors[theme]} ${placeholderColors[theme]}`}
            style={{
              fontSize: `${fontSize}px`,
              lineHeight: '2',
              textIndent: '2em',
            }}
            placeholder="在此编辑章节内容..."
          />

          {/* Bottom spacer */}
          <div className="h-16" />
        </div>
      </div>
    </div>
  );
}
