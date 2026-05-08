import { useState, useCallback, useEffect } from 'react';

interface ThreeColumnLayoutProps {
  left: React.ReactNode;
  center: React.ReactNode;
  right: React.ReactNode;
  leftWidth?: number;
  rightWidth?: number;
  leftCollapsed?: boolean;
  rightCollapsed?: boolean;
  onToggleLeft?: () => void;
  onToggleRight?: () => void;
  hideLeft?: boolean;
  hideRight?: boolean;
}

export default function ThreeColumnLayout({
  left, center, right,
  leftWidth = 280, rightWidth = 360,
  leftCollapsed = false, rightCollapsed = false,
  onToggleLeft: _onToggleLeft, onToggleRight: _onToggleRight,
  hideLeft = false, hideRight = false,
}: ThreeColumnLayoutProps) {
  const [isDraggingLeft, setIsDraggingLeft] = useState(false);
  const [isDraggingRight, setIsDraggingRight] = useState(false);
  const [lw, setLw] = useState(leftWidth);
  const [rw, setRw] = useState(rightWidth);

  useEffect(() => {
    setLw(leftWidth);
    setRw(rightWidth);
  }, [leftWidth, rightWidth]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDraggingLeft) {
      setLw(Math.max(200, Math.min(500, e.clientX)));
    }
    if (isDraggingRight) {
      setRw(Math.max(260, Math.min(600, window.innerWidth - e.clientX)));
    }
  }, [isDraggingLeft, isDraggingRight]);

  const handleMouseUp = useCallback(() => {
    setIsDraggingLeft(false);
    setIsDraggingRight(false);
  }, []);

  useEffect(() => {
    if (isDraggingLeft || isDraggingRight) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDraggingLeft, isDraggingRight, handleMouseMove, handleMouseUp]);

  return (
    <div className="flex h-full">
      {/* Left Panel */}
      {!hideLeft && (
        <div
          className={`border-r border-gray-200 bg-white overflow-hidden flex-shrink-0 transition-all duration-300 ${
            leftCollapsed ? 'w-0 border-r-0 opacity-0' : ''
          }`}
          style={{ width: leftCollapsed ? 0 : lw }}
        >
          <div style={{ width: lw }} className="h-full overflow-y-auto">
            {left}
          </div>
        </div>
      )}

      {/* Left resize handle */}
      {!hideLeft && !leftCollapsed && (
        <div
          className="w-1 cursor-col-resize bg-transparent hover:bg-orange-300 active:bg-orange-400 transition-colors flex-shrink-0 hidden lg:block"
          onMouseDown={() => setIsDraggingLeft(true)}
        />
      )}

      {/* Center Panel */}
      <div className="flex-1 min-w-0 overflow-hidden">
        {center}
      </div>

      {/* Right resize handle */}
      {!hideRight && !rightCollapsed && (
        <div
          className="w-1 cursor-col-resize bg-transparent hover:bg-orange-300 active:bg-orange-400 transition-colors flex-shrink-0 hidden lg:block"
          onMouseDown={() => setIsDraggingRight(true)}
        />
      )}

      {/* Right Panel */}
      {!hideRight && (
        <div
          className={`border-l border-gray-200 bg-white overflow-hidden flex-shrink-0 transition-all duration-300 ${
            rightCollapsed ? 'w-0 border-l-0 opacity-0' : ''
          }`}
          style={{ width: rightCollapsed ? 0 : rw }}
        >
          <div style={{ width: rw }} className="h-full overflow-y-auto">
            {right}
          </div>
        </div>
      )}
    </div>
  );
}
