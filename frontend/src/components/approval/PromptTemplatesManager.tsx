import { useState, useEffect } from 'react';
import { promptTemplates } from '../../api';

interface Template {
  id: string;
  name: string;
  system_prompt: string;
  user_prompt: string;
  version: number;
  is_default: number;
}

interface Version {
  id: string;
  version: number;
  system_prompt: string;
  user_prompt: string;
  created_at: string;
}

interface PromptTemplatesManagerProps {
  currentTemplateId?: string;
  onSelectTemplate: (templateId: string) => void;
}

export default function PromptTemplatesManager({
  currentTemplateId,
  onSelectTemplate,
}: PromptTemplatesManagerProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editName, setEditName] = useState('');
  const [editSystemPrompt, setEditSystemPrompt] = useState('');
  const [editUserPrompt, setEditUserPrompt] = useState('');
  const [showVersions, setShowVersions] = useState(false);
  const [versions, setVersions] = useState<Version[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const { templates: list } = await promptTemplates.list();
      if (list.length === 0) {
        await promptTemplates.initDefaults();
        const { templates: refreshed } = await promptTemplates.list();
        setTemplates(refreshed);
      } else {
        setTemplates(list);
      }
    } catch (err) {
      console.error('Failed to load templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    setEditingTemplate(null);
    setEditName('');
    setEditSystemPrompt('');
    setEditUserPrompt('');
    setShowEditor(true);
  };

  const handleEdit = (template: Template) => {
    setEditingTemplate(template);
    setEditName(template.name);
    setEditSystemPrompt(template.system_prompt);
    setEditUserPrompt(template.user_prompt);
    setShowEditor(true);
  };

  const handleSave = async () => {
    if (!editName.trim()) return;
    try {
      if (editingTemplate) {
        await promptTemplates.update(editingTemplate.id, {
          name: editName,
          systemPrompt: editSystemPrompt,
          userPrompt: editUserPrompt,
        });
      } else {
        await promptTemplates.create({
          name: editName,
          systemPrompt: editSystemPrompt,
          userPrompt: editUserPrompt,
        });
      }
      setShowEditor(false);
      loadTemplates();
    } catch (err) {
      console.error('Failed to save template:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除这个模板？')) return;
    try {
      await promptTemplates.delete(id);
      loadTemplates();
    } catch (err) {
      console.error('Failed to delete template:', err);
    }
  };

  const handleSetDefault = async (template: Template) => {
    try {
      await promptTemplates.update(template.id, { isDefault: true });
      loadTemplates();
    } catch (err) {
      console.error('Failed to set default:', err);
    }
  };

  const handleShowVersions = async (template: Template) => {
    setLoadingVersions(true);
    setShowVersions(true);
    try {
      const { versions: v } = await promptTemplates.get(template.id);
      setVersions(v);
    } catch (err) {
      console.error('Failed to load versions:', err);
    } finally {
      setLoadingVersions(false);
    }
  };

  const handleViewVersion = (version: Version) => {
    setEditingTemplate(null);
    setEditName(showVersions ? `版本 ${version.version} (只读)` : editName);
    setEditSystemPrompt(version.system_prompt);
    setEditUserPrompt(version.user_prompt);
    setShowVersions(false);
    setShowEditor(true);
  };

  if (loading) {
    return <div className="text-xs text-gray-400 p-2">加载中...</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-700">提示词模板</span>
        <button
          onClick={handleCreateNew}
          className="text-xs text-orange-500 hover:text-orange-600"
        >
          + 新建模板
        </button>
      </div>

      <div className="space-y-1 max-h-48 overflow-y-auto">
        {templates.map(t => (
          <div
            key={t.id}
            className={`p-2 rounded text-xs cursor-pointer transition ${
              currentTemplateId === t.id
                ? 'bg-orange-50 border border-orange-200'
                : 'hover:bg-gray-50 border border-transparent'
            }`}
            onClick={() => onSelectTemplate(t.id)}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-700">
                {t.name}
                {t.is_default === 1 && <span className="ml-1 text-orange-400">默认</span>}
              </span>
              <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => handleShowVersions(t)}
                  className="text-gray-400 hover:text-gray-600 px-1"
                  title="版本历史"
                >
                  📜
                </button>
                <button
                  onClick={() => handleEdit(t)}
                  className="text-gray-400 hover:text-blue-600 px-1"
                  title="编辑"
                >
                  ✏️
                </button>
                {t.is_default !== 1 && (
                  <>
                    <button
                      onClick={() => handleSetDefault(t)}
                      className="text-gray-400 hover:text-green-600 px-1"
                      title="设为默认"
                    >
                      ⭐
                    </button>
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="text-gray-400 hover:text-red-600 px-1"
                      title="删除"
                    >
                      🗑
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className="text-[10px] text-gray-400 mt-0.5 truncate">
              v{t.version} · {t.system_prompt.slice(0, 30)}...
            </div>
          </div>
        ))}
      </div>

      {templates.length === 0 && (
        <p className="text-xs text-gray-400 text-center py-2">暂无模板</p>
      )}

      {/* Editor Modal */}
      {showEditor && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">
                {editingTemplate ? '编辑模板' : '新建模板'}
              </h3>
              <button onClick={() => setShowEditor(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">模板名称</label>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-300"
                  placeholder="例如：标准助手"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">System Prompt</label>
                <textarea
                  value={editSystemPrompt}
                  onChange={e => setEditSystemPrompt(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-300 h-32 resize-none font-mono"
                  placeholder="AI 助手的系统提示词..."
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">User Prompt 模板</label>
                <textarea
                  value={editUserPrompt}
                  onChange={e => setEditUserPrompt(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-300 h-24 resize-none font-mono"
                  placeholder="{user_prompt} 将被实际的用户输入替换..."
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  使用 {'{user_prompt}'} 占位实际用户输入
                </p>
              </div>
            </div>
            <div className="px-4 py-3 border-t flex gap-2 justify-end">
              <button
                onClick={() => setShowEditor(false)}
                className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Versions Modal */}
      {showVersions && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">版本历史</h3>
              <button onClick={() => setShowVersions(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {loadingVersions ? (
                <p className="text-xs text-gray-400 text-center py-4">加载中...</p>
              ) : (
                <div className="space-y-2">
                  {versions.map(v => (
                    <div
                      key={v.id}
                      className="p-2 border rounded hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleViewVersion(v)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">版本 {v.version}</span>
                        <span className="text-[10px] text-gray-400">
                          {new Date(v.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-0.5 truncate">
                        {v.system_prompt.slice(0, 50)}...
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}