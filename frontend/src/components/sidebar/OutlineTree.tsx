import { useState } from 'react';

const statusIcons: Record<string, string> = {
  outline: '📋', draft: '✍️', review: '🔍', done: '✅',
};

interface ChapterItem {
  id: string;
  number: number;
  title: string;
  status: string;
  wordCount: number;
  outline?: string;
}

interface Props {
  chapters: ChapterItem[];
  activeChapterId: string | null;
  onSelectChapter: (ch: ChapterItem) => void;
  onGenerateOutline: () => void;
  generating: boolean;
  onDeleteChapter?: (id: string) => void;
  onDeleteAll?: () => void;
  deletingAll?: boolean;
}

export default function OutlineTree({
  chapters, activeChapterId, onSelectChapter, onGenerateOutline,
  generating, onDeleteChapter, onDeleteAll, deletingAll,
}: Props) {
  const [search, setSearch] = useState('');

  const filtered = search
    ? chapters.filter(ch =>
        ch.title.toLowerCase().includes(search.toLowerCase()) ||
        String(ch.number).includes(search)
      )
    : chapters;

  return (
    <div className="flex flex-col h-full p-3 select-none">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-gray-800 text-sm">📑 章节目录</h3>
        <span className="text-xs text-gray-400">{chapters.length} 章</span>
      </div>

      {/* Search */}
      {chapters.length > 5 && (
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="搜索章节..."
          className="w-full px-2.5 py-1.5 border border-gray-200 rounded text-xs mb-2 outline-none focus:border-orange-300"
        />
      )}

      {/* Generate button */}
      {chapters.length === 0 ? (
        <button
          onClick={onGenerateOutline}
          disabled={generating}
          className="w-full bg-orange-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50 mb-2"
        >
          {generating ? '🤖 生成中...' : '🤖 AI 生成大纲'}
        </button>
      ) : (
        <div className="flex gap-1.5 mb-2">
          <button
            onClick={onGenerateOutline}
            disabled={generating}
            className="flex-1 bg-orange-50 text-orange-600 py-1.5 rounded text-xs hover:bg-orange-100 disabled:opacity-50"
          >
            {generating ? '生成中...' : '🔄 重新生成'}
          </button>
          {onDeleteAll && (
            <button
              onClick={onDeleteAll}
              disabled={deletingAll}
              className="px-2 py-1.5 text-xs text-red-400 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
            >
              {deletingAll ? '...' : '🗑'}
            </button>
          )}
        </div>
      )}

      {/* Chapter list */}
      <div className="flex-1 overflow-y-auto space-y-0.5 pr-1 pb-4" style={{ scrollbarWidth: 'thin', scrollbarGutter: 'stable' }}>
        {filtered.map(ch => (
          <div
            key={ch.id}
            onClick={() => onSelectChapter(ch)}
            className={`group flex items-center gap-1.5 px-2 py-1.5 rounded cursor-pointer transition text-xs ${
              activeChapterId === ch.id
                ? 'bg-orange-100 text-orange-700'
                : 'hover:bg-gray-50 text-gray-700'
            }`}
          >
            <span className="text-[10px] w-4 shrink-0">{statusIcons[ch.status] || '📋'}</span>
            <span className="text-gray-400 w-5 shrink-0 font-mono text-[10px]">{ch.number}.</span>
            <span className="truncate flex-1">{ch.title || `第${ch.number}章`}</span>
            {ch.wordCount > 0 && (
              <span className="text-[10px] text-gray-300 shrink-0">{Math.round(ch.wordCount / 1000)}k</span>
            )}
            {onDeleteChapter && (
              <button
                onClick={e => { e.stopPropagation(); onDeleteChapter(ch.id); }}
                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 text-[10px] shrink-0"
              >
                ✕
              </button>
            )}
          </div>
        ))}
        {filtered.length === 0 && search && (
          <p className="text-xs text-gray-400 text-center py-4">无匹配章节</p>
        )}
      </div>

      {/* Chapter count at bottom */}
      {chapters.length > 0 && (
        <div className="text-[10px] text-gray-400 pt-2 border-t border-gray-100 mt-2">
          总 {(chapters.reduce((s, c) => s + (c.wordCount || 0), 0)).toLocaleString()} 字
        </div>
      )}
    </div>
  );
}
