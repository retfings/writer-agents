import { useState, useEffect } from 'react';

interface Props {
  onFormat: (cmd: 'bold' | 'italic' | 'quote' | 'polish') => void;
}

export default function MobileFormatBubble({ onFormat }: Props) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handler = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.toString().trim()) {
        setVisible(false);
        return;
      }

      const editorArea = document.querySelector('[placeholder="在此编辑章节内容..."]');
      if (!editorArea?.contains(sel.anchorNode)) {
        setVisible(false);
        return;
      }

      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setPos({
        x: rect.left + rect.width / 2,
        y: rect.top - 50,
      });
      setVisible(true);
    };

    document.addEventListener('selectionchange', handler);
    document.addEventListener('touchend', handler);
    return () => {
      document.removeEventListener('selectionchange', handler);
      document.removeEventListener('touchend', handler);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed z-50 bg-white rounded-xl shadow-lg border border-gray-200 flex items-center gap-0.5 px-1 py-1"
      style={{
        left: Math.max(8, Math.min(pos.x - 80, window.innerWidth - 170)),
        top: Math.max(8, pos.y),
      }}
    >
      <button onClick={() => onFormat('bold')} className="w-10 h-9 flex items-center justify-center text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-lg">B</button>
      <button onClick={() => onFormat('italic')} className="w-10 h-9 flex items-center justify-center text-sm italic text-gray-600 hover:bg-gray-100 rounded-lg">I</button>
      <button onClick={() => onFormat('quote')} className="w-10 h-9 flex items-center justify-center text-sm text-gray-600 hover:bg-gray-100 rounded-lg">❝</button>
      <div className="w-px h-5 bg-gray-200 mx-0.5" />
      <button onClick={() => onFormat('polish')} className="w-10 h-9 flex items-center justify-center text-sm text-orange-500 hover:bg-orange-50 rounded-lg">✨</button>
    </div>
  );
}
