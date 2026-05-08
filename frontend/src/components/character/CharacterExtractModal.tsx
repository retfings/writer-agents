import { useState, useRef, useEffect, useCallback } from 'react';

interface ChapterInfo {
  id: string;
  number: number;
  title: string;
}

interface ExtractedChar {
  name: string;
  aliases?: string[];
  role?: string;
  occupation?: string;
  appearance?: string;
  personality?: string[];
  relations?: { target: string; relation: string }[];
  summary?: string;
  chapterNumber: number;
  chapterId: string;
  matchType: 'new' | 'merge';
  existingId: string | null;
  existingData?: any;
}

interface Props {
  open: boolean;
  onClose: () => void;
  projectId: string;
  chapters: ChapterInfo[];
  onConfirm: (chars: ExtractedChar[]) => Promise<void>;
}

export default function CharacterExtractModal({ open, onClose, projectId, chapters, onConfirm }: Props) {
  const [selectedChapters, setSelectedChapters] = useState<Set<string>>(new Set());
  const [phase, setPhase] = useState<'select' | 'running' | 'review' | 'saving'>('select');
  const [progress, setProgress] = useState({ current: 0, total: 0, message: '' });
  const [results, setResults] = useState<Map<string, ExtractedChar>>(new Map());
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (open) {
      setPhase('select');
      setResults(new Map());
      setCheckedIds(new Set());
      setWarnings([]);
      setExpandedId(null);
      setSelectedChapters(new Set(chapters.map(c => c.id)));
    }
  }, [open, chapters]);

  const toggleChapter = (id: string) => {
    setSelectedChapters(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAllChapters = () => {
    if (selectedChapters.size === chapters.length) {
      setSelectedChapters(new Set());
    } else {
      setSelectedChapters(new Set(chapters.map(c => c.id)));
    }
  };

  const toggleChar = (key: string) => {
    setCheckedIds(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const toggleAllChars = () => {
    if (checkedIds.size === results.size) {
      setCheckedIds(new Set());
    } else {
      setCheckedIds(new Set(results.keys()));
    }
  };

  const startExtract = useCallback(async () => {
    if (selectedChapters.size === 0) return;
    setPhase('running');
    setResults(new Map());
    setCheckedIds(new Set());
    setWarnings([]);
    setProgress({ current: 0, total: selectedChapters.size, message: '准备中...' });

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`/api/characters/extract/${projectId}/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ chapterIds: [...selectedChapters] }),
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

        // SSE message boundary: double newline
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || ''; // keep incomplete message in buffer

        for (const part of parts) {
          if (!part.trim()) continue;
          let eventType = 'message';
          let dataStr = '';

          for (const line of part.split('\n')) {
            if (line.startsWith('event: ')) {
              eventType = line.slice(7).trim();
            } else if (line.startsWith('data: ')) {
              dataStr = line.slice(6);
            }
          }

          if (!dataStr) continue;

          let data: any;
          try { data = JSON.parse(dataStr); } catch { continue; }

          switch (eventType) {
              case 'progress':
                setProgress(data);
                break;
              case 'character':
                setResults(prev => {
                  const next = new Map(prev);
                  const key = `${data.name}_${data.chapterNumber}`;
                  if (!next.has(key)) {
                    next.set(key, data);
                    setCheckedIds(prev => new Set([...prev, key]));
                  }
                  return next;
                });
                break;
              case 'warn':
                setWarnings(prev => [...prev, data.message]);
                break;
              case 'done':
                break;
              case 'error':
                setWarnings(prev => [...prev, data.message]);
                break;
            }
          }
      }
      setPhase('review');
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setWarnings(prev => [...prev, `提取失败: ${err.message}`]);
        setPhase('review');
      }
    }
  }, [projectId, selectedChapters]);

  const stopExtract = () => {
    abortRef.current?.abort();
    setPhase('review');
  };

  const handleConfirm = async () => {
    setPhase('saving');
    const selected = [...results.entries()]
      .filter(([key]) => checkedIds.has(key))
      .map(([, data]) => data);
    await onConfirm(selected);
    onClose();
  };

  if (!open) return null;

  const newCount = [...results.values()].filter(c => c.matchType === 'new').length;
  const mergeCount = results.size - newCount;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => phase !== 'running' && onClose()}>
      <div className="bg-white rounded-xl shadow-xl max-w-xl w-full max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 shrink-0 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-800">
            {phase === 'select' && '✨ 提取人物'}
            {phase === 'running' && '🔍 正在分析...'}
            {phase === 'review' && `📋 识别到 ${results.size} 个人物`}
            {phase === 'saving' && '💾 保存中...'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg" disabled={phase === 'running' || phase === 'saving'}>✕</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {/* Chapter selection */}
          {phase === 'select' && (
            <>
              <p className="text-sm text-gray-500">选择要扫描的章节，AI 将自动识别人物并匹配已有角色：</p>
              <button onClick={toggleAllChapters} className="text-xs text-orange-500 hover:text-orange-600">
                {selectedChapters.size === chapters.length ? '取消全选' : '全选'}
              </button>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {chapters.map(ch => (
                  <label key={ch.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedChapters.has(ch.id)}
                      onChange={() => toggleChapter(ch.id)}
                      className="w-4 h-4 text-orange-500 rounded"
                    />
                    <span className="text-sm text-gray-700">第{ch.number}章 {ch.title}</span>
                  </label>
                ))}
              </div>
            </>
          )}

          {/* Progress */}
          {phase === 'running' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="animate-spin">⏳</span>
                <span>{progress.message}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
                />
              </div>
              <p className="text-xs text-gray-400">{progress.current} / {progress.total} 章</p>
              <button onClick={stopExtract} className="text-sm text-red-500 hover:text-red-600 border border-red-200 rounded-lg px-3 py-1.5">
                ⏹ 停止
              </button>
            </div>
          )}

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="text-xs text-orange-600 bg-orange-50 rounded-lg px-3 py-2">
              {warnings.map((w, i) => <p key={i}>{w}</p>)}
            </div>
          )}

          {/* Results */}
          {phase === 'review' && results.size > 0 && (
            <>
              <div className="flex items-center justify-between text-xs">
                <span>
                  🆕 新增 {newCount} 个 · 🔄 合并 {mergeCount} 个
                </span>
                <button onClick={toggleAllChars} className="text-orange-500 hover:text-orange-600">
                  {checkedIds.size === results.size ? '取消全选' : '全选'}
                </button>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {[...results.entries()].map(([key, char]) => (
                  <div
                    key={key}
                    className={`border rounded-lg px-3 py-2.5 transition cursor-pointer ${
                      checkedIds.has(key) ? 'border-orange-300 bg-orange-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => toggleChar(key)}
                  >
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={checkedIds.has(key)}
                        onChange={() => toggleChar(key)}
                        className="w-4 h-4 text-orange-500 rounded mt-0.5 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-gray-800">{char.name}</span>
                          {char.matchType === 'new' ? (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-600">🆕 新增</span>
                          ) : (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-600">🔄 合并</span>
                          )}
                          {char.role && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">{char.role}</span>
                          )}
                          <span className="text-[10px] text-gray-400 ml-auto">第{char.chapterNumber}章</span>
                        </div>
                        
                        {/* Preview */}
                        <div className="text-xs text-gray-500 line-clamp-2 mb-1">
                          {char.occupation && <span className="mr-2">💼 {char.occupation}</span>}
                          {char.personality?.map((t, i) => (
                            <span key={i} className="mr-1 text-[10px] px-1 py-0.5 rounded bg-gray-100 text-gray-500">{t}</span>
                          ))}
                        </div>
                        {char.summary && <p className="text-xs text-gray-400">{char.summary}</p>}

                        {/* Expand details */}
                        {expandedId === key && (
                          <div className="mt-2 pt-2 border-t border-gray-100 text-xs space-y-1">
                            {char.aliases && char.aliases.length > 0 && <p>👤 别名：{char.aliases.join('、')}</p>}
                            {char.appearance && <p>👁 外貌：{char.appearance}</p>}
                            {char.relations && char.relations.length > 0 && (
                              <p>🤝 关系：{char.relations.map(r => `${r.target}(${r.relation})`).join('、')}</p>
                            )}
                            {char.matchType === 'merge' && char.existingData && (
                              <div className="mt-1 text-[10px] text-blue-500 bg-blue-50 rounded px-2 py-1">
                                将与已有角色「{char.name}」合并（保留已有描述，补充新信息）
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); setExpandedId(expandedId === key ? null : key); }}
                        className="text-gray-300 hover:text-gray-500 text-xs shrink-0"
                      >
                        {expandedId === key ? '收起' : '展开'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Saving */}
          {phase === 'saving' && (
            <div className="text-center py-8">
              <span className="animate-spin text-2xl">⏳</span>
              <p className="text-sm text-gray-500 mt-2">正在保存...</p>
            </div>
          )}
        </div>

        {/* Footer */}
        {phase !== 'running' && phase !== 'saving' && (
          <div className="px-5 py-3 border-t border-gray-200 shrink-0 flex items-center gap-2">
            {phase === 'select' ? (
              <>
                <button onClick={onClose} className="flex-1 text-sm text-gray-500 hover:text-gray-700 py-2">取消</button>
                <button
                  onClick={startExtract}
                  disabled={selectedChapters.size === 0}
                  className="flex-1 bg-orange-500 text-white text-sm py-2 rounded-lg font-medium hover:bg-orange-600 disabled:opacity-40"
                >
                  开始提取
                </button>
              </>
            ) : (
              <>
                <button onClick={onClose} className="flex-1 text-sm text-gray-500 hover:text-gray-700 py-2">取消</button>
                <button
                  onClick={handleConfirm}
                  disabled={checkedIds.size === 0}
                  className="flex-1 bg-orange-500 text-white text-sm py-2 rounded-lg font-medium hover:bg-orange-600 disabled:opacity-40"
                >
                  保存选中的 ({checkedIds.size})
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
