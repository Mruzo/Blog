import React, { useState } from 'react';

export type CameraOrbit = {
  azimuth: number;
  polar: number;
  radius: number;
};

export type CameraTarget = {
  x: number;
  y: number;
  z: number;
};

export type CameraDialValues = {
  orbit: CameraOrbit;
  target: CameraTarget;
  fieldOfView?: number;
  zoomSpeed?: number;
};

export const DEFAULT_CAMERA_ORBIT: CameraOrbit = { azimuth: 0, polar: 75, radius: 3 };
export const DEFAULT_CAMERA_TARGET: CameraTarget = { x: 0, y: 1.6, z: 0 };

export function formatCameraOrbit(orbit: CameraOrbit): string {
  return `${orbit.azimuth}deg ${orbit.polar}deg ${orbit.radius}m`;
}

export function formatCameraTarget(target: CameraTarget): string {
  return `${target.x}m ${target.y}m ${target.z}m`;
}

export function parseCameraOrbit(orbitStr: string | undefined | null): CameraOrbit {
  const match = orbitStr?.match(/(-?\d+(?:\.\d+)?)deg\s+(-?\d+(?:\.\d+)?)deg\s+(-?\d+(?:\.\d+)?)m/);
  if (!match) {
    return { ...DEFAULT_CAMERA_ORBIT };
  }
  return {
    azimuth: parseFloat(match[1]),
    polar: parseFloat(match[2]),
    radius: parseFloat(match[3]),
  };
}

export function parseCameraTarget(targetStr: string | undefined | null): CameraTarget {
  const match = targetStr?.match(/(-?\d+(?:\.\d+)?)m\s+(-?\d+(?:\.\d+)?)m\s+(-?\d+(?:\.\d+)?)m/);
  if (!match) {
    return { ...DEFAULT_CAMERA_TARGET };
  }
  return {
    x: parseFloat(match[1]),
    y: parseFloat(match[2]),
    z: parseFloat(match[3]),
  };
}

type DialKey = 'azimuth' | 'polar' | 'radius' | 'x' | 'y' | 'z' | 'fieldOfView' | 'zoomSpeed';
type DialGroup = 'orbit' | 'target' | 'advanced';

type DialSpec = {
  key: DialKey;
  id: string;
  label: string;
  shortLabel: string;
  icon: string;
  iconRotate?: boolean;
  compactIcon?: boolean;
  group: DialGroup;
  min: number;
  max: number;
  step: number;
  unit: '°' | 'm' | 'x';
};

const BASE_DIALS: DialSpec[] = [
  { key: 'azimuth', id: 'orbitAzimuth', label: 'Azimuth', shortLabel: 'Az', icon: '360', group: 'orbit', min: -180, max: 180, step: 1, unit: '°' },
  { key: 'polar', id: 'orbitPolar', label: 'Polar', shortLabel: 'Pol', icon: '360', iconRotate: true, group: 'orbit', min: 0, max: 180, step: 1, unit: '°' },
  { key: 'radius', id: 'orbitRadius', label: 'Radius', shortLabel: 'Rad', icon: 'clock_loader_90', compactIcon: true, group: 'orbit', min: 0.1, max: 10, step: 0.1, unit: 'm' },
  { key: 'x', id: 'targetX', label: 'X', shortLabel: 'X', icon: 'arrow_range', group: 'target', min: -5, max: 5, step: 0.1, unit: 'm' },
  { key: 'y', id: 'targetY', label: 'Y', shortLabel: 'Y', icon: 'arrow_range', iconRotate: true, group: 'target', min: 0, max: 3, step: 0.1, unit: 'm' },
  { key: 'z', id: 'targetZ', label: 'Z', shortLabel: 'Z', icon: 'arrow_range', group: 'target', min: -5, max: 5, step: 0.1, unit: 'm' },
];

const ADVANCED_DIALS: DialSpec[] = [
  { key: 'fieldOfView', id: 'fieldOfView', label: 'FOV', shortLabel: 'FOV', icon: '360', group: 'advanced', min: 10, max: 90, step: 1, unit: '°' },
  { key: 'zoomSpeed', id: 'zoomSpeed', label: 'Zoom', shortLabel: 'Zoom', icon: 'clock_loader_90', compactIcon: true, group: 'advanced', min: 0.1, max: 3, step: 0.1, unit: 'x' },
];

function readDialValue(
  spec: DialSpec,
  orbit: CameraOrbit,
  target: CameraTarget,
  fieldOfView: number,
  zoomSpeed: number
): number {
  switch (spec.key) {
    case 'azimuth':
      return orbit.azimuth;
    case 'polar':
      return orbit.polar;
    case 'radius':
      return orbit.radius;
    case 'x':
      return target.x;
    case 'y':
      return target.y;
    case 'z':
      return target.z;
    case 'fieldOfView':
      return fieldOfView;
    case 'zoomSpeed':
      return zoomSpeed;
  }
}

function formatBadge(value: number, unit: DialSpec['unit']): string {
  return `${value.toFixed(1)}${unit}`;
}

export interface CameraDialsProps {
  orbit: CameraOrbit;
  target: CameraTarget;
  onOrbitChange: (orbit: CameraOrbit) => void;
  onTargetChange: (target: CameraTarget) => void;
  savedOrbit?: string;
  savedTarget?: string;
  savedHeading?: string;
  saveMessage?: { type: 'success' | 'error'; text: string } | null;
  showAdvanced?: boolean;
  fieldOfView?: number;
  zoomSpeed?: number;
  onFieldOfViewChange?: (value: number) => void;
  onZoomSpeedChange?: (value: number) => void;
  actions?: React.ReactNode;
}

const CameraDials: React.FC<CameraDialsProps> = ({
  orbit,
  target,
  onOrbitChange,
  onTargetChange,
  savedOrbit,
  savedTarget,
  savedHeading = 'Values (Last Saved)',
  saveMessage,
  showAdvanced = false,
  fieldOfView = 45,
  zoomSpeed = 1,
  onFieldOfViewChange,
  onZoomSpeedChange,
  actions,
}) => {
  const [activeKey, setActiveKey] = useState<DialKey>('azimuth');
  const [showSavedHint, setShowSavedHint] = useState(false);
  const dials = showAdvanced ? [...BASE_DIALS, ...ADVANCED_DIALS] : BASE_DIALS;
  const active = dials.find((dial) => dial.key === activeKey) || BASE_DIALS[0];
  const activeValue = readDialValue(active, orbit, target, fieldOfView, zoomSpeed);

  const applyValue = (value: number) => {
    if (active.group === 'orbit') {
      onOrbitChange({ ...orbit, [active.key]: value } as CameraOrbit);
      return;
    }
    if (active.group === 'target') {
      onTargetChange({ ...target, [active.key]: value } as CameraTarget);
      return;
    }
    if (active.key === 'fieldOfView') {
      onFieldOfViewChange?.(value);
      return;
    }
    onZoomSpeedChange?.(value);
  };

  return (
    <div className="camera-dials">
      {actions && <div className="camera-dials__actions">{actions}</div>}
      <div className="camera-dials__chips" role="radiogroup" aria-label="Camera parameter">
        {dials.filter((dial) => dial.group !== 'advanced').map((dial) => (
          <DialChip
            key={dial.key}
            spec={dial}
            value={readDialValue(dial, orbit, target, fieldOfView, zoomSpeed)}
            selected={dial.key === active.key}
            onSelect={() => setActiveKey(dial.key)}
          />
        ))}
      </div>
      {showAdvanced && (
        <div className="camera-dials__chips">
          {dials.filter((dial) => dial.group === 'advanced').map((dial) => (
            <DialChip
              key={dial.key}
              spec={dial}
              value={readDialValue(dial, orbit, target, fieldOfView, zoomSpeed)}
              selected={dial.key === active.key}
              onSelect={() => setActiveKey(dial.key)}
            />
          ))}
        </div>
      )}

      <div className="slider-row">
        <input
          key={active.key}
          type="range"
          id="cameraDial"
          className="form-range modern-slider"
          style={{ flex: 1 }}
          min={active.min}
          max={active.max}
          step={active.step}
          value={activeValue}
          aria-label={active.label}
          onChange={(e) => applyValue(parseFloat(e.target.value))}
        />
      </div>

      <div className="current-values-box">
        <button
          type="button"
          className="camera-dials__info"
          aria-expanded={showSavedHint}
          aria-controls="cameraSavedHint"
          title="These are the last saved camera values. The slider above changes the live preview until you Save."
          onClick={() => setShowSavedHint((open) => !open)}
        >
          <i className="fas fa-info-circle" aria-hidden="true"></i>
          <span className="sr-only">About saved camera values</span>
        </button>
        <span className="sr-only">{savedHeading}</span>
        {showSavedHint && (
          <span id="cameraSavedHint" className="camera-dials__hint" role="note">
            Last saved camera. The slider above edits the live preview until you Save.
          </span>
        )}
        <span id="currentOrbit">{savedOrbit || formatCameraOrbit(orbit)}</span>
        <span aria-hidden="true"> · </span>
        <span id="currentTarget">{savedTarget || formatCameraTarget(target)}</span>
        {showAdvanced && (
          <>
            <span aria-hidden="true"> · </span>
            <span>{fieldOfView}°</span>
            <span aria-hidden="true"> · </span>
            <span>{zoomSpeed}x</span>
          </>
        )}
        {saveMessage && (
          <span
            className={`current-values-box__message ${saveMessage.type === 'success' ? 'text-success' : 'text-danger'}`}
            role="status"
          >
            {saveMessage.text}
          </span>
        )}
      </div>
    </div>
  );
};

function DialChip({
  spec,
  value,
  selected,
  onSelect,
}: {
  spec: DialSpec;
  value: number;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      id={spec.id}
      aria-checked={selected}
      aria-label={`${spec.label} ${formatBadge(value, spec.unit)}`}
      className={`camera-dials__chip${selected ? ' is-active' : ''}`}
      onClick={onSelect}
    >
      <span
        className="material-symbols-outlined"
        style={{
          fontSize: spec.compactIcon ? '0.95rem' : '1rem',
          transform: spec.iconRotate ? 'rotate(90deg)' : undefined,
          fontVariationSettings: spec.compactIcon ? "'FILL' 0, 'GRAD' 0" : "'FILL' 1",
        }}
        aria-hidden="true"
      >
        {spec.icon}
      </span>
      <span className="camera-dials__chipLabel">{spec.shortLabel}</span>
      <span className="camera-dials__chipValue">{formatBadge(value, spec.unit)}</span>
    </button>
  );
}

export default CameraDials;
