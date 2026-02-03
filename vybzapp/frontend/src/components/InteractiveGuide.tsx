import React, { useEffect, useState } from 'react';
import { useGuide } from '../contexts/GuideContext';

// FAB is bottom: 30px (desktop) / 20px (mobile), height ~60px → top of FAB ~90px / 80px from viewport bottom.
// Position tooltip by bottom so it always sits above the FAB with a gap.
const TOOLTIP_BOTTOM_PX = 100; // tooltip bottom edge = 100px from viewport bottom (above FAB)

/** Renders summary text with **bold** segments as <strong>. */
function renderSummary(text: string): React.ReactNode {
  const parts = text.split(/(\*\*.+?\*\*)/g);
  return parts.map((part, i) => {
    const match = part.match(/\*\*(.+?)\*\*/);
    return match ? <strong key={i}>{match[1]}</strong> : part;
  });
}

const InteractiveGuide: React.FC = () => {
  const { currentGuide, isRunning, stopGuide } = useGuide();
  const [tooltipPosition, setTooltipPosition] = useState<{ bottom: number; left: number } | null>(null);

  useEffect(() => {
    if (!isRunning || !currentGuide) {
      setTooltipPosition(null);
      return;
    }

    const isMobile = window.innerWidth <= 768;
    const bottom = TOOLTIP_BOTTOM_PX;
    let left: number;

    if (isMobile) {
      left = window.innerWidth / 2;
    } else {
      left = window.innerWidth * 0.85;
    }

    // Keep horizontal position within viewport
    const maxWidth = isMobile ? window.innerWidth * 0.9 : 360;
    if (left < maxWidth / 2 + 20) left = maxWidth / 2 + 20;
    if (left > window.innerWidth - maxWidth / 2 - 20) left = window.innerWidth - maxWidth / 2 - 20;

    setTooltipPosition({ bottom, left });
  }, [isRunning, currentGuide]);

  if (!isRunning || !currentGuide || !tooltipPosition) {
    return null;
  }

  const isMobile = window.innerWidth <= 768;

  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.35)',
          zIndex: 9998,
          pointerEvents: 'auto',
        }}
        onClick={stopGuide}
      />

      <div
        className="font-quicksand"
        style={{
          position: 'fixed',
          bottom: `${tooltipPosition.bottom}px`,
          left: `${tooltipPosition.left}px`,
          transform: 'translateX(-50%)',
          backgroundColor: '#fff',
          borderRadius: '10px',
          padding: isMobile ? 18 : 28,
          width: isMobile ? `calc(80% - 16px)` : undefined,
          maxWidth: isMobile ? `calc(100% - 16px)` : 360,
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.2)',
          zIndex: 10000,
          pointerEvents: 'auto',
          fontFamily: 'quicksand, sans-serif',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="subtext-btn-xs"
          style={{
            color: '#414042',
            marginBottom: '10px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            borderBottom: '1px solid #414042',
          }}
        >
          {currentGuide.name}
        </div>

        <div
          className="subtext-sm"
          style={{
            color: '#414042',
            lineHeight: 1.55,
            marginBottom: '18px',
            
          }}
        >
          {renderSummary(currentGuide.summary)}
        </div>

        <button
          type="button"
          onClick={stopGuide}
          className="btn btn-primary"
          style={{
            padding: '10px 16px',
            cursor: 'pointer',
          }}
        >
          Got it
        </button>
      </div>
    </>
  );
};

export default InteractiveGuide;
