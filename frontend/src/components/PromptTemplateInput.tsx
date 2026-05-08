import { useState, useRef, useEffect, useCallback } from 'react';

interface Template {
  id: string;
  icon: string;
  label: string;
  desc: string;
  prompt: string;
  color: string; // tailwind bg color
}

export const PROMPT_TEMPLATES: Template[] = [
  {
    id: 'rebirth',
    icon: '🔄',
    label: '重生逆袭',
    desc: '重生到过去改变命运',
    prompt: '一个%s重生到2008年，利用前世记忆%s，最终%s',
    color: 'bg-blue-50 border-blue-200 text-blue-700',
  },
  {
    id: 'transmigrate',
    icon: '🌌',
    label: '穿越异世',
    desc: '现代人穿越到异世界',
    prompt: '一个%s穿越到%s世界，靠着%s能力%s',
    color: 'bg-purple-50 border-purple-200 text-purple-700',
  },
  {
    id: 'system',
    icon: '🎮',
    label: '系统流',
    desc: '获得系统/金手指',
    prompt: '一个%s突然获得%s系统，从此%s',
    color: 'bg-green-50 border-green-200 text-green-700',
  },
  {
    id: 'revenge',
    icon: '⚔️',
    label: '复仇爽文',
    desc: '隐忍归来报仇雪恨',
    prompt: '一个%s被%s背叛，隐忍多年后成为%s回归复仇',
    color: 'bg-red-50 border-red-200 text-red-700',
  },
  {
    id: 'urban',
    icon: '🏙️',
    label: '都市商战',
    desc: '都市背景的商业斗争',
    prompt: '一个%s的%s在都市中凭借%s白手起家，面对%s的挑战',
    color: 'bg-amber-50 border-amber-200 text-amber-700',
  },
  {
    id: 'xianxia',
    icon: '🐉',
    label: '修仙问道',
    desc: '凡人修炼成仙之路',
    prompt: '一个%s的凡人意外获得%s传承，踏上修仙之路，发现%s',
    color: 'bg-cyan-50 border-cyan-200 text-cyan-700',
  },
  {
    id: 'mystery',
    icon: '🔍',
    label: '悬疑探案',
    desc: '层层谜团的推理故事',
    prompt: '一个%s卷入一起%s案件，在调查中发现%s',
    color: 'bg-slate-50 border-slate-200 text-slate-700',
  },
  {
    id: 'apocalypse',
    icon: '🧟',
    label: '末日生存',
    desc: '末日降临后的生存挑战',
    prompt: '%s降临后，一个%s为了生存%s',
    color: 'bg-zinc-50 border-zinc-200 text-zinc-700',
  },
];

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  error?: string;
}

export default function PromptTemplateInput({ value, onChange, onSubmit, error }: Props) {
  const [showTemplates, setShowTemplates] = useState(false);
  const [showSlash, setShowSlash] = useState(false);
  const [slashFilter, setSlashFilter] = useState('');
  const [cursorPos, setCursorPos] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const slashRef = useRef<HTMLDivElement>(null);
  const [selectedSlash, setSelectedSlash] = useState(0);

  // Click outside closes slash menu
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (slashRef.current && !slashRef.current.contains(e.target as Node)) {
        setShowSlash(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const pos = e.target.selectionStart;
    setCursorPos(pos);
    onChange(newValue);

    // Check for slash trigger
    const beforeCursor = newValue.slice(0, pos);
    const slashIdx = beforeCursor.lastIndexOf('/');
    if (slashIdx >= 0) {
      const textAfterSlash = beforeCursor.slice(slashIdx + 1);
      // Only trigger if / is at start of line or after space/newline
      const charBeforeSlash = slashIdx > 0 ? beforeCursor[slashIdx - 1] : '\n';
      if (charBeforeSlash === ' ' || charBeforeSlash === '\n' || slashIdx === 0) {
        if (!textAfterSlash.includes(' ') && textAfterSlash.length < 20) {
          setSlashFilter(textAfterSlash);
          setShowSlash(true);
          setSelectedSlash(0);
        } else {
          setShowSlash(false);
        }
      } else {
        setShowSlash(false);
      }
    } else {
      setShowSlash(false);
    }
  }, [onChange]);

  const applyTemplate = (template: Template) => {
    const beforeCursor = value.slice(0, cursorPos);
    const afterCursor = value.slice(cursorPos);
    const slashIdx = beforeCursor.lastIndexOf('/');
    
    let newValue: string;
    if (slashIdx >= 0 && showSlash) {
      // Replace /filter with template prompt
      newValue = beforeCursor.slice(0, slashIdx) + template.prompt + afterCursor;
    } else {
      // Append template prompt
      newValue = (value ? value + ' ' : '') + template.prompt;
    }
    
    onChange(newValue);
    setShowSlash(false);
    setShowTemplates(false);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showSlash) {
      const filtered = filterTemplates(slashFilter);
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSlash(prev => Math.min(prev + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSlash(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && filtered[selectedSlash]) {
        e.preventDefault();
        applyTemplate(filtered[selectedSlash]);
      } else if (e.key === 'Escape') {
        setShowSlash(false);
      }
      return;
    }
    
    // Enter submits
    if (e.key === 'Enter' && !e.shiftKey && value.trim()) {
      e.preventDefault();
      onSubmit();
    }
  };

  const filterTemplates = (filter: string) => {
    if (!filter) return PROMPT_TEMPLATES;
    const lower = filter.toLowerCase();
    return PROMPT_TEMPLATES.filter(t =>
      t.label.includes(lower) || t.desc.includes(lower) || t.prompt.includes(lower)
    );
  };

  return (
    <div className="space-y-3">
      {/* Template chips */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-gray-400 shrink-0">模板：</span>
        <div className="flex flex-wrap gap-1.5">
          {PROMPT_TEMPLATES.slice(0, 4).map(t => (
            <button
              key={t.id}
              onClick={() => applyTemplate(t)}
              className={`text-[10px] sm:text-xs px-2 py-1 rounded-full border transition hover:scale-105 ${t.color}`}
            >
              {t.icon} {t.label}
            </button>
          ))}
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className="text-[10px] sm:text-xs px-2 py-1 rounded-full border border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300 transition"
          >
            {showTemplates ? '收起 ▴' : `+${PROMPT_TEMPLATES.length - 4} 更多`}
          </button>
        </div>
      </div>

      {/* Expanded templates grid */}
      {showTemplates && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 animate-fadeIn">
          {PROMPT_TEMPLATES.slice(4).map(t => (
            <button
              key={t.id}
              onClick={() => applyTemplate(t)}
              className={`text-left p-2.5 rounded-lg border transition hover:shadow-sm active:scale-[0.97] ${t.color}`}
            >
              <div className="text-base mb-0.5">{t.icon}</div>
              <div className="text-xs font-medium">{t.label}</div>
              <div className="text-[10px] opacity-60 mt-0.5">{t.desc}</div>
            </button>
          ))}
        </div>
      )}

      {/* Textarea with slash overlay */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-orange-500 text-sm resize-none"
          rows={3}
          placeholder="输入故事创意，或输入 / 选择模板...
例如：/重生 或直接写「一个重生到2008年的程序员...」"
        />
        
        {/* Slash command dropdown */}
        {showSlash && (
          <div
            ref={slashRef}
            className="absolute left-2 bottom-full mb-1 w-72 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-20 animate-slideUp"
          >
            <div className="px-3 py-2 text-[10px] text-gray-400 bg-gray-50 border-b">
              选择模板 — 输入关键字筛选，↓↑ 选择，Enter 确认，Esc 取消
            </div>
            <div className="max-h-48 overflow-y-auto py-1">
              {filterTemplates(slashFilter).map((t, i) => (
                <button
                  key={t.id}
                  onMouseDown={e => { e.preventDefault(); applyTemplate(t); }}
                  className={`w-full text-left px-3 py-2 flex items-center gap-2.5 text-xs transition ${
                    i === selectedSlash ? 'bg-orange-50 text-orange-700' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-sm">{t.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{t.label}</div>
                    <div className="text-[10px] opacity-50 truncate">{t.desc}</div>
                  </div>
                </button>
              ))}
              {filterTemplates(slashFilter).length === 0 && (
                <div className="px-3 py-4 text-xs text-gray-400 text-center">无匹配模板</div>
              )}
            </div>
          </div>
        )}

        {/* Hint */}
        <div className="flex items-center justify-between mt-1.5">
          <p className="text-[10px] text-gray-400">
            输入 <kbd className="px-1 py-0.5 rounded bg-gray-100 text-gray-500 text-[9px]">/</kbd> 唤出模板 · 
            <kbd className="px-1 py-0.5 rounded bg-gray-100 text-gray-500 text-[9px] ml-0.5">Enter</kbd> 提交
          </p>
          {value.trim().length > 0 && (
            <span className="text-[10px] text-gray-400">{value.length} 字</span>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</div>
      )}
    </div>
  );
}
