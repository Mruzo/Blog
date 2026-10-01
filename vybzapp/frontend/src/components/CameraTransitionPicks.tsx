import React from 'react';
import {
  CAMERA_TRANSITION_MOVE,
  CAMERA_TRANSITION_SNAP,
  CameraTransition,
  normalizeCameraTransition,
} from '../utils/cameraTransition';

interface CameraTransitionPicksProps {
  value?: string | null;
  onChange: (value: CameraTransition) => void;
  labelledBy?: string;
  className?: string;
}

const OPTIONS: { id: CameraTransition; label: string; hint: string }[] = [
  { id: CAMERA_TRANSITION_MOVE, label: 'Move', hint: 'Ease from the previous shot' },
  { id: CAMERA_TRANSITION_SNAP, label: 'Snap', hint: 'Cut to this shot' },
];

const CameraTransitionPicks: React.FC<CameraTransitionPicksProps> = ({
  value,
  onChange,
  labelledBy = 'cameraTransitionLabel',
  className = '',
}) => {
  const selected = normalizeCameraTransition(value);

  return (
    <div
      className={`episode-manage__castPicks font-quicksand${className ? ` ${className}` : ''}`}
      role="radiogroup"
      aria-labelledby={labelledBy}
    >
      {OPTIONS.map((option) => (
        <button
          key={option.id}
          type="button"
          role="radio"
          aria-checked={selected === option.id}
          title={option.hint}
          className={`episode-manage__castPick${selected === option.id ? ' is-selected' : ''}`}
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};

export default CameraTransitionPicks;
