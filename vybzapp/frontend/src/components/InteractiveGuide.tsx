import React, { useEffect, useState } from 'react';
import { useGuide } from '../contexts/GuideContext';
import { useDialogA11y } from '../hooks/useDialogA11y';

// Uses shared .guide-modal classes (see App.css) for uniform padding/margins. Use the same for new guide/documentation modals.

// FAB is bottom: 30px (desktop) / 20px (mobile), height ~60px → top of FAB ~90px / 80px from viewport bottom.
// Position tooltip by bottom so it always sits above the FAB with a gap.
const TOOLTIP_BOTTOM_PX = 100; // tooltip bottom edge = 100px from viewport bottom (above FAB)

/** Renders inline text with **bold** segments as <strong>. */
function renderBold(text: string): React.ReactNode {
  const parts = text.split(/(\*\*.+?\*\*)/g);
  return parts.map((part, i) => {
    const match = part.match(/\*\*(.+?)\*\*/);
    return match ? <strong key={i}>{match[1]}</strong> : part;
  });
}

/** Renders summary text: supports newlines and "Edit Mode" as a subheading. */
function renderSummary(text: string): React.ReactNode {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  return (
    <>
      {lines.map((line, i) => (
        <React.Fragment key={i}>
          {i > 0 && <br />}
          {line === 'Edit Mode' ? (
            <span
              style={{
                fontWeight: 600,
                textDecoration: 'underline',
                display: 'block',
                marginTop: '0.35rem',
                marginBottom: '0.1rem',
              }}
            >
              Edit Mode
            </span>
          ) : (
            renderBold(line)
          )}
        </React.Fragment>
      ))}
    </>
  );
}

const InteractiveGuide: React.FC = () => {
  const { currentGuide, isRunning, stopGuide } = useGuide();
  const [tooltipPosition, setTooltipPosition] = useState<{ bottom: number; left: number } | null>(null);
  const dialogRef = useDialogA11y(isRunning && !!currentGuide && !!tooltipPosition, stopGuide);

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
        aria-hidden="true"
      />

      <div
        ref={dialogRef}
        className="guide-modal font-quicksand"
        role="dialog"
        aria-modal="true"
        aria-labelledby="interactive-guide-title"
        tabIndex={-1}
        style={{
          position: 'fixed',
          bottom: `${tooltipPosition.bottom}px`,
          left: `${tooltipPosition.left}px`,
          transform: 'translateX(-50%)',
          width: isMobile ? 'calc(80% - 16px)' : 440,
          maxWidth: isMobile ? 'calc(100% - 16px)' : 440,
          zIndex: 10000,
          pointerEvents: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div id="interactive-guide-title" className="guide-modal__header">
          {currentGuide.name}
        </div>

        <div className="guide-modal__body">
          {renderSummary(currentGuide.summary)}
        </div>

        <div className="guide-modal__actions">
          <button
            type="button"
            onClick={stopGuide}
            className="btn btn-primary btn-sm"
          >
            Got it
          </button>
        </div>
      </div>
    </>
  );
};

export default InteractiveGuide;
