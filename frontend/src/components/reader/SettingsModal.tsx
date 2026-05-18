interface Props {
  fontSize: number;
  onFontSizeChange: (size: number) => void;
  theme: 'light' | 'dark' | 'sepia';
  onThemeChange: (theme: 'light' | 'dark' | 'sepia') => void;
  leftCollapsed: boolean;
  onToggleLeft: () => void;
  rightCollapsed: boolean;
  onToggleRight: () => void;
  autoSaveInterval: number;
  onAutoSaveIntervalChange: (seconds: number) => void;
  focusMode: boolean;
  onToggleFocus: () => void;
  onClose: () => void;
}

const AUTO_SAVE_OPTIONS = [
  { value: 0, label: '关闭' },
  { value: 2, label: '2s' },
  { value: 3, label: '3s' },
  { value: 5, label: '5s' },
  { value: 10, label: '10s' },
];

export default function SettingsModal({
  fontSize, onFontSizeChange, theme, onThemeChange,
  leftCollapsed, onToggleLeft, rightCollapsed, onToggleRight,
  autoSaveInterval, onAutoSaveIntervalChange,
  focusMode, onToggleFocus, onClose,
}: Props) {
  return (
    <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">⚙️ 阅读设置</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        <div className="p-4 space-y-5">
          {/* 侧栏开关 */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">侧栏</p>
            <div className="flex gap-2">
              <button
                onClick={onToggleLeft}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium border transition ${
                  !leftCollapsed ? 'bg-orange-50 text-orange-600 border-orange-200' : 'text-gray-500 border-gray-200 hover:bg-gray-50'
                }`}
              >
                📑 {leftCollapsed ? '隐藏' : '大纲'}
              </button>
              <button
                onClick={onToggleRight}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium border transition ${
                  !rightCollapsed ? 'bg-orange-50 text-orange-600 border-orange-200' : 'text-gray-500 border-gray-200 hover:bg-gray-50'
                }`}
              >
                🤖 {rightCollapsed ? '隐藏' : 'AI 助手'}
              </button>
            </div>
          </div>

          {/* 主题 */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">主题</p>
            <div className="flex gap-2">
              {[
                { key: 'light' as const, icon: '☀️', label: '日间' },
                { key: 'sepia' as const, icon: '📜', label: '护眼' },
                { key: 'dark' as const, icon: '🌙', label: '夜间' },
              ].map(t => (
                <button
                  key={t.key}
                  onClick={() => onThemeChange(t.key)}
                  className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-lg text-xs font-medium border transition ${
                    theme === t.key ? 'bg-orange-50 text-orange-600 border-orange-200' : 'text-gray-500 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-lg">{t.icon}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 字号 */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">字号</p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => onFontSizeChange(Math.max(12, fontSize - 1))}
                disabled={fontSize <= 12}
                className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40"
              >
                A⁻
              </button>
              <div className="flex-1">
                <input
                  type="range"
                  min={12}
                  max={24}
                  value={fontSize}
                  onChange={e => onFontSizeChange(Number(e.target.value))}
                  className="w-full accent-orange-500"
                />
              </div>
              <button
                onClick={() => onFontSizeChange(Math.min(24, fontSize + 1))}
                disabled={fontSize >= 24}
                className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40"
              >
                A⁺
              </button>
              <span className="text-sm text-gray-500 w-10 text-center tabular-nums">{fontSize}px</span>
            </div>
          </div>

          {/* 自动保存 */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">自动保存间隔</p>
            <div className="flex gap-2">
              {AUTO_SAVE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => onAutoSaveIntervalChange(opt.value)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium border transition ${
                    autoSaveInterval === opt.value ? 'bg-orange-50 text-orange-600 border-orange-200' : 'text-gray-500 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 专注模式 */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">专注模式</p>
            <button
              onClick={onToggleFocus}
              className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium border transition ${
                focusMode ? 'bg-orange-50 text-orange-600 border-orange-200' : 'text-gray-500 border-gray-200 hover:bg-gray-50'
              }`}
            >
              🖋️ {focusMode ? '退出专注模式' : '进入专注模式'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}