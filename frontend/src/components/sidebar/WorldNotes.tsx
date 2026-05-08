import { useState } from 'react';

interface NoteItem {
  id: string;
  title: string;
  content: string;
  category: string;
}

interface Props {
  notes: NoteItem[];
  onAdd: (data: any) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const categories: Record<string, string> = {
  general: '📝 通用',
  geography: '🗺️ 地理',
  faction: '⚔️ 势力',
  magic: '✨ 功法',
  history: '📜 历史',
  economy: '💰 经济',
  culture: '🎭 文化',
  other: '📌 其他',
};

export default function WorldNotes({ notes, onAdd, onDelete }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', category: 'general' });
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    await onAdd({ title: form.title, content: form.content, category: form.category });
    setForm({ title: '', content: '', category: 'general' });
    setShowForm(false);
  };

  const filtered = filter ? notes.filter(n => n.category === filter) : notes;

  return (
    <div className="flex flex-col h-full p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-gray-800 text-sm">🌍 世界观笔记</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-xs text-orange-500 hover:text-orange-600"
        >
          + 添加
        </button>
      </div>

      {/* Category filter */}
      {notes.length > 0 && (
        <div className="flex flex-wrap gap-0.5 mb-2">
          <button
            onClick={() => setFilter(null)}
            className={`text-[9px] px-1.5 py-0.5 rounded-full ${!filter ? 'bg-orange-100 text-orange-600' : 'bg-gray-50 text-gray-500'}`}
          >
            全部
          </button>
          {Object.entries(categories).map(([k, v]) => {
            const count = notes.filter(n => n.category === k).length;
            if (count === 0) return null;
            return (
              <button
                key={k}
                onClick={() => setFilter(k === filter ? null : k)}
                className={`text-[9px] px-1.5 py-0.5 rounded-full ${filter === k ? 'bg-orange-100 text-orange-600' : 'bg-gray-50 text-gray-500'}`}
              >
                {v.split(' ')[1]}({count})
              </button>
            );
          })}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-2 p-2 bg-gray-50 rounded space-y-1.5">
          <input
            type="text" placeholder="笔记标题" value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
            className="w-full px-2 py-1 border rounded text-xs" required
          />
          <select
            value={form.category}
            onChange={e => setForm({ ...form, category: e.target.value })}
            className="w-full px-2 py-1 border rounded text-xs bg-white"
          >
            {Object.entries(categories).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <textarea
            placeholder="笔记内容" value={form.content}
            onChange={e => setForm({ ...form, content: e.target.value })}
            className="w-full px-2 py-1 border rounded text-xs resize-none" rows={2}
          />
          <div className="flex gap-1 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="text-gray-400 px-2 py-1 text-xs">取消</button>
            <button type="submit" className="bg-orange-500 text-white px-3 py-1 rounded text-xs">添加</button>
          </div>
        </form>
      )}

      <div className="flex-1 overflow-y-auto space-y-1">
        {filtered.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">
            {notes.length === 0 ? '暂无笔记，记录你的世界观设定' : '该分类下暂无笔记'}
          </p>
        ) : (
          filtered.map(note => (
            <div key={note.id} className="border border-gray-100 rounded overflow-hidden">
              <div
                onClick={() => setExpanded(expanded === note.id ? null : note.id)}
                className="flex items-center gap-1.5 p-2 cursor-pointer hover:bg-gray-50"
              >
                <span className="text-[10px]">{categories[note.category]?.split(' ')[0] || '📝'}</span>
                <span className="text-xs text-gray-700 truncate flex-1">{note.title}</span>
              </div>
              {expanded === note.id && (
                <div className="px-3 pb-2">
                  <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">{note.content}</p>
                  <div className="flex gap-1 mt-1.5 justify-end">
                    <button
                      onClick={() => onDelete(note.id)}
                      className="text-[10px] text-gray-400 hover:text-red-500"
                    >
                      删除
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
