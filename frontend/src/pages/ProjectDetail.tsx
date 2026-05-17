import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projects, chapters, characters, foreshadowing, notes, approvals } from '../api';
import ThreeColumnLayout from '../components/layout/ThreeColumnLayout';
import Sidebar from '../components/sidebar/Sidebar';
import ChapterContent from '../components/reader/ChapterContent';
import ChapterNav from '../components/reader/ChapterNav';
import ReadingToolbar from '../components/reader/ReadingToolbar';
import AIAssistant from '../components/chat/AIAssistant';
import MobileBottomNav from '../components/mobile/MobileBottomNav';
import MobileDrawer from '../components/mobile/MobileDrawer';
import MobileFormatBubble from '../components/mobile/MobileFormatBubble';
import CharacterExtractModal from '../components/character/CharacterExtractModal';
import ApprovalDrawer from '../components/approval/ApprovalDrawer';
import PromptTemplatesManager from '../components/approval/PromptTemplatesManager';

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

  // Auto-save interval
  const [autoSaveInterval, setAutoSaveInterval] = useState(() => {
    const saved = localStorage.getItem('novelflow-autosave');
    return saved ? parseInt(saved) : 3;
  });

  // Approval state
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [showApprovalSettings, setShowApprovalSettings] = useState(false);

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
    } catch { /* ignore */ }
  };

  useEffect(() => {
    if (id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Persist reading settings
  useEffect(() => { localStorage.setItem('novelflow-fontSize', String(fontSize)); }, [fontSize]);
  useEffect(() => { localStorage.setItem('novelflow-theme', theme); }, [theme]);
  useEffect(() => { localStorage.setItem('novelflow-autosave', String(autoSaveInterval)); }, [autoSaveInterval]);

  // Poll for pending approvals
  useEffect(() => {
    if (!id) return;

    const loadPendingApprovals = async () => {
      try {
        const { requests } = await approvals.listPending(id);
        setPendingApprovals(requests || []);
      } catch { /* ignore */ }
    };

    loadPendingApprovals();
    const interval = setInterval(loadPendingApprovals, 2000);
    return () => clearInterval(interval);
  }, [id]);

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
    } catch { /* ignore */ }
  };

  const reloadApprovals = async () => {
    try {
      const { requests } = await approvals.listPending(id!);
      setPendingApprovals(requests || []);
    } catch { /* ignore */ }
  };

  const handleApprovalModeChange = async (mode: string) => {
    try {
      await projects.update(id!, { approvalMode: mode });
      setProject((p: any) => ({ ...p, approvalMode: mode }));
      setShowApprovalSettings(false);
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
              <h1 className="text-sm sm:text-base font-bold text-gray-800 truncate">{project.title}</h1>
              <button
                onClick={() => {
                  const input = document.createElement('input');
                  input.value = project.title;
                  document.body.appendChild(input);
                  input.select();
                  document.execCommand('copy');
                  document.body.removeChild(input);
                }}
                className="text-gray-400 hover:text-orange-500 transition shrink-0"
                title="复制书名"
              >
                📋
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a href="https://github.com/retfings/writer-agents" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-orange-500 transition" title="GitHub">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
            </a>
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
                  agentNotes={activeChapter.agentNotes}
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
                    <p className="text-xs text-gray-400">使用右侧 AI 助手输入 /outline 生成大纲</p>
                  )}
                </div>
            )
          }
          right={
            <AIAssistant
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

      {/* Mobile bottom nav & drawers */}
      <MobileBottomNav activeTab={mobileDrawer} onTabChange={setMobileDrawer} />

      {/* Approval Drawer */}
      <ApprovalDrawer
        requests={pendingApprovals}
        onUpdate={reloadApprovals}
      />

      {/* Approval Mode Toggle */}
      {showApprovalSettings && (
        <div className="absolute bottom-12 right-0 bg-white rounded-lg shadow-xl border border-gray-200 p-3 w-56">
          <div className="text-xs font-medium text-gray-700 mb-2">LLM 审批模式</div>
          <div className="space-y-1">
            <button
              onClick={() => handleApprovalModeChange('auto')}
              className={`w-full text-left px-3 py-2 rounded text-xs ${
                project?.approvalMode === 'auto'
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              🚀 自动批准（默认）
            </button>
            <button
              onClick={() => handleApprovalModeChange('manual')}
              className={`w-full text-left px-3 py-2 rounded text-xs ${
                project?.approvalMode === 'manual'
                  ? 'bg-orange-50 text-orange-700 border border-orange-200'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              ⏳ 手动批准
            </button>
          </div>
          {pendingApprovals.length > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-orange-600">
              {pendingApprovals.length} 个待审批请求
            </div>
          )}
          {project?.approvalMode === 'manual' && (
            <div className="mt-2 pt-2 border-t border-gray-200">
              <div className="text-[10px] text-gray-500 mb-1">提示词模板</div>
              <PromptTemplatesManager
                currentTemplateId={project?.promptTemplateId}
                onSelectTemplate={async (templateId) => {
                  try {
                    await projects.update(project.id, { promptTemplateId: templateId });
                    setProject((p: any) => ({ ...p, promptTemplateId: templateId }));
                  } catch (err) {
                    console.error('Failed to update template:', err);
                  }
                }}
              />
            </div>
          )}
        </div>
      )}
      <MobileDrawer open={mobileDrawer === 'outline'} onClose={() => setMobileDrawer('none')} title="大纲 & 创作">
        <div className="text-sm">
          <Sidebar
            projectId={id!}
            chapters={chapterList}
            activeChapterId={activeChapterId}
            onSelectChapter={(ch) => { setActiveChapterId(ch.id); setMobileDrawer('none'); }}
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
        <AIAssistant
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
