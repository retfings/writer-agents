import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { projects } from '../api';
import PromptTemplateInput from '../components/PromptTemplateInput';

const genreNames: Record<string, string> = {
  urban: '都市', fantasy: '玄幻', xianxia: '仙侠', scifi: '科幻',
  historical: '历史', romance: '言情', suspense: '悬疑',
};

const statusNames: Record<string, string> = {
  draft: '草稿', writing: '创作中', completed: '已完成', published: '已发布',
};

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [projectList, setProjectList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [aiStep, setAiStep] = useState<'prompt' | 'generating' | 'form'>('prompt');
  const [storyIdea, setStoryIdea] = useState('');
  const [aiResult, setAiResult] = useState<any>(null);
  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState('urban');
  const [synopsis, setSynopsis] = useState('');
  const [fullSynopsis, setFullSynopsis] = useState('');
  const [targetWords, setTargetWords] = useState(100000);
  const [totalChapters, setTotalChapters] = useState(50);
  const [error, setError] = useState('');
  const [generatingStep, setGeneratingStep] = useState<'thinking' | 'titles' | 'synopsis' | 'done'>('thinking');
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => { loadProjects(); }, []);

  useEffect(() => {
    if (aiStep !== 'generating') return;

    const steps: Array<'thinking' | 'titles' | 'synopsis' | 'done'> = ['thinking', 'titles', 'synopsis', 'done'];
    let currentIndex = 0;

    const interval = setInterval(() => {
      if (currentIndex < steps.length - 1) {
        currentIndex++;
        setGeneratingStep(steps[currentIndex]);
      } else {
        clearInterval(interval);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [aiStep]);

  const loadProjects = async () => {
    try {
      const { projects: list } = await projects.list();
      setProjectList(list);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAiGenerate = async () => {
    if (!storyIdea.trim() || storyIdea.trim().length < 3) {
      setError('请至少输入3个字的故事创意');
      return;
    }
    setError('');
    setGeneratingStep('thinking');
    setAiStep('generating');

    const controller = new AbortController();
    controllerRef.current = controller;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/projects/generate-idea', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ prompt: storyIdea.trim() }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '生成失败');
      }

      const result = await response.json();

      if (controllerRef.current !== controller) return;

      setGeneratingStep('done');
      setAiResult(result);
      setTitle(result.titles[0] || '');
      setGenre(result.genre || 'urban');
      setSynopsis(result.synopsis || '');
      setFullSynopsis(result.fullSynopsis || '');

      setTimeout(() => {
        if (controllerRef.current === controller) {
          setAiStep('form');
        }
      }, 500);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return;
      }
      if (controllerRef.current !== controller) return;
      setError(err.message);
      setAiStep('prompt');
    } finally {
      if (controllerRef.current === controller) {
        controllerRef.current = null;
      }
    }
  };

  const handleCancelGenerate = () => {
    if (controllerRef.current) {
      controllerRef.current.abort();
      controllerRef.current = null;
    }
    setAiStep('prompt');
    setGeneratingStep('thinking');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      const { project } = await projects.create({ title, genre, synopsis: fullSynopsis || synopsis, targetWords, totalChapters });
      setShowCreate(false);
      setStoryIdea('');
      setAiResult(null);
      setAiStep('prompt');
      setTitle('');
      setSynopsis('');
      setFullSynopsis('');
      navigate(`/project/${project.id}`);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('确定删除这个项目？')) return;
    await projects.delete(id);
    loadProjects();
  };

  const resetForm = () => {
    setShowCreate(false);
    setAiStep('prompt');
    setStoryIdea('');
    setAiResult(null);
    setTitle('');
    setSynopsis('');
    setFullSynopsis('');
    setError('');
  };

  return (
    <div className="h-full bg-gray-50 overflow-auto">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <span className="text-2xl sm:text-3xl shrink-0">✍️</span>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-gray-800 truncate">NovelFlow</h1>
              <p className="text-[11px] sm:text-xs text-gray-500 hidden sm:block">多智能体 AI 写作平台</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <a href="https://github.com/retfings/writer-agents" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-orange-500 transition" title="GitHub">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
            </a>
            <span className="text-xs sm:text-sm text-gray-600 hidden sm:inline">{user?.displayName}</span>
            <button onClick={logout} className="text-xs sm:text-sm text-gray-500 hover:text-red-500 px-2 sm:px-3 py-1.5 sm:py-1 rounded-lg hover:bg-red-50 transition min-h-[36px] sm:min-h-[32px]">退出</button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800">我的项目</h2>
          <button onClick={() => setShowCreate(true)} className="bg-orange-500 text-white px-3 sm:px-4 py-2 sm:py-2 rounded-lg text-sm sm:text-base font-medium hover:bg-orange-600 transition min-h-[40px] sm:min-h-[36px]">+ 新建</button>
        </div>

        {error && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}

        {/* Create Project Modal */}
        {showCreate && (
          <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 mb-4 sm:mb-6">
            <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">
              {aiStep === 'prompt' ? '🤖 AI 智能起名' : aiStep === 'generating' ? '✍️ AI 正在创作...' : '📝 确认项目信息'}
            </h3>

            {/* Step 1: AI Prompt with templates */}
            {aiStep === 'prompt' && (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  告诉 AI 你想写什么故事，它帮你起书名、写简介、选分类——
                  <span className="text-orange-500 font-medium">番茄平台商业文风格</span>
                </p>
                <PromptTemplateInput
                  value={storyIdea}
                  onChange={setStoryIdea}
                  onSubmit={handleAiGenerate}
                />
                <div className="flex gap-3">
                  <button
                    onClick={handleAiGenerate}
                    disabled={!storyIdea.trim() || storyIdea.trim().length < 3}
                    className="bg-orange-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-40 min-h-[44px] sm:min-h-[40px] flex items-center gap-1.5"
                  >
                    🚀 一键生成
                  </button>
                  <button onClick={resetForm} className="text-gray-500 px-4 py-2.5 rounded-lg text-sm hover:bg-gray-100 min-h-[44px] sm:min-h-[40px]">取消</button>
                  <button onClick={() => { setAiStep('form'); setTitle(''); setSynopsis(''); setGenre('urban'); setTargetWords(100000); setTotalChapters(50); }} className="text-gray-400 px-3 py-2.5 rounded-lg text-xs hover:bg-gray-50 ml-auto min-h-[44px] sm:min-h-[40px]">手动创建 →</button>
                </div>
              </div>
            )}

            {/* Step 2: Generating */}
            {aiStep === 'generating' && (
              <div className="flex flex-col items-center gap-5 py-8">
                <div className="relative">
                  <span className="text-5xl animate-bounce">✍️</span>
                  <span className="absolute -top-2 -right-2 text-orange-400 animate-pulse">
                    {generatingStep === 'thinking' ? '💭' : generatingStep === 'titles' ? '📚' : generatingStep === 'synopsis' ? '✨' : '✅'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className={`text-sm ${generatingStep === 'thinking' ? 'text-orange-500 font-semibold' : 'text-gray-400'}`}>
                    思考中
                  </span>
                  <span className="text-gray-300">→</span>
                  <span className={`text-sm ${generatingStep === 'titles' ? 'text-orange-500 font-semibold' : generatingStep === 'synopsis' || generatingStep === 'done' ? 'text-gray-800' : 'text-gray-400'}`}>
                    生成书名
                  </span>
                  <span className="text-gray-300">→</span>
                  <span className={`text-sm ${generatingStep === 'synopsis' ? 'text-orange-500 font-semibold' : generatingStep === 'done' ? 'text-gray-800' : 'text-gray-400'}`}>
                    撰写简介
                  </span>
                  <span className="text-gray-300">→</span>
                  <span className={`text-sm ${generatingStep === 'done' ? 'text-green-500 font-semibold' : 'text-gray-400'}`}>
                    完成
                  </span>
                </div>

                <div className="h-1.5 w-64 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full transition-all duration-500"
                    style={{
                      width: generatingStep === 'thinking' ? '15%' : generatingStep === 'titles' ? '45%' : generatingStep === 'synopsis' ? '75%' : '100%',
                    }}
                  />
                </div>

                <button
                  onClick={handleCancelGenerate}
                  className="text-xs text-gray-400 hover:text-red-500 transition"
                >
                  取消
                </button>
              </div>
            )}

            {/* Step 3: Form with AI result */}
            {aiStep === 'form' && (
              <form onSubmit={handleCreate} className="space-y-3 sm:space-y-4">
                {/* AI Title Picker */}
                {aiResult?.titles && aiResult.titles.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      🤖 AI 推荐书名（点击选择）
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {aiResult.titles.map((t: string, i: number) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setTitle(t)}
                          className={`px-3 py-1.5 rounded-full text-xs sm:text-sm border transition font-medium ${
                            title === t
                              ? 'bg-orange-500 text-white border-orange-500'
                              : 'bg-white text-gray-700 border-gray-200 hover:border-orange-300'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                    <div className="mt-2">
                      <label className="block text-xs text-gray-400 mb-1">或手动输入</label>
                      <input
                        type="text" value={title}
                        onChange={e => setTitle(e.target.value)}
                        className="w-full px-4 py-3 sm:py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-orange-500 text-base sm:text-sm"
                        required placeholder="输入书名"
                      />
                    </div>
                  </div>
                )}

                {/* Manual Title Input (when no AI result) */}
                {!aiResult && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">书名</label>
                    <input
                      type="text" value={title}
                      onChange={e => setTitle(e.target.value)}
                      className="w-full px-4 py-3 sm:py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-orange-500 text-base sm:text-sm"
                      required placeholder="输入书名"
                    />
                  </div>
                )}

                {/* Genre */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    分类
                  </label>
                  <select value={genre} onChange={e => setGenre(e.target.value)}
                    className="w-full px-4 py-3 sm:py-2.5 border border-gray-300 rounded-lg outline-none text-sm bg-white">
                    {Object.entries(genreNames).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>

                {/* Synopsis */}
                {aiResult && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">一句话简介（番茄风格）</label>
                      <input
                        type="text" value={synopsis}
                        onChange={e => setSynopsis(e.target.value)}
                        className="w-full px-4 py-3 sm:py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                        placeholder="一句话钩子简介"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">详细简介</label>
                      <textarea value={fullSynopsis} onChange={e => setFullSynopsis(e.target.value)}
                        className="w-full px-4 py-3 sm:py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-orange-500 text-sm resize-none" rows={3}
                      />
                    </div>
                  </>
                )}

                {/* Target config */}
                <div className="bg-gray-50 rounded-lg p-3 sm:p-4 space-y-3">
                  <p className="text-xs text-gray-500 font-medium">⚙️ 生成配置</p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 mb-1">目标总字数</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={targetWords / 10000}
                          onChange={e => { const v = Number(e.target.value); if (v > 0) setTargetWords(v * 10000); }}
                          className="w-20 px-3 py-2 sm:py-1.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-orange-500 text-sm text-center"
                          min={1} max={1000}
                        />
                        <span className="text-sm text-gray-400">万字</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 mb-1">生成章数</label>
                      <div className="flex items-center gap-2">
                        <select
                          value={totalChapters}
                          onChange={e => setTotalChapters(Number(e.target.value))}
                          className="px-3 py-2 sm:py-1.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-orange-500 text-sm bg-white"
                        >
                          {[50, 100, 150, 200, 250, 300, 400, 500, 600, 800, 1000].map(n => (
                            <option key={n} value={n}>{n} 章</option>
                          ))}
                        </select>
                        <span className="text-xs text-gray-400">
                          约 {(targetWords / totalChapters).toFixed(0)} 字/章
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tags & Selling Points (info only) */}
                {aiResult?.tags && aiResult.tags.length > 0 && (
                  <div className="bg-orange-50 rounded-lg p-3">
                    <p className="text-xs text-orange-700 mb-1.5">
                      <span className="font-medium">标签：</span>
                      {aiResult.tags.map((t: string, i: number) => (
                        <span key={i} className="inline-block bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-xs mr-1 mb-1">{t}</span>
                      ))}
                    </p>
                    {aiResult.sellingPoints?.length > 0 && (
                      <p className="text-xs text-gray-600">
                        <span className="font-medium">卖点：</span>
                        {aiResult.sellingPoints.join('、')}
                      </p>
                    )}
                    {aiResult.targetAudience && (
                      <p className="text-xs text-gray-500 mt-1">目标读者：{aiResult.targetAudience}</p>
                    )}
                  </div>
                )}

                <div className="flex gap-3">
                  <button type="submit"
                    className="bg-orange-500 text-white px-5 sm:px-6 py-2.5 sm:py-2 rounded-lg text-sm sm:text-base font-medium hover:bg-orange-600 min-h-[44px] sm:min-h-[40px]">
                    创建项目
                  </button>
                  <button type="button" onClick={resetForm}
                    className="text-gray-500 px-5 sm:px-6 py-2.5 sm:py-2 rounded-lg text-sm sm:text-base hover:bg-gray-100 min-h-[44px] sm:min-h-[40px]">取消</button>
                </div>
              </form>
            )}
          </div>
        )}

        {loading ? (
          <div className="text-center py-16 sm:py-20 text-gray-400 text-sm sm:text-base">加载中...</div>
        ) : projectList.length === 0 ? (
          <div className="text-center py-12 sm:py-20">
            <div className="text-5xl sm:text-6xl mb-3 sm:mb-4">📝</div>
            <p className="text-sm sm:text-base text-gray-500 mb-4">还没有项目，创建你的第一本小说吧！</p>
            <button onClick={() => setShowCreate(true)}
              className="bg-orange-500 text-white px-5 sm:px-6 py-2.5 sm:py-2 rounded-lg text-sm sm:text-base font-medium hover:bg-orange-600 min-h-[44px] sm:min-h-[40px]">开始创作</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {projectList.map(p => (
              <div key={p.id}
                className="bg-white rounded-xl shadow-sm hover:shadow-md active:scale-[0.98] transition cursor-pointer p-4 sm:p-5"
                onClick={() => navigate(`/project/${p.id}`)}>
                <div className="flex items-start justify-between mb-2 gap-1">
                  <h3 className="font-semibold text-gray-800 truncate flex-1 text-sm sm:text-base">{p.title}</h3>
                  <button onClick={e => handleDelete(e, p.id)}
                    className="text-gray-400 hover:text-red-500 p-1 rounded min-w-[28px] min-h-[28px] flex items-center justify-center shrink-0">✕</button>
                </div>
                <div className="flex gap-1.5 sm:gap-2 mb-2 flex-wrap">
                  <span className="text-[11px] sm:text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded">{genreNames[p.genre] || p.genre}</span>
                  <span className={`text-[11px] sm:text-xs px-2 py-0.5 rounded ${
                    p.status === 'published' ? 'bg-green-100 text-green-600' :
                    p.status === 'writing' ? 'bg-blue-100 text-blue-600' :
                    'bg-gray-100 text-gray-500'}`}>{statusNames[p.status] || p.status}</span>
                </div>
                <p className="text-xs sm:text-sm text-gray-500 line-clamp-2 mb-2 sm:mb-3">{p.synopsis || '暂无简介'}</p>
                <div className="text-[11px] sm:text-xs text-gray-400">目标 {p.target_words?.toLocaleString() || '100万'} 字</div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
