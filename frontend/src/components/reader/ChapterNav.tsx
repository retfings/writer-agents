interface ChapterNavItem {
  id: string;
  number: number;
  title: string;
}

interface Props {
  chapters: ChapterNavItem[];
  currentNumber: number;
  onNavigate: (chapter: ChapterNavItem) => void;
  theme?: 'light' | 'dark' | 'sepia';
}

export default function ChapterNav({ chapters, currentNumber, onNavigate, theme = 'light' }: Props) {
  const currentIdx = chapters.findIndex(ch => ch.number === currentNumber);
  const prev = currentIdx > 0 ? chapters[currentIdx - 1] : null;
  const next = currentIdx < chapters.length - 1 ? chapters[currentIdx + 1] : null;
  const progress = chapters.length > 1 ? Math.round(((currentIdx + 1) / chapters.length) * 100) : 100;

  const textColor = theme === 'dark' ? 'text-gray-400' : 'text-gray-500';
  const borderColor = theme === 'dark' ? 'border-gray-700' : 'border-gray-200';
  const hoverBg = theme === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-gray-50';

  return (
    <div className={`border-b ${borderColor}`}>
      <div className="px-4 py-2.5 flex items-center justify-between">
        <button
          onClick={() => prev && onNavigate(prev)}
          disabled={!prev}
          className={`text-xs sm:text-sm ${textColor} ${hoverBg} px-3 py-1.5 rounded transition disabled:opacity-30 disabled:cursor-default`}
        >
          ← {prev ? `第${prev.number}章` : '没有更早'}
        </button>

        <div className="flex items-center gap-2">
          <span className={`text-xs ${textColor}`}>
            {currentNumber}/{chapters.length}
          </span>
          {/* Mini progress bar */}
          <div className={`w-16 sm:w-24 h-1 rounded-full ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`}>
            <div
              className="h-1 rounded-full bg-orange-400 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <button
          onClick={() => next && onNavigate(next)}
          disabled={!next}
          className={`text-xs sm:text-sm ${textColor} ${hoverBg} px-3 py-1.5 rounded transition disabled:opacity-30 disabled:cursor-default`}
        >
          {next ? `第${next.number}章 →` : '已是最新'}
        </button>
      </div>
    </div>
  );
}
