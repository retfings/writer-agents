import { useState } from 'react';
import OutlineTree from './OutlineTree';
import CharacterPanel from './CharacterPanel';
import ForeshadowingPanel from './ForeshadowingPanel';
import WorldNotes from './WorldNotes';

interface ChapterItem {
  id: string;
  number: number;
  title: string;
  status: string;
  wordCount: number;
  outline?: string;
}

interface CharacterItem {
  id: string;
  name: string;
  role: string;
  description: string;
  traits: string[];
}

interface ForeshadowingItem {
  id: string;
  title: string;
  description: string;
  plantedChapterId: string | null;
  revealedChapterId: string | null;
  status: string;
}

interface NoteItem {
  id: string;
  title: string;
  content: string;
  category: string;
}

interface Props {
  chapters: ChapterItem[];
  activeChapterId: string | null;
  onSelectChapter: (ch: ChapterItem) => void;
  onGenerateOutline: () => void;
  generating: boolean;
  onDeleteChapter?: (id: string) => void;
  onDeleteAll?: () => void;
  deletingAll?: boolean;
  characters: CharacterItem[];
  onAddCharacter: (data: any) => Promise<void>;
  onUpdateCharacter?: (id: string, data: any) => Promise<void>;
  onDeleteCharacter?: (id: string) => Promise<void>;
  foreshadowing: ForeshadowingItem[];
  chapterTitles: Record<string, string>;
  onAddForeshadowing: (data: any) => Promise<void>;
  onToggleForeshadowing: (id: string, status: string) => Promise<void>;
  onDeleteForeshadowing: (id: string) => Promise<void>;
  notes: NoteItem[];
  onAddNote: (data: any) => Promise<void>;
  onUpdateNote: (id: string, data: any) => Promise<void>;
  onDeleteNote: (id: string) => Promise<void>;
}

type TabKey = 'outline' | 'characters' | 'foreshadowing' | 'notes';

const tabs: Array<{ key: TabKey; label: string; icon: string }> = [
  { key: 'outline', label: '大纲', icon: '📑' },
  { key: 'characters', label: '人物', icon: '👤' },
  { key: 'foreshadowing', label: '伏笔', icon: '🔮' },
  { key: 'notes', label: '笔记', icon: '🌍' },
];

export default function Sidebar(props: Props) {
  const [tab, setTab] = useState<TabKey>('outline');

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex border-b border-gray-100 bg-white shrink-0">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2 text-xs font-medium transition border-b-2 ${
              tab === t.key
                ? 'border-orange-500 text-orange-600 bg-orange-50/50'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            <span className="mr-1">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {tab === 'outline' && (
          <OutlineTree
            chapters={props.chapters}
            activeChapterId={props.activeChapterId}
            onSelectChapter={props.onSelectChapter}
            onGenerateOutline={props.onGenerateOutline}
            generating={props.generating}
            onDeleteChapter={props.onDeleteChapter}
            onDeleteAll={props.onDeleteAll}
            deletingAll={props.deletingAll}
          />
        )}
        {tab === 'characters' && (
          <CharacterPanel
            characters={props.characters}
            onAdd={props.onAddCharacter}
          />
        )}
        {tab === 'foreshadowing' && (
          <ForeshadowingPanel
            items={props.foreshadowing}
            chapterTitles={props.chapterTitles}
            onAdd={props.onAddForeshadowing}
            onToggle={props.onToggleForeshadowing}
            onDelete={props.onDeleteForeshadowing}
          />
        )}
        {tab === 'notes' && (
          <WorldNotes
            notes={props.notes}
            onAdd={props.onAddNote}
            onDelete={props.onDeleteNote}
          />
        )}
      </div>
    </div>
  );
}
