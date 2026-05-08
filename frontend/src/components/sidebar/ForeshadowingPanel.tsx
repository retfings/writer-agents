import { useState } from 'react';

interface ForeshadowingItem {
  id: string;
  title: string;
  description: string;
  plantedChapterId: string | null;
  revealedChapterId: string | null;
  status: string;
}

interface Props {
  items: ForeshadowingItem[];
  chapterTitles: Record<string, string>;
  onAdd: (data: any) => Promise<void>;
  onToggle: (id: string, status: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export default function ForeshadowingPanel({ items, chapterTitles, onAdd, onToggle, onDelete }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    await onAdd({ title: form.title, description: form.description });
    setForm({ title: '', description: '' });
    setShowForm(false);
  };

  const pending = items.filter(i => i.status !== 'revealed');
  const revealed = items.filter(i => i.status === 'revealed');

  return (
    <div className="flex flex-col h-full p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-gray-800 text-sm">🔮 伏笔线索</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-xs text-orange-500 hover:text-orange-600"
        >
          + 添加
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-2 p-2 bg-gray-50 rounded space-y-1.5">
          <input
            type="text" placeholder="伏笔名称" value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
            className="w-full px-2 py-1 border rounded text-xs" required
          />
          <textarea
            placeholder="详细描述" value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            className="w-full px-2 py-1 border rounded text-xs resize-none" rows={2}
          />
          <div className="flex gap-1 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="text-gray-400 px-2 py-1 text-xs">取消</button>
            <button type="submit" className="bg-orange-500 text-white px-3 py-1 rounded text-xs">添加</button>
          </div>
        </form>
      )}

      <div className="flex-1 overflow-y-auto space-y-2">
        {pending.length === 0 && revealed.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">暂无伏笔</p>
        ) : (
          <>
            {pending.length > 0 && (
              <div>
                <p className="text-[10px] text-gray-400 mb-1">🟡 未揭晓 ({pending.length})</p>
                {pending.map(item => (
                  <div key={item.id} className="bg-yellow-50 rounded p-2 mb-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-700">{item.title}</span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => onToggle(item.id, 'revealed')}
                          className="text-[10px] text-green-500 hover:text-green-700"
                          title="标记为已揭晓"
                        >
                          ✅
                        </button>
                        <button
                          onClick={() => onDelete(item.id)}
                          className="text-[10px] text-gray-400 hover:text-red-500"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                    {item.description && (
                      <p className="text-gray-500 mt-0.5 text-[10px]">{item.description.slice(0, 120)}</p>
                    )}
                    {item.plantedChapterId && chapterTitles[item.plantedChapterId] && (
                      <p className="text-[9px] text-gray-400 mt-0.5">📌 {chapterTitles[item.plantedChapterId]}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
            {revealed.length > 0 && (
              <div>
                <p className="text-[10px] text-gray-400 mb-1">✅ 已揭晓 ({revealed.length})</p>
                {revealed.map(item => (
                  <div key={item.id} className="bg-green-50 rounded p-2 mb-1 text-xs opacity-70">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-500 line-through">{item.title}</span>
                      <button
                        onClick={() => onToggle(item.id, 'pending')}
                        className="text-[10px] text-gray-400 hover:text-yellow-500"
                        title="取消揭晓"
                      >
                        ↩️
                      </button>
                    </div>
                    {item.description && (
                      <p className="text-gray-400 mt-0.5 text-[10px]">{item.description.slice(0, 120)}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
