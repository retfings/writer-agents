import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projects, chapters, characters, foreshadowing, notes, approvals } from '../api';

export default function useProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<any>(null);
  const [chapterList, setChapterList] = useState<any[]>([]);
  const [charList, setCharList] = useState<any[]>([]);
  const [foreshadowingList, setForeshadowingList] = useState<any[]>([]);
  const [notesList, setNotesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const activeChapter = chapterList.find(ch => ch.id === activeChapterId) || null;

  const [deletingAll, setDeletingAll] = useState(false);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [mobileDrawer, setMobileDrawer] = useState<'outline' | 'ai' | 'none'>('none');
  const [showExtractModal, setShowExtractModal] = useState(false);

  const [fontSize, setFontSize] = useState(() => {
    const saved = localStorage.getItem('novelflow-fontSize');
    return saved ? parseInt(saved) : 16;
  });
  const [theme, setTheme] = useState<'light' | 'dark' | 'sepia'>(() => {
    return (localStorage.getItem('novelflow-theme') as any) || 'light';
  });
  const [autoSaveInterval, setAutoSaveInterval] = useState(() => {
    const saved = localStorage.getItem('novelflow-autosave');
    return saved ? parseInt(saved) : 3;
  });
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [showApprovalSettings, setShowApprovalSettings] = useState(false);

  const chapterTitles: Record<string, string> = {};
  chapterList.forEach(ch => { chapterTitles[ch.id] = `第${ch.number}章 ${ch.title}`; });

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

      if (chs.length > 0 && !activeChapterId) {
        setActiveChapterId(chs[0].id);
      }

      loadExtras();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => { localStorage.setItem('novelflow-fontSize', String(fontSize)); }, [fontSize]);
  useEffect(() => { localStorage.setItem('novelflow-theme', theme); }, [theme]);
  useEffect(() => { localStorage.setItem('novelflow-autosave', String(autoSaveInterval)); }, [autoSaveInterval]);

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

  const handleDeleteChapter = async (chapterId: string) => {
    if (!confirm('确定删除这一章？')) return;
    try {
      await chapters.delete(chapterId);
      await reloadChapters();
    } catch (err: any) {
      setError(err.message);
    }
  };

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

  const handleSaveChapter = async (content: string) => {
    if (!activeChapter) return;
    await chapters.update(activeChapter.id, { content });
    setLastSavedAt(new Date());
    await reloadChapters();
  };

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

  return {
    id, navigate,
    project, setProject, chapterList, charList, foreshadowingList, notesList,
    loading, error, setError,
    activeChapter, activeChapterId, setActiveChapterId,
    deletingAll, leftCollapsed, setLeftCollapsed,
    rightCollapsed, setRightCollapsed, focusMode, setFocusMode,
    lastSavedAt, mobileDrawer, setMobileDrawer,
    showExtractModal, setShowExtractModal,
    fontSize, setFontSize, theme, setTheme,
    autoSaveInterval, setAutoSaveInterval,
    pendingApprovals, showApprovalSettings, setShowApprovalSettings,
    chapterTitles,
    handleApprovalModeChange, handleDeleteChapter, handleDeleteAll,
    handleSaveChapter, handleAddCharacter, handleExtractConfirm,
    handleAddForeshadowing, handleToggleForeshadowing, handleDeleteForeshadowing,
    handleAddNote, handleUpdateNote, handleDeleteNote,
    reloadApprovals,
  };
}