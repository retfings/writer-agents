import { useState } from 'react';
import { projects } from '../api';
import useProjectDetail from '../hooks/useProjectDetail';
import ThreeColumnLayout from '../components/layout/ThreeColumnLayout';
import Sidebar from '../components/sidebar/Sidebar';
import ChapterContent from '../components/reader/ChapterContent';
import ChapterNav from '../components/reader/ChapterNav';
import ReadingToolbar from '../components/reader/ReadingToolbar';
import SettingsModal from '../components/reader/SettingsModal';
import AIAssistant from '../components/chat/AIAssistant';
import MobileBottomNav from '../components/mobile/MobileBottomNav';
import MobileDrawer from '../components/mobile/MobileDrawer';
import MobileFormatBubble from '../components/mobile/MobileFormatBubble';
import CharacterExtractModal from '../components/character/CharacterExtractModal';
import ApprovalDrawer from '../components/approval/ApprovalDrawer';
import PromptTemplatesManager from '../components/approval/PromptTemplatesManager';

export default function ProjectDetail() {
  const p = useProjectDetail();
  const [showSettings, setShowSettings] = useState(false);

  if (p.loading) {
    return (
      <div className="h-[100dvh] bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400">加载中...</div>
      </div>
    );
  }

  if (!p.project) {
    return (
      <div className="h-[100dvh] bg-gray-50 flex flex-col items-center justify-center gap-3">
        <p className="text-gray-500">项目未找到</p>
        <button onClick={() => p.navigate('/')} className="text-orange-500 hover:underline">返回首页</button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50 overflow-hidden lg:pb-0 pb-12">
      <header className="bg-white border-b border-gray-200 shrink-0 z-10">
        <div className="px-3 sm:px-4 py-2.5 flex items-center gap-3">
          <button
            onClick={() => p.navigate('/')}
            className="text-gray-400 hover:text-gray-600 text-sm shrink-0"
          >
            ← 返回
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold text-gray-800 truncate">{p.project.title}</h1>
              <button
                onClick={() => {
                  const input = document.createElement('input');
                  input.value = p.project.title;
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

        {p.error && (
          <div className="bg-red-50 text-red-600 px-4 py-2 text-xs flex items-center justify-between">
            <span>{p.error}</span>
            <button onClick={() => p.setError('')} className="text-red-400 hover:text-red-600">✕</button>
          </div>
        )}
      </header>

      <div className="flex-1 min-h-0">
        <ThreeColumnLayout
          left={
            <Sidebar
              projectId={p.id!}
              chapters={p.chapterList}
              activeChapterId={p.activeChapterId}
              onSelectChapter={(ch) => p.setActiveChapterId(ch.id)}
              onDeleteChapter={p.handleDeleteChapter}
              onDeleteAll={p.handleDeleteAll}
              deletingAll={p.deletingAll}
              characters={p.charList}
              onAddCharacter={p.handleAddCharacter}
              onExtractCharacters={() => p.setShowExtractModal(true)}
              foreshadowing={p.foreshadowingList}
              chapterTitles={p.chapterTitles}
              onAddForeshadowing={p.handleAddForeshadowing}
              onToggleForeshadowing={p.handleToggleForeshadowing}
              onDeleteForeshadowing={p.handleDeleteForeshadowing}
              notes={p.notesList}
              onAddNote={p.handleAddNote}
              onUpdateNote={p.handleUpdateNote}
              onDeleteNote={p.handleDeleteNote}
            />
          }
          center={
            p.activeChapter ? (
              <div className="flex flex-col min-h-0 flex-1">
                <ReadingToolbar
                  fontSize={p.fontSize}
                  onFontSizeChange={p.setFontSize}
                  theme={p.theme}
                  onThemeChange={p.setTheme}
                  leftCollapsed={p.leftCollapsed}
                  rightCollapsed={p.rightCollapsed}
                  onToggleLeft={() => p.setLeftCollapsed(!p.leftCollapsed)}
                  onToggleRight={() => p.setRightCollapsed(!p.rightCollapsed)}
                  focusMode={p.focusMode}
                  onToggleFocus={() => p.setFocusMode(!p.focusMode)}
                  onFormat={(cmd) => (window as any).__chapterFormat?.(cmd)}
                  onOpenSettings={() => setShowSettings(true)}
                />
                <ChapterNav
                  chapters={p.chapterList.map(ch => ({ id: ch.id, number: ch.number, title: ch.title }))}
                  currentNumber={p.activeChapter.number}
                  onNavigate={(ch) => p.setActiveChapterId(ch.id)}
                  theme={p.theme}
                />
                <ChapterContent
                  title={`第${p.activeChapter.number}章 ${p.activeChapter.title || ''}`}
                  content={p.activeChapter.content || ''}
                  wordCount={p.activeChapter.wordCount || 0}
                  status={p.activeChapter.status || 'outline'}
                  outline={p.activeChapter.outline}
                  agentNotes={p.activeChapter.agentNotes}
                  fontSize={p.fontSize}
                  theme={p.theme}
                  autoSaveInterval={p.autoSaveInterval}
                  onSave={p.handleSaveChapter}
                  lastSavedAt={p.lastSavedAt}
                />
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <p className="text-4xl mb-3">📖</p>
                <p className="text-sm mb-2">
                  {p.chapterList.length === 0 ? '还没有章节' : '从左侧选择章节开始阅读'}
                </p>
                {p.chapterList.length === 0 && (
                  <p className="text-xs text-gray-400">使用右侧 AI 助手输入 /outline 生成大纲</p>
                )}
              </div>
            )
          }
          right={
            <AIAssistant
              projectId={p.id!}
              chapterId={p.activeChapterId}
              chapterTitle={p.activeChapter ? `第${p.activeChapter.number}章 ${p.activeChapter.title}` : undefined}
            />
          }
          leftCollapsed={p.leftCollapsed}
          rightCollapsed={p.rightCollapsed}
          focusMode={p.focusMode}
        />
      </div>

      <CharacterExtractModal
        open={p.showExtractModal}
        onClose={() => p.setShowExtractModal(false)}
        projectId={p.id!}
        chapters={p.chapterList.map(ch => ({ id: ch.id, number: ch.number, title: ch.title }))}
        onConfirm={p.handleExtractConfirm}
      />

      <MobileBottomNav activeTab={p.mobileDrawer} onTabChange={p.setMobileDrawer} />

      <ApprovalDrawer
        requests={p.pendingApprovals}
        onUpdate={p.reloadApprovals}
      />

      {p.showApprovalSettings && (
        <div className="absolute bottom-12 right-0 bg-white rounded-lg shadow-xl border border-gray-200 p-3 w-56">
          <div className="text-xs font-medium text-gray-700 mb-2">LLM 审批模式</div>
          <div className="space-y-1">
            <button
              onClick={() => p.handleApprovalModeChange('auto')}
              className={`w-full text-left px-3 py-2 rounded text-xs ${
                p.project?.approvalMode === 'auto'
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              🚀 自动批准（默认）
            </button>
            <button
              onClick={() => p.handleApprovalModeChange('manual')}
              className={`w-full text-left px-3 py-2 rounded text-xs ${
                p.project?.approvalMode === 'manual'
                  ? 'bg-orange-50 text-orange-700 border border-orange-200'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              ⏳ 手动批准
            </button>
          </div>
          {p.pendingApprovals.length > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-orange-600">
              {p.pendingApprovals.length} 个待审批请求
            </div>
          )}
          {p.project?.approvalMode === 'manual' && (
            <div className="mt-2 pt-2 border-t border-gray-200">
              <div className="text-[10px] text-gray-500 mb-1">提示词模板</div>
              <PromptTemplatesManager
                currentTemplateId={p.project?.promptTemplateId}
                onSelectTemplate={async (templateId) => {
                  try {
                    await projects.update(p.project.id, { promptTemplateId: templateId });
                    p.setProject((prev: any) => ({ ...prev, promptTemplateId: templateId }));
                  } catch (err) {
                    console.error('Failed to update template:', err);
                  }
                }}
              />
            </div>
          )}
        </div>
      )}

      <MobileDrawer open={p.mobileDrawer === 'outline'} onClose={() => p.setMobileDrawer('none')} title="大纲 & 创作">
        <div className="text-sm">
          <Sidebar
            projectId={p.id!}
            chapters={p.chapterList}
            activeChapterId={p.activeChapterId}
            onSelectChapter={(ch) => { p.setActiveChapterId(ch.id); p.setMobileDrawer('none'); }}
            onDeleteChapter={p.handleDeleteChapter}
            onDeleteAll={p.handleDeleteAll}
            deletingAll={p.deletingAll}
            characters={p.charList}
            onAddCharacter={p.handleAddCharacter}
            onExtractCharacters={() => p.setShowExtractModal(true)}
            foreshadowing={p.foreshadowingList}
            chapterTitles={p.chapterTitles}
            onAddForeshadowing={p.handleAddForeshadowing}
            onToggleForeshadowing={p.handleToggleForeshadowing}
            onDeleteForeshadowing={p.handleDeleteForeshadowing}
            notes={p.notesList}
            onAddNote={p.handleAddNote}
            onUpdateNote={p.handleUpdateNote}
            onDeleteNote={p.handleDeleteNote}
          />
        </div>
      </MobileDrawer>
      <MobileDrawer open={p.mobileDrawer === 'ai'} onClose={() => p.setMobileDrawer('none')} title="AI 助手">
        <AIAssistant
          projectId={p.id!}
          chapterId={p.activeChapterId}
          chapterTitle={p.activeChapter ? `第${p.activeChapter.number}章 ${p.activeChapter.title}` : undefined}
        />
      </MobileDrawer>
      <MobileFormatBubble onFormat={(cmd) => {
        if (cmd === 'polish') {
          p.setMobileDrawer('ai');
        } else {
          (window as any).__chapterFormat?.(cmd);
        }
      }} />
      {showSettings && (
        <SettingsModal
          fontSize={p.fontSize}
          onFontSizeChange={p.setFontSize}
          theme={p.theme}
          onThemeChange={p.setTheme}
          leftCollapsed={p.leftCollapsed}
          onToggleLeft={() => p.setLeftCollapsed(!p.leftCollapsed)}
          rightCollapsed={p.rightCollapsed}
          onToggleRight={() => p.setRightCollapsed(!p.rightCollapsed)}
          autoSaveInterval={p.autoSaveInterval}
          onAutoSaveIntervalChange={p.setAutoSaveInterval}
          focusMode={p.focusMode}
          onToggleFocus={() => p.setFocusMode(!p.focusMode)}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}