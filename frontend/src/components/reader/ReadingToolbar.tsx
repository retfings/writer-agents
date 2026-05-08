import { useState, useRef, useEffect } from 'react';

interface Props {
  fontSize: number;
  onFontSizeChange: (size: number) => void;
  theme: 'light' | 'dark' | 'sepia';
  onThemeChange: (theme: 'light' | 'dark' | 'sepia') => void;
  leftCollapsed: boolean;
  rightCollapsed: boolean;
  onToggleLeft: () => void;
  onToggleRight: () => void;
  autoSaveInterval: number;
  onAutoSaveIntervalChange: (seconds: number) => void;
}

const AUTO_SAVE_OPTIONS = [
  { value: 0, label: '关闭' },
  { value: 2, label: '2s' },
  { value: 3, label: '3s' },
  { value: 5, label: '5s' },
  { value: 10, label: '10s' },
];

export default function ReadingToolbar({
  fontSize, onFontSizeChange, theme, onThemeChange,
  leftCollapsed, rightCollapsed, onToggleLeft, onToggleRight,
  autoSaveInterval, onAutoSaveIntervalChange,
}: Props) {
  const [showAutoSave, setShowAutoSave] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowAutoSave(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const themes: Array<{ key: 'light' | 'dark' | 'sepia'; icon: string; label: string }> = [
    { key: 'light', icon: '☀️', label: '日间' },
    { key: 'sepia', icon: '📜', label: '护眼' },
    { key: 'dark', icon: '🌙', label: '夜间' },
  ];

  const bgColor = theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const textColor = theme === 'dark' ? 'text-gray-300' : 'text-gray-600';

  return (
    <div className={`border-b ${bgColor} transition-colors`}>
      <div className="max-w-[720px] mx-auto px-4 py-2 flex items-center justify-between">
        {/* Left: sidebar toggles */}
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleLeft}
            className={`text-xs px-2 py-1 rounded ${textColor} hover:bg-gray-100 transition`}
            title={leftCollapsed ? '显示大纲' : '隐藏大纲'}
          >
            {leftCollapsed ? '📑' : '📑◀'}
          </button>
          <button
            onClick={onToggleRight}
            className={`text-xs px-2 py-1 rounded ${textColor} hover:bg-gray-100 transition`}
            title={rightCollapsed ? '显示AI助手' : '隐藏AI助手'}
          >
            {rightCollapsed ? '🤖' : '🤖▶'}
          </button>
        </div>

        {/* Center: font size + auto-save */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => onFontSizeChange(Math.max(12, fontSize - 2))}
              className={`text-xs px-2 py-1 rounded ${textColor} hover:bg-gray-100 transition`}
              disabled={fontSize <= 12}
            >
              A⁻
            </button>
            <span className={`text-[10px] ${textColor} w-8 text-center`}>{fontSize}</span>
            <button
              onClick={() => onFontSizeChange(Math.min(24, fontSize + 2))}
              className={`text-xs px-2 py-1 rounded ${textColor} hover:bg-gray-100 transition`}
              disabled={fontSize >= 24}
            >
              A⁺
            </button>
          </div>

          {/* Auto-save selector */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowAutoSave(!showAutoSave)}
              className={`text-[10px] px-1.5 py-0.5 rounded ${textColor} hover:bg-gray-100 transition flex items-center gap-0.5`}
              title="自动保存间隔"
            >
              💾 {autoSaveInterval === 0 ? '手动' : `${autoSaveInterval}s`}
            </button>
            {showAutoSave && (
              <div className={`absolute top-full mt-1 right-0 rounded-lg shadow-lg border ${bgColor} py-1 z-10`}>
                {AUTO_SAVE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => { onAutoSaveIntervalChange(opt.value); setShowAutoSave(false); }}
                    className={`block w-full text-left px-3 py-1 text-xs whitespace-nowrap ${
                      autoSaveInterval === opt.value
                        ? 'text-orange-600 bg-orange-50'
                        : `${textColor} hover:bg-gray-50`
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: theme switcher */}
        <div className="flex items-center gap-0.5">
          {themes.map(t => (
            <button
              key={t.key}
              onClick={() => onThemeChange(t.key)}
              className={`text-xs px-2 py-1 rounded transition ${
                theme === t.key
                  ? 'bg-orange-100 text-orange-600'
                  : `${textColor} hover:bg-gray-100`
              }`}
              title={t.label}
            >
              {t.icon}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
