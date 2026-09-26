import React from 'react';

export const PLAYBACK_SPEED_1X_MS = 5000;
export const PLAYBACK_SPEED_1_5X_MS = 3333;

export const PLAYBACK_SPEEDS = [
  { label: '1x', ms: PLAYBACK_SPEED_1X_MS },
  { label: '1.5x', ms: PLAYBACK_SPEED_1_5X_MS },
] as const;

export interface DialoguePlaybackBarProps {
  current: number;
  total: number;
  progressPercent?: number;
  progressLabel?: string;
  isPlaying: boolean;
  playSpeed: number;
  onPrevious: () => void;
  onNext: () => void;
  onTogglePlay: () => void;
  onSpeedChange: (ms: number) => void;
  previousDisabled?: boolean;
  nextDisabled?: boolean;
  previousTitle?: string;
  nextTitle?: string;
  showFullscreen?: boolean;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  className?: string;
}

const DialoguePlaybackBar: React.FC<DialoguePlaybackBarProps> = ({
  current,
  total,
  progressPercent,
  progressLabel,
  isPlaying,
  playSpeed,
  onPrevious,
  onNext,
  onTogglePlay,
  onSpeedChange,
  previousDisabled = false,
  nextDisabled = false,
  previousTitle,
  nextTitle,
  showFullscreen = false,
  isFullscreen = false,
  onToggleFullscreen,
  className = '',
}) => {
  const percent =
    typeof progressPercent === 'number'
      ? progressPercent
      : total > 0
        ? (current / total) * 100
        : 0;
  const label = progressLabel ?? `${current} / ${total}`;

  return (
    <div className={`dialogue-playback-bar${className ? ` ${className}` : ''}`}>
      <div className="row mt-2 comic3d-stage-progress">
        <div className="col-12">
          <div className="d-flex align-items-center gap-3">
            <div className="progress flex-grow-1" style={{ height: '8px' }}>
              <div
                className="progress-bar bg-success"
                style={{ width: `${percent}%`, transition: 'width 0.3s ease' }}
              />
            </div>
            <div
              className="text-end comic3d-stage-progress-count"
              style={{ fontSize: '0.8rem', minWidth: '40px' }}
            >
              <span>{label}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="row mt-2 comic3d-stage-nav">
        <div className="col-12">
          <div className="card bg-transparent border-0">
            <div className="card-body p-0">
              <div className="row justify-content-between align-items-center">
                <div className="col-auto">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={onPrevious}
                    disabled={previousDisabled}
                    title={previousTitle}
                    aria-label="Previous dialogue"
                  >
                    <i className="fas fa-chevron-left" aria-hidden="true"></i>
                  </button>
                </div>

                <div className="col-auto d-flex align-items-center gap-2">
                  <button
                    type="button"
                    className="btn btn-success"
                    onClick={onTogglePlay}
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                  >
                    <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'}`} aria-hidden="true"></i>
                  </button>

                  <div className="btn-group comic3d-play-speed" role="group" aria-label="Playback speed">
                    {PLAYBACK_SPEEDS.map((speed) => (
                      <button
                        key={speed.ms}
                        type="button"
                        className={`btn btn-sm ${playSpeed === speed.ms ? 'btn-primary' : 'btn-outline-secondary'}`}
                        onClick={() => onSpeedChange(speed.ms)}
                      >
                        {speed.label}
                      </button>
                    ))}
                  </div>

                  {showFullscreen && (
                    <button
                      type="button"
                      className="btn btn-outline-secondary comic3d-fullscreen-toggle"
                      onClick={onToggleFullscreen}
                      aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                      title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                    >
                      <i
                        className={`fas ${isFullscreen ? 'fa-compress' : 'fa-expand'}`}
                        aria-hidden="true"
                      />
                    </button>
                  )}
                </div>

                <div className="col-auto">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={onNext}
                    disabled={nextDisabled}
                    title={nextTitle}
                    aria-label="Next dialogue"
                  >
                    <i className="fas fa-chevron-right" aria-hidden="true"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DialoguePlaybackBar;
