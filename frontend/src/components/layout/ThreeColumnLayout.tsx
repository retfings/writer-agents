import { useState, useEffect } from 'react';

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
  focusMode?: boolean;
}

export default function ThreeColumnLayout({
  left, center, right,
  leftWidth = 280, rightWidth = 360,
  leftCollapsed = false, rightCollapsed = false,
  onToggleLeft: _onToggleLeft, onToggleRight: _onToggleRight,
  hideLeft = false, hideRight = false,
  focusMode = false,
}: ThreeColumnLayoutProps) {
  const [isDraggingLeft, setIsDraggingLeft] = useState(false);
  const [isDraggingRight, setIsDraggingRight] = useState(false);
  const [lw, setLw] = useState(leftWidth);
  const [rw, setRw] = useState(rightWidth);

  useEffect(() => {
    setLw(leftWidth);
    setRw(rightWidth);
  }, [leftWidth, rightWidth]);

  useEffect(() => {
    if (isDraggingLeft || isDraggingRight) {
      const onMove = (e: MouseEvent) => {
        if (isDraggingLeft) setLw(Math.max(200, Math.min(500, e.clientX)));
        if (isDraggingRight) setRw(Math.max(260, Math.min(600, window.innerWidth - e.clientX)));
      };
      const onUp = () => {
        setIsDraggingLeft(false);
        setIsDraggingRight(false);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
      // Safety: reset after 5s if somehow mouseup never fires
      const safety = setTimeout(onUp, 5000);
      return () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        clearTimeout(safety);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        setIsDraggingLeft(false);
        setIsDraggingRight(false);
      };
    }
  }, [isDraggingLeft, isDraggingRight]);

  const sidebarHidden = leftCollapsed || hideLeft || focusMode;
  const aiHidden = rightCollapsed || hideRight || focusMode;

  // Desktop layout: three columns
  return (
    <>
      {/* Mobile layout: single column */}
      <div className="flex lg:hidden h-full min-h-0">
        <div className="flex-1 min-w-0 overflow-hidden">
          {center}
        </div>
      </div>

      {/* Desktop layout: three columns */}
      <div className="hidden lg:flex h-full min-h-0">
        {/* Left Panel */}
        {!hideLeft && (
          <div
            className={`border-r border-gray-200 bg-white overflow-hidden flex-shrink-0 transition-all duration-300 ${
              sidebarHidden ? 'w-0 border-r-0 opacity-0' : ''
            }`}
            style={{ width: sidebarHidden ? 0 : lw }}
          >
            <div style={{ width: lw }} className="h-full overflow-y-auto">
              {left}
            </div>
          </div>
        )}

        {/* Left resize handle */}
        {!hideLeft && !sidebarHidden && (
          <div
            className="w-1 cursor-col-resize bg-transparent hover:bg-orange-300 active:bg-orange-400 transition-colors flex-shrink-0"
            onMouseDown={() => setIsDraggingLeft(true)}
          />
        )}

        {/* Center Panel */}
        <div className="flex-1 min-w-0 overflow-hidden">
          {center}
        </div>

        {/* Right resize handle */}
        {!hideRight && !aiHidden && (
          <div
            className="w-1 cursor-col-resize bg-transparent hover:bg-orange-300 active:bg-orange-400 transition-colors flex-shrink-0"
            onMouseDown={() => setIsDraggingRight(true)}
          />
        )}

        {/* Right Panel */}
        {!hideRight && (
          <div
            className={`border-l border-gray-200 bg-white overflow-hidden flex-shrink-0 transition-all duration-300 ${
              aiHidden ? 'w-0 border-l-0 opacity-0' : ''
            }`}
            style={{ width: aiHidden ? 0 : rw }}
          >
            <div style={{ width: rw }} className="h-full overflow-y-auto">
              {right}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
