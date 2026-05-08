import { useState, useCallback, useRef } from 'react';

interface ChapterInfo {
  id: string;
  number: number;
  title: string;
}

type ExtractType = 'foreshadowing' | 'conflicts' | 'suspense' | 'structure';

const typeMeta: Record<ExtractType, { label: string; icon: string; desc: string; color: string; bgColor: string }> = {
  foreshadowing: { label: '伏笔', icon: '🔮', desc: '发现埋藏的伏笔线索和暗示', color: 'text-purple-600', bgColor: 'bg-purple-50' },
  conflicts: { label: '冲突', icon: '⚔️', desc: '识别人物内部与外部冲突', color: 'text-red-600', bgColor: 'bg-red-50' },
  suspense: { label: '悬念', icon: '🎣', desc: '分析悬疑、断章和读者期待', color: 'text-blue-600', bgColor: 'bg-blue-50' },
  structure: { label: '结构', icon: '📐', desc: '分析章节在故事结构中的功能', color: 'text-green-600', bgColor: 'bg-green-50' },
};

interface Props {
  projectId: string;
  chapters: ChapterInfo[];
}

interface ExtractedItem {
  title: string;
  description: string;
  type?: string;
  chapterId: string;
  chapterNumber: number;
  _idx: number;
  [key: string]: any;
}

export default function AnalysisPanel({ projectId, chapters }: Props) {
  const [extracting, setExtracting] = useState<ExtractType | null>(null);
  const [results, setResults] = useState<Record<ExtractType, ExtractedItem[]>>({
    foreshadowing: [], conflicts: [], suspense: [], structure: [],
  });
  const [progress, setProgress] = useState({ current: 0, total: 0, message: '' });
  const [selectedChapters, setSelectedChapters] = useState<Set<string>>(new Set(chapters.map(c => c.id)));
  const [showChapterPicker, setShowChapterPicker] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<ExtractType>>(new Set());
  const abortRef = useRef<AbortController | null>(null);

  const toggleChapter = (id: string) => {
    setSelectedChapters(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSection = (type: ExtractType) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      next.has(type) ? next.delete(type) : next.add(type);
      return next;
    });
  };

  const startExtract = useCallback(async (extractTypes: ExtractType[]) => {
    if (selectedChapters.size === 0 || extractTypes.length === 0) return;
    setExtracting(extractTypes[0]); // show first type as active
    setResults(prev => {
      const next = { ...prev };
      for (const t of extractTypes) next[t] = [];
      return next;
    });
    setProgress({ current: 0, total: selectedChapters.size, message: '准备中...' });
    setShowChapterPicker(false);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`/api/analysis/extract/${projectId}/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ chapterIds: [...selectedChapters], types: extractTypes }),
        signal: controller.signal,
      });

      if (!res.ok) throw new Error('请求失败');
      const reader = res.body?.getReader();
      if (!reader) throw new Error('无法读取响应');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';

        for (const part of parts) {
          if (!part.trim()) continue;
          let eventType = 'message';
          let dataStr = '';
          for (const line of part.split('\n')) {
            if (line.startsWith('event: ')) eventType = line.slice(7).trim();
            else if (line.startsWith('data: ')) dataStr = line.slice(6);
          }
          if (!dataStr) continue;
          let data: any;
          try { data = JSON.parse(dataStr); } catch { continue; }

          if (eventType === 'progress') {
            setProgress(data);
          } else if (extractTypes.includes(eventType as ExtractType)) {
            setResults(prev => {
              const next = { ...prev };
              next[eventType as ExtractType] = [...(next[eventType as ExtractType] || []), data];
              return next;
            });
          } else if (eventType === 'keepalive') {
            // no-op
          } else if (eventType === 'warn') {
            console.warn('[Analysis]', data.message);
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') console.error('[Analysis]', err.message);
    } finally {
      setExtracting(null);
    }
  }, [projectId, selectedChapters]);

  const stopExtract = () => {
    abortRef.current?.abort();
    setExtracting(null);
  };

  const extractAll = () => {
    startExtract(['foreshadowing', 'conflicts', 'suspense', 'structure']);
  };

  const totalItems = Object.values(results).reduce((s, arr) => s + arr.length, 0);

  return (
    <div className="flex flex-col h-full p-3 select-none">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-gray-800 text-sm">🔍 AI 分析</h3>
        <span className="text-[10px] text-gray-400">{totalItems} 条</span>
      </div>

      {/* Extract buttons */}
      <div className="space-y-2 mb-3">
        <button
          onClick={extractAll}
          disabled={!!extracting || chapters.length === 0}
          className="w-full bg-orange-500 text-white py-2 rounded-lg text-xs font-medium hover:bg-orange-600 disabled:opacity-50"
        >
          {extracting ? '🤖 分析中...' : '✨ 一键全部分析'}
        </button>
        <div className="grid grid-cols-2 gap-1.5">
          {(Object.entries(typeMeta) as [ExtractType, typeof typeMeta[ExtractType]][]).map(([type, meta]) => (
            <button
              key={type}
              onClick={() => startExtract([type])}
              disabled={!!extracting || chapters.length === 0}
              className={`${meta.bgColor} ${meta.color} py-1.5 rounded text-[10px] flex items-center justify-center gap-1 hover:opacity-80 disabled:opacity-40`}
            >
              {meta.icon} {meta.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowChapterPicker(!showChapterPicker)}
          className="w-full text-[10px] text-gray-400 hover:text-gray-600 flex items-center justify-center gap-1"
        >
          📖 已选 {selectedChapters.size}/{chapters.length} 章 {showChapterPicker ? '▲' : '▼'}
        </button>
      </div>

      {/* Chapter picker */}
      {showChapterPicker && (
        <div className="mb-2 bg-gray-50 rounded p-2 max-h-32 overflow-y-auto space-y-0.5">
          <div className="flex gap-1 mb-1">
            <button
              onClick={() => setSelectedChapters(new Set(chapters.map(c => c.id)))}
              className="text-[9px] text-orange-500 hover:text-orange-600"
            >
              全选
            </button>
            <button
              onClick={() => setSelectedChapters(new Set())}
              className="text-[9px] text-gray-400 hover:text-gray-600"
            >
              取消
            </button>
          </div>
          {chapters.map(ch => (
            <label key={ch.id} className="flex items-center gap-1.5 text-[10px] cursor-pointer">
              <input
                type="checkbox"
                checked={selectedChapters.has(ch.id)}
                onChange={() => toggleChapter(ch.id)}
                className="w-3 h-3"
              />
              <span className="truncate">第{ch.number}章 {ch.title}</span>
            </label>
          ))}
        </div>
      )}

      {/* Progress */}
      {extracting && (
        <div className="mb-2 text-[10px] text-gray-500 bg-gray-50 rounded p-2">
          <div className="flex items-center justify-between">
            <span>{progress.message}</span>
            <button onClick={stopExtract} className="text-red-400 hover:text-red-600">停止</button>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1 overflow-hidden">
            <div className="bg-orange-500 h-1.5 rounded-full transition-all" style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }} />
          </div>
        </div>
      )}

      {/* Results */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {(Object.entries(typeMeta) as [ExtractType, typeof typeMeta[ExtractType]][]).map(([type, meta]) => {
          const items = results[type] || [];
          if (items.length === 0) return null;
          const isExpanded = expandedSections.has(type);
          return (
            <div key={type} className="border border-gray-100 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection(type)}
                className={`w-full flex items-center justify-between px-2 py-1.5 ${meta.bgColor} text-[10px]`}
              >
                <span className={`font-medium ${meta.color}`}>
                  {meta.icon} {meta.label} ({items.length})
                </span>
                <span className="text-gray-400">{isExpanded ? '▲' : '▼'}</span>
              </button>
              {isExpanded && (
                <div className="p-1.5 space-y-1">
                  {items.map((item, idx) => (
                    <div key={`${type}-${idx}`} className="bg-gray-50 rounded p-1.5 text-[10px]">
                      <div className="font-medium text-gray-700">{item.title}</div>
                      {item.description && (
                        <p className="text-gray-500 mt-0.5 leading-relaxed">{item.description.slice(0, 150)}</p>
                      )}
                      <div className="flex gap-2 mt-1 text-[9px] text-gray-400">
                        <span>第{item.chapterNumber}章</span>
                        {item.type && <span>· {item.type}</span>}
                        {item.intensity && <span>· {item.intensity}</span>}
                        {item.element && <span>· {item.element}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {totalItems === 0 && !extracting && (
          <p className="text-[10px] text-gray-400 text-center py-4">点击上方按钮开始 AI 分析</p>
        )}
      </div>
    </div>
  );
}
