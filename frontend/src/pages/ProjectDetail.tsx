import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projects, chapters, characters, foreshadowing, notes } from '../api';
import ThreeColumnLayout from '../components/layout/ThreeColumnLayout';
import Sidebar from '../components/sidebar/Sidebar';
import ChapterContent from '../components/reader/ChapterContent';
import ChapterNav from '../components/reader/ChapterNav';
import ReadingToolbar from '../components/reader/ReadingToolbar';
import AIChatPanel from '../components/chat/AIChatPanel';
import MobileBottomNav from '../components/mobile/MobileBottomNav';
import MobileDrawer from '../components/mobile/MobileDrawer';
import MobileFormatBubble from '../components/mobile/MobileFormatBubble';
import CharacterExtractModal from '../components/character/CharacterExtractModal';

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Data
  const [project, setProject] = useState<any>(null);
  const [chapterList, setChapterList] = useState<any[]>([]);
  const [charList, setCharList] = useState<any[]>([]);
  const [foreshadowingList, setForeshadowingList] = useState<any[]>([]);
  const [notesList, setNotesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Active chapter
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const activeChapter = chapterList.find(ch => ch.id === activeChapterId) || null;

  // UI state
  const [generating, setGenerating] = useState(false);
  const [writing, setWriting] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [mobileDrawer, setMobileDrawer] = useState<'outline' | 'ai' | 'none'>('none');
  const [showExtractModal, setShowExtractModal] = useState(false);

  // Reading settings (persisted)
  const [fontSize, setFontSize] = useState(() => {
    const saved = localStorage.getItem('novelflow-fontSize');
    return saved ? parseInt(saved) : 16;
  });
  const [theme, setTheme] = useState<'light' | 'dark' | 'sepia'>(() => {
    return (localStorage.getItem('novelflow-theme') as any) || 'light';
  });

  // Rewrite modal
  const [showRewriteModal, setShowRewriteModal] = useState(false);
  const [rewriteInstructions, setRewriteInstructions] = useState('');
  const [rewriting, setRewriting] = useState(false);
  const [autoSaveInterval, setAutoSaveInterval] = useState(() => {
    const saved = localStorage.getItem('novelflow-autosave');
    return saved ? parseInt(saved) : 3;
  });

  useEffect(() => { if (id) loadAll(); }, [id]);

  // Persist reading settings
  useEffect(() => { localStorage.setItem('novelflow-fontSize', String(fontSize)); }, [fontSize]);
  useEffect(() => { localStorage.setItem('novelflow-theme', theme); }, [theme]);
  useEffect(() => { localStorage.setItem('novelflow-autosave', String(autoSaveInterval)); }, [autoSaveInterval]);

  const loadAll = async () => {
    try {
      const [
        { project: p },
        { chapters: chs },
        { characters: chars },
      ] = await Promise.all([
        projects.get(id!),
        chapters.list(id!),
        characters.list(id!),
      ]);

      setProject(p);
      setChapterList(chs);
      setCharList(chars);

      // Auto-select first chapter
      if (chs.length > 0 && !activeChapterId) {
        setActiveChapterId(chs[0].id);
      }

      // Load foreshadowing and notes in background
      loadExtras();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadExtras = async () => {
    try {
      const [{ foreshadowing: fs }, { notes: ns }] = await Promise.all([
        foreshadowing.list(id!),
        notes.list(id!),
      ]);
      setForeshadowingList(fs);
      setNotesList(ns);
    } catch {}
  };

  const reloadChapters = async () => {
    const { chapters: chs } = await chapters.list(id!);
    setChapterList(chs);
    // Keep active chapter if it still exists
    if (activeChapterId && !chs.find((c: any) => c.id === activeChapterId)) {
      setActiveChapterId(chs[0]?.id || null);
    }
  };

  const reloadCharacters = async () => {
    const { characters: chars } = await characters.list(id!);
    setCharList(chars);
  };

  const reloadExtras = async () => {
    try {
      const [{ foreshadowing: fs }, { notes: ns }] = await Promise.all([
        foreshadowing.list(id!),
        notes.list(id!),
      ]);
      setForeshadowingList(fs);
      setNotesList(ns);
    } catch {}
  };

  // Outline generation
  const handleGenerateOutline = async () => {
    setGenerating(true);
    setError('');
    try {
      await chapters.generateOutline(id!);
      await reloadChapters();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  // Write chapter
  const handleWriteChapter = async () => {
    if (!activeChapter) return;
    setWriting(true);
    setError('');
    try {
      await chapters.write(id!, activeChapter.number);
      await reloadChapters();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setWriting(false);
    }
  };

  // Review chapter
  const handleReviewChapter = async () => {
    if (!activeChapter) return;
    setError('');
    try {
      await chapters.review(activeChapter.id);
      await reloadChapters();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Delete chapter
  const handleDeleteChapter = async (chapterId: string) => {
    if (!confirm('确定删除这一章？')) return;
    try {
      await chapters.delete(chapterId);
      await reloadChapters();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Delete all chapters
  const handleDeleteAll = async () => {
    if (!confirm(`确定删除全部 ${chapterList.length} 章？此操作不可撤销！`)) return;
    setDeletingAll(true);
    try {
      await chapters.deleteAll(id!);
      setChapterList([]);
      setActiveChapterId(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeletingAll(false);
    }
  };

  // Save chapter content edit
  const handleSaveChapter = async (content: string) => {
    if (!activeChapter) return;
    await chapters.update(activeChapter.id, { content });
    setLastSavedAt(new Date());
    await reloadChapters();
  };

  // Rewrite
  const handleRewrite = async () => {
    if (!activeChapter || !rewriteInstructions.trim()) return;
    setRewriting(true);
    setShowRewriteModal(false);
    try {
      await chapters.rewrite(activeChapter.id, rewriteInstructions);
      await reloadChapters();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRewriting(false);
    }
  };

  const handleAiSuggestRewrites = async () => {
    if (!activeChapter) return;
    setRewriting(true);
    try {
      const resp = await fetch('/api/projects/ai-rewrite-suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          title: activeChapter.title || '',
          content: (activeChapter.content || '').slice(0, 3000),
          genre: project?.genre || 'urban',
        }),
      });
      const data = await resp.json();
      if (data.suggestions) setRewriteInstructions(data.suggestions);
      else setError(data.error || 'AI 生成建议失败');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRewriting(false);
    }
  };

  // Character
  const handleAddCharacter = async (data: any) => {
    await characters.create({ ...data, projectId: id });
    await reloadCharacters();
  };

  const handleExtractConfirm = async (extracted: any[]) => {
    for (const c of extracted) {
      if (c.matchType === 'new' || !c.existingId) {
        await characters.create({
          projectId: id,
          name: c.name,
          role: c.role || '配角',
          description: [c.occupation, c.summary].filter(Boolean).join('。'),
          traits: c.personality || [],
          relationships: (c.relations || []).map((r: any) => ({
            withName: r.target,
            relation: r.relation,
            dynamic: '',
          })),
          arc: '',
        });
      } else {
        // Merge: update existing
        const existing = c.existingData;
        const mergedTraits = [...new Set([...(existing?.traits || []), ...(c.personality || [])])];
        const mergedRels = [...(existing?.relationships || [])];
        for (const r of (c.relations || [])) {
          if (!mergedRels.find((mr: any) => mr.withName === r.target)) {
            mergedRels.push({ withName: r.target, relation: r.relation, dynamic: '' });
          }
        }
        await characters.update(c.existingId, {
          traits: mergedTraits,
          relationships: mergedRels,
          description: existing?.description || [c.occupation, c.summary].filter(Boolean).join('。'),
        });
      }
    }
    await reloadCharacters();
  };

  // Foreshadowing
  const handleAddForeshadowing = async (data: any) => {
    await foreshadowing.create({ ...data, projectId: id });
    await reloadExtras();
  };

  const handleToggleForeshadowing = async (fId: string, status: string) => {
    await foreshadowing.update(fId, { status });
    await reloadExtras();
  };

  const handleDeleteForeshadowing = async (fId: string) => {
    await foreshadowing.delete(fId);
    await reloadExtras();
  };

  // Notes
  const handleAddNote = async (data: any) => {
    await notes.create({ ...data, projectId: id });
    await reloadExtras();
  };

  const handleUpdateNote = async (nId: string, data: any) => {
    await notes.update(nId, data);
    await reloadExtras();
  };

  const handleDeleteNote = async (nId: string) => {
    await notes.delete(nId);
    await reloadExtras();
  };

  // Build chapter title map for foreshadowing panel
  const chapterTitles: Record<string, string> = {};
  chapterList.forEach(ch => { chapterTitles[ch.id] = `第${ch.number}章 ${ch.title}`; });

  if (loading) {
    return (
      <div className="h-[100dvh] bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400">加载中...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="h-[100dvh] bg-gray-50 flex flex-col items-center justify-center gap-3">
        <p className="text-gray-500">项目未找到</p>
        <button onClick={() => navigate('/')} className="text-orange-500 hover:underline">返回首页</button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50 overflow-hidden lg:pb-0 pb-12">
      {/* Top header bar */}
      <header className="bg-white border-b border-gray-200 shrink-0 z-10">
        <div className="px-3 sm:px-4 py-2.5 flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="text-gray-400 hover:text-gray-600 text-sm shrink-0"
          >
            ← 返回
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500 text-white font-mono shrink-0">v2</span>
            <h1 className="text-sm sm:text-base font-bold text-gray-800 truncate">{project.title}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a href="https://github.com/retfings/writer-agents" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-orange-500 transition" title="GitHub">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
            </a>
            {/* Chapter actions */}
            {activeChapter && (
              <>
                {activeChapter.status === 'outline' && (
                  <button
                    onClick={handleWriteChapter}
                    disabled={writing}
                    className="bg-orange-500 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-orange-600 disabled:opacity-50"
                  >
                    {writing ? '写作中...' : '✍️ AI 写作'}
                  </button>
                )}
                {activeChapter.status === 'draft' && (
                  <button
                    onClick={handleReviewChapter}
                    className="bg-blue-500 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-blue-600"
                  >
                    🔍 AI 审校
                  </button>
                )}
                <button
                  onClick={() => setShowRewriteModal(true)}
                  className="text-xs text-gray-500 hover:text-purple-600 hover:bg-purple-50 px-2 py-1 rounded"
                >
                  🔄 重写
                </button>
              </>
            )}
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-2 text-xs flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-red-400 hover:text-red-600">✕</button>
          </div>
        )}
      </header>

      {/* Three-column body */}
      <div className="flex-1 min-h-0">
        <ThreeColumnLayout
          left={
            <Sidebar
              projectId={id!}
              chapters={chapterList}
              activeChapterId={activeChapterId}
              onSelectChapter={(ch) => setActiveChapterId(ch.id)}
              onGenerateOutline={handleGenerateOutline}
              generating={generating}
              onDeleteChapter={handleDeleteChapter}
              onDeleteAll={handleDeleteAll}
              deletingAll={deletingAll}
              characters={charList}
              onAddCharacter={handleAddCharacter}
              onExtractCharacters={() => setShowExtractModal(true)}
              foreshadowing={foreshadowingList}
              chapterTitles={chapterTitles}
              onAddForeshadowing={handleAddForeshadowing}
              onToggleForeshadowing={handleToggleForeshadowing}
              onDeleteForeshadowing={handleDeleteForeshadowing}
              notes={notesList}
              onAddNote={handleAddNote}
              onUpdateNote={handleUpdateNote}
              onDeleteNote={handleDeleteNote}
            />
          }
          center={
            activeChapter ? (
              <div className="flex flex-col min-h-0 flex-1">
                <ReadingToolbar
                  fontSize={fontSize}
                  onFontSizeChange={setFontSize}
                  theme={theme}
                  onThemeChange={setTheme}
                  leftCollapsed={leftCollapsed}
                  rightCollapsed={rightCollapsed}
                  onToggleLeft={() => setLeftCollapsed(!leftCollapsed)}
                  onToggleRight={() => setRightCollapsed(!rightCollapsed)}
                  autoSaveInterval={autoSaveInterval}
                  onAutoSaveIntervalChange={setAutoSaveInterval}
                  focusMode={focusMode}
                  onToggleFocus={() => setFocusMode(!focusMode)}
                  onFormat={(cmd) => (window as any).__chapterFormat?.(cmd)}
                />
                <ChapterNav
                  chapters={chapterList.map(ch => ({ id: ch.id, number: ch.number, title: ch.title }))}
                  currentNumber={activeChapter.number}
                  onNavigate={(ch) => setActiveChapterId(ch.id)}
                  theme={theme}
                />
                <ChapterContent
                  title={`第${activeChapter.number}章 ${activeChapter.title || ''}`}
                  content={activeChapter.content || ''}
                  wordCount={activeChapter.wordCount || 0}
                  status={activeChapter.status || 'outline'}
                  outline={activeChapter.outline}
                  fontSize={fontSize}
                  theme={theme}
                  autoSaveInterval={autoSaveInterval}
                  onSave={handleSaveChapter}
                  lastSavedAt={lastSavedAt}
                />
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <p className="text-4xl mb-3">📖</p>
                <p className="text-sm mb-2">
                  {chapterList.length === 0 ? '还没有章节' : '从左侧选择章节开始阅读'}
                </p>
                {chapterList.length === 0 && (
                  <button
                    onClick={handleGenerateOutline}
                    disabled={generating}
                    className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-orange-600 disabled:opacity-50"
                  >
                    {generating ? '生成中...' : '🤖 AI 生成大纲'}
                  </button>
                )}
              </div>
            )
          }
          right={
            <AIChatPanel
              projectId={id!}
              chapterId={activeChapterId}
              chapterTitle={activeChapter ? `第${activeChapter.number}章 ${activeChapter.title}` : undefined}
            />
          }
          leftCollapsed={leftCollapsed}
          rightCollapsed={rightCollapsed}
          focusMode={focusMode}
        />
      </div>

      {/* Extract Characters Modal */}
      <CharacterExtractModal
        open={showExtractModal}
        onClose={() => setShowExtractModal(false)}
        projectId={id!}
        chapters={chapterList.map(ch => ({ id: ch.id, number: ch.number, title: ch.title }))}
        onConfirm={handleExtractConfirm}
      />

      {/* Rewrite Modal */}
      {showRewriteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => !rewriting && setShowRewriteModal(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-5 sm:p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-base sm:text-lg font-bold mb-1">🔄 重写本章</h3>
            <p className="text-xs sm:text-sm text-gray-500 mb-4">
              输入重写要求，AI 将根据你的要求重新生成章节内容。
            </p>
            <textarea
              value={rewriteInstructions}
              onChange={e => setRewriteInstructions(e.target.value)}
              placeholder={`输入重写要求，例如：\n- 加强主角的心理描写\n- 增加一段追车戏\n- 对话更自然一些\n- 去掉脏话和暴力描写`}
              className="w-full px-3 py-2.5 border rounded-lg text-sm resize-none mb-3"
              rows={6}
              disabled={rewriting}
            />
            <div className="flex gap-2 flex-wrap justify-end">
              <button
                onClick={handleAiSuggestRewrites}
                disabled={rewriting}
                className="text-orange-600 border border-orange-300 px-3 py-2 rounded-lg text-xs hover:bg-orange-50 disabled:opacity-50"
              >
                {rewriting ? '分析中...' : '🤖 AI 生成修改建议'}
              </button>
              <button
                onClick={() => setShowRewriteModal(false)}
                disabled={rewriting}
                className="text-gray-500 px-3 py-2 rounded-lg text-xs"
              >
                取消
              </button>
              <button
                onClick={handleRewrite}
                disabled={rewriting || !rewriteInstructions.trim()}
                className="bg-purple-500 text-white px-4 py-2 rounded-lg text-xs font-medium hover:bg-purple-600 disabled:opacity-50"
              >
                {rewriting ? '重写中...' : '确认重写'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile bottom nav & drawers */}
      <MobileBottomNav activeTab={mobileDrawer} onTabChange={setMobileDrawer} />
      <MobileDrawer open={mobileDrawer === 'outline'} onClose={() => setMobileDrawer('none')} title="大纲 & 创作">
        <div className="text-sm">
          <Sidebar
            projectId={id!}
            chapters={chapterList}
            activeChapterId={activeChapterId}
            onSelectChapter={(ch) => { setActiveChapterId(ch.id); setMobileDrawer('none'); }}
            onGenerateOutline={handleGenerateOutline}
            generating={generating}
            onDeleteChapter={handleDeleteChapter}
            onDeleteAll={handleDeleteAll}
            deletingAll={deletingAll}
            characters={charList}
            onAddCharacter={handleAddCharacter}
            onExtractCharacters={() => setShowExtractModal(true)}
            foreshadowing={foreshadowingList}
            chapterTitles={chapterTitles}
            onAddForeshadowing={handleAddForeshadowing}
            onToggleForeshadowing={handleToggleForeshadowing}
            onDeleteForeshadowing={handleDeleteForeshadowing}
            notes={notesList}
            onAddNote={handleAddNote}
            onUpdateNote={handleUpdateNote}
            onDeleteNote={handleDeleteNote}
          />
        </div>
      </MobileDrawer>
      <MobileDrawer open={mobileDrawer === 'ai'} onClose={() => setMobileDrawer('none')} title="AI 助手">
        <AIChatPanel
          projectId={id!}
          chapterId={activeChapterId}
          chapterTitle={activeChapter ? `第${activeChapter.number}章 ${activeChapter.title}` : undefined}
        />
      </MobileDrawer>
      <MobileFormatBubble onFormat={(cmd) => {
        if (cmd === 'polish') {
          setMobileDrawer('ai');
        } else {
          (window as any).__chapterFormat?.(cmd);
        }
      }} />

    </div>
  );
}
