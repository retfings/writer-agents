import { useEffect } from 'react';

interface Props {
  fontSize: number;
  onFontSizeChange: (size: number) => void;
  theme: 'light' | 'dark' | 'sepia';
  onThemeChange: (theme: 'light' | 'dark' | 'sepia') => void;
  leftCollapsed: boolean;
  rightCollapsed: boolean;
  onToggleLeft: () => void;
  onToggleRight: () => void;
  focusMode: boolean;
  onToggleFocus: () => void;
  onFormat?: (cmd: 'bold' | 'italic' | 'quote') => void;
  onOpenSettings?: () => void;
}

export default function ReadingToolbar({
  fontSize, onFontSizeChange, theme, onThemeChange,
  leftCollapsed, rightCollapsed, onToggleLeft, onToggleRight,
  focusMode, onToggleFocus, onFormat, onOpenSettings,
}: Props) {
  const bgColor = theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const textColor = theme === 'dark' ? 'text-gray-300' : 'text-gray-500';

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && focusMode) {
        onToggleFocus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [focusMode, onToggleFocus]);

  if (focusMode) {
    // Minimal focus mode bar - just exit button
    return (
      <div className={`border-b ${bgColor} transition-colors`}>
        <div className="px-4 py-1.5 flex items-center justify-end">
          <button
            onClick={onToggleFocus}
            className={`text-xs px-2.5 py-1 rounded ${textColor} hover:bg-gray-100 transition`}
            title="退出专注模式 (Esc)"
          >
            🖋️ 退出专注
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`border-b ${bgColor} transition-colors`}>
      <div className="px-4 py-2 flex items-center justify-between">
        {/* Left: sidebar toggles + formatting */}
        <div className="hidden lg:flex items-center gap-0.5">
          <button onClick={onToggleLeft} className={`text-xs px-1.5 py-1 rounded ${textColor} hover:bg-gray-100`} title="大纲">
            {leftCollapsed ? '📑' : '📑◀'}
          </button>
          <button onClick={onToggleRight} className={`text-xs px-1.5 py-1 rounded ${textColor} hover:bg-gray-100`} title="AI助手">
            {rightCollapsed ? '🤖' : '🤖▶'}
          </button>

          <span className={`w-px h-4 mx-1 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`} />

          {/* Basic formatting */}
          <button onClick={() => onFormat?.('bold')} className={`text-xs px-1.5 py-1 rounded font-bold ${textColor} hover:bg-gray-100`} title="加粗 (Ctrl+B)">B</button>
          <button onClick={() => onFormat?.('italic')} className={`text-xs px-1.5 py-1 rounded italic ${textColor} hover:bg-gray-100`} title="斜体 (Ctrl+I)">I</button>
          <button onClick={() => onFormat?.('quote')} className={`text-xs px-1.5 py-1 rounded ${textColor} hover:bg-gray-100`} title="引用">❝</button>
        </div>

        {/* Center: focus + font */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleFocus}
            className={`text-xs px-2 py-1 rounded ${textColor} hover:bg-gray-100 transition`}
            title="专注模式"
          >
            🖋️
          </button>
          <div className="flex items-center gap-0.5">
            <button onClick={() => onFontSizeChange(Math.max(12, fontSize - 1))} className={`text-xs px-1.5 py-0.5 rounded ${textColor} hover:bg-gray-100`} disabled={fontSize <= 12}>A⁻</button>
            <span className={`text-[10px] ${textColor} w-8 text-center tabular-nums`}>{fontSize}px</span>
            <button onClick={() => onFontSizeChange(Math.min(24, fontSize + 1))} className={`text-xs px-1.5 py-0.5 rounded ${textColor} hover:bg-gray-100`} disabled={fontSize >= 24}>A⁺</button>
          </div>
        </div>

        {/* Right: theme + settings */}
        <div className="flex items-center gap-0.5 relative">
          <button onClick={() => onThemeChange('light')} className={`text-xs px-1.5 py-1 rounded ${theme === 'light' ? 'bg-orange-100 text-orange-600' : `${textColor} hover:bg-gray-100`}`} title="日间">☀️</button>
          <button onClick={() => onThemeChange('sepia')} className={`text-xs px-1.5 py-1 rounded ${theme === 'sepia' ? 'bg-orange-100 text-orange-600' : `${textColor} hover:bg-gray-100`}`} title="护眼">📜</button>
          <button onClick={() => onThemeChange('dark')} className={`text-xs px-1.5 py-1 rounded ${theme === 'dark' ? 'bg-orange-100 text-orange-600' : `${textColor} hover:bg-gray-100`}`} title="夜间">🌙</button>

          <span className={`w-px h-4 mx-0.5 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`} />

          {/* Settings button opens modal */}
          <button onClick={onOpenSettings} className={`text-xs px-1.5 py-1 rounded ${textColor} hover:bg-gray-100`} title="设置">⚙️</button>
        </div>
      </div>
    </div>
  );
}
