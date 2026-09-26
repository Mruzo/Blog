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
  { key: 'azimuth', id: 'orbitAzimuth', label: 'Azimuth', icon: '360', group: 'orbit', min: -180, max: 180, step: 1, unit: '°' },
  { key: 'polar', id: 'orbitPolar', label: 'Polar', icon: '360', iconRotate: true, group: 'orbit', min: 0, max: 180, step: 1, unit: '°' },
  { key: 'radius', id: 'orbitRadius', label: 'Radius', icon: 'clock_loader_90', compactIcon: true, group: 'orbit', min: 0.1, max: 10, step: 0.1, unit: 'm' },
  { key: 'x', id: 'targetX', label: 'X', icon: 'arrow_range', group: 'target', min: -5, max: 5, step: 0.1, unit: 'm' },
  { key: 'y', id: 'targetY', label: 'Y', icon: 'arrow_range', iconRotate: true, group: 'target', min: 0, max: 3, step: 0.1, unit: 'm' },
  { key: 'z', id: 'targetZ', label: 'Z', icon: 'arrow_range', group: 'target', min: -5, max: 5, step: 0.1, unit: 'm' },
];

const ADVANCED_DIALS: DialSpec[] = [
  { key: 'fieldOfView', id: 'fieldOfView', label: 'FOV', icon: '360', group: 'advanced', min: 10, max: 90, step: 1, unit: '°' },
  { key: 'zoomSpeed', id: 'zoomSpeed', label: 'Zoom', icon: 'clock_loader_90', compactIcon: true, group: 'advanced', min: 0.1, max: 3, step: 0.1, unit: 'x' },
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
}) => {
  const [activeKey, setActiveKey] = useState<DialKey>('azimuth');
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
      <div className="camera-dials__groups" role="radiogroup" aria-label="Camera parameter">
        <div className="camera-dials__group">
          <div className="section-header">Orbit</div>
          <div className="camera-dials__chips">
            {dials.filter((dial) => dial.group === 'orbit').map((dial) => (
              <DialChip
                key={dial.key}
                spec={dial}
                value={readDialValue(dial, orbit, target, fieldOfView, zoomSpeed)}
                selected={dial.key === active.key}
                onSelect={() => setActiveKey(dial.key)}
              />
            ))}
          </div>
        </div>
        <div className="camera-dials__group">
          <div className="section-header">Target</div>
          <div className="camera-dials__chips">
            {dials.filter((dial) => dial.group === 'target').map((dial) => (
              <DialChip
                key={dial.key}
                spec={dial}
                value={readDialValue(dial, orbit, target, fieldOfView, zoomSpeed)}
                selected={dial.key === active.key}
                onSelect={() => setActiveKey(dial.key)}
              />
            ))}
          </div>
        </div>
        {showAdvanced && (
          <div className="camera-dials__group camera-dials__group--wide">
            <div className="section-header">Advanced</div>
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
          </div>
        )}
      </div>

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
        <span className="value-badge" id={`${active.id}Value`}>
          {formatBadge(activeValue, active.unit)}
        </span>
      </div>

      <div className="current-values-box">
        <h6 className="text-primary mb-2">{savedHeading}</h6>
        <div>
          <strong>Camera Orbit:</strong>{' '}
          <span id="currentOrbit">{savedOrbit || formatCameraOrbit(orbit)}</span>
        </div>
        <div>
          <strong>Camera Target:</strong>{' '}
          <span id="currentTarget">{savedTarget || formatCameraTarget(target)}</span>
        </div>
        {showAdvanced && (
          <>
            <div>
              <strong>Field of View:</strong> <span>{fieldOfView}°</span>
            </div>
            <div>
              <strong>Zoom Speed:</strong> <span>{zoomSpeed}</span>
            </div>
          </>
        )}
        {saveMessage && (
          <div
            className={`mt-2 small ${saveMessage.type === 'success' ? 'text-success' : 'text-danger'}`}
            role="status"
          >
            {saveMessage.text}
          </div>
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
          fontSize: spec.compactIcon ? '1.1rem' : '1.25rem',
          transform: spec.iconRotate ? 'rotate(90deg)' : undefined,
          fontVariationSettings: spec.compactIcon ? "'FILL' 0, 'GRAD' 0" : "'FILL' 1",
        }}
        aria-hidden="true"
      >
        {spec.icon}
      </span>
      <span className="camera-dials__chipLabel">{spec.label}</span>
      <span className="camera-dials__chipValue">{formatBadge(value, spec.unit)}</span>
    </button>
  );
}

export default CameraDials;
