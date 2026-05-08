import { useState } from 'react';

interface CharacterItem {
  id: string;
  name: string;
  role: string;
  description: string;
  traits: string[];
  relationships?: Array<{ withName: string; relation: string; dynamic: string }>;
  arc?: string;
}

interface Props {
  characters: CharacterItem[];
  onAdd: (data: any) => Promise<void>;
  onExtract?: () => void;
}

const colorPool = ['#FF6B6B','#4ECDC4','#45B7D1','#96CEB4','#FFEAA7','#DDA0DD','#98D8C8','#F7DC6F','#BB8FCE','#85C1E9'];

export default function CharacterPanel({ characters, onAdd, onExtract }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', role: '', description: '', traits: '' });
  const [expanded, setExpanded] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    await onAdd({
      name: form.name,
      role: form.role,
      description: form.description,
      traits: form.traits.split(/[,，、]/).filter(Boolean),
    });
    setForm({ name: '', role: '', description: '', traits: '' });
    setShowForm(false);
  };

  return (
    <div className="flex flex-col h-full p-3 select-none">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-gray-800 text-sm">👤 人物角色</h3>
        <div className="flex items-center gap-2">
          {onExtract && (
            <button onClick={onExtract} className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-500 hover:bg-purple-100" title="AI 提取人物">
              ✨ 提取
            </button>
          )}
          <button onClick={() => setShowForm(!showForm)} className="text-xs text-orange-500 hover:text-orange-600">
            + 添加
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-2 p-2 bg-gray-50 rounded space-y-1.5">
          <input
            type="text" placeholder="角色名" value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            className="w-full px-2 py-1 border rounded text-xs" required
          />
          <input
            type="text" placeholder="身份（主角/反派/配角）" value={form.role}
            onChange={e => setForm({ ...form, role: e.target.value })}
            className="w-full px-2 py-1 border rounded text-xs"
          />
          <textarea
            placeholder="角色描述" value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            className="w-full px-2 py-1 border rounded text-xs resize-none" rows={2}
          />
          <input
            type="text" placeholder="性格特点（逗号分隔）" value={form.traits}
            onChange={e => setForm({ ...form, traits: e.target.value })}
            className="w-full px-2 py-1 border rounded text-xs"
          />
          <div className="flex gap-1 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="text-gray-400 px-2 py-1 text-xs">取消</button>
            <button type="submit" className="bg-orange-500 text-white px-3 py-1 rounded text-xs">添加</button>
          </div>
        </form>
      )}

      <div className="flex-1 overflow-y-auto space-y-1.5">
        {characters.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">暂无角色</p>
        ) : (
          characters.map((c, i) => (
            <div key={c.id} className="border border-gray-100 rounded-lg overflow-hidden">
              <div
                onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                className="flex items-center gap-2 p-2 cursor-pointer hover:bg-gray-50"
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ backgroundColor: colorPool[i % colorPool.length] }}
                >
                  {c.name[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-gray-700 truncate">{c.name}</div>
                  {c.role && <div className="text-[10px] text-gray-400">{c.role}</div>}
                </div>
                <span className="text-[10px] text-gray-300">{expanded === c.id ? '▲' : '▼'}</span>
              </div>
              {expanded === c.id && (
                <div className="px-3 pb-2 space-y-1.5 text-xs">
                  {c.description && (
                    <p className="text-gray-600 leading-relaxed">{c.description}</p>
                  )}
                  {c.traits && c.traits.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {c.traits.map((t, j) => (
                        <span key={j} className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-[10px]">{t}</span>
                      ))}
                    </div>
                  )}
                  {c.arc && (
                    <p className="text-gray-500 text-[10px] italic">📖 {c.arc}</p>
                  )}
                  {c.relationships && c.relationships.length > 0 && (
                    <div>
                      <p className="text-[10px] text-gray-400 mb-0.5">关系：</p>
                      {c.relationships.map((r, j) => (
                        <div key={j} className="text-[10px] text-gray-500 ml-2">
                          → {r.withName}：{r.relation}{r.dynamic ? `（${r.dynamic}）` : ''}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
