import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CameraDials, {
  DEFAULT_CAMERA_ORBIT,
  DEFAULT_CAMERA_TARGET,
  formatCameraOrbit,
  formatCameraTarget,
  parseCameraOrbit,
  parseCameraTarget,
} from '../CameraDials';

function renderDials(
  overrides: Partial<React.ComponentProps<typeof CameraDials>> = {}
) {
  const onOrbitChange = jest.fn();
  const onTargetChange = jest.fn();
  render(
    <CameraDials
      orbit={DEFAULT_CAMERA_ORBIT}
      target={DEFAULT_CAMERA_TARGET}
      onOrbitChange={onOrbitChange}
      onTargetChange={onTargetChange}
      savedOrbit="10deg 70deg 2.5m"
      savedTarget="0.5m 1.5m -0.2m"
      {...overrides}
    />
  );
  return { onOrbitChange, onTargetChange };
}

describe('CameraDials', () => {
  function chip(id: string) {
    return document.getElementById(id) as HTMLElement;
  }

  function slider() {
    return document.getElementById('cameraDial') as HTMLInputElement;
  }

  function setDial(id: string, value: string) {
    fireEvent.click(chip(id));
    fireEvent.change(slider(), { target: { value } });
  }

  it('renders orbit and target indicator chips with the shared icon set', () => {
    renderDials();

    expect(chip('orbitAzimuth')).toBeTruthy();
    expect(chip('orbitPolar')).toBeTruthy();
    expect(chip('orbitRadius')).toBeTruthy();
    expect(chip('targetX')).toBeTruthy();
    expect(chip('targetY')).toBeTruthy();
    expect(chip('targetZ')).toBeTruthy();
    expect(slider()).toBeTruthy();

    const icons = Array.from(document.querySelectorAll('.material-symbols-outlined')).map(
      (el) => el.textContent?.trim()
    );
    expect(icons).toEqual(
      expect.arrayContaining(['360', '360', 'clock_loader_90', 'arrow_range', 'arrow_range', 'arrow_range'])
    );
    expect(icons.filter((icon) => icon === 'arrow_range')).toHaveLength(3);
    expect(icons.filter((icon) => icon === '360')).toHaveLength(2);
  });

  it('hides field of view and zoom speed by default', () => {
    renderDials();

    expect(document.getElementById('fieldOfView')).toBeNull();
    expect(document.getElementById('zoomSpeed')).toBeNull();
    expect(screen.queryByText(/field of view/i)).toBeNull();
    expect(screen.queryByText(/zoom speed/i)).toBeNull();
  });

  it('nudges the active camera value with plus and minus', () => {
    const { onOrbitChange } = renderDials();

    fireEvent.click(screen.getByRole('button', { name: 'Increase Azimuth' }));
    expect(onOrbitChange).toHaveBeenCalledWith({ ...DEFAULT_CAMERA_ORBIT, azimuth: 1 });

    fireEvent.click(screen.getByRole('button', { name: 'Decrease Azimuth' }));
    expect(onOrbitChange).toHaveBeenCalledWith({ ...DEFAULT_CAMERA_ORBIT, azimuth: -1 });
  });

  it('emits orbit and target changes from the shared slider', () => {
    const { onOrbitChange, onTargetChange } = renderDials();

    setDial('orbitAzimuth', '45');
    expect(onOrbitChange).toHaveBeenCalledWith({ ...DEFAULT_CAMERA_ORBIT, azimuth: 45 });

    setDial('targetX', '1.1');
    expect(onTargetChange).toHaveBeenCalledWith({ ...DEFAULT_CAMERA_TARGET, x: 1.1 });
  });

  it('retargets the slider when a different indicator is selected', () => {
    renderDials();

    expect(chip('orbitAzimuth')).toHaveAttribute('aria-checked', 'true');
    expect(slider()).toHaveAttribute('aria-label', 'Azimuth');
    expect(slider()).toHaveValue('0');

    fireEvent.click(chip('orbitRadius'));
    expect(chip('orbitRadius')).toHaveAttribute('aria-checked', 'true');
    expect(slider()).toHaveAttribute('aria-label', 'Radius');
    expect(slider()).toHaveValue('3');
    expect(slider().min).toBe('0.1');
    expect(slider().max).toBe('10');
  });

  it('shows last-saved orbit and target strings', () => {
    renderDials();

    expect(screen.getByText('10deg 70deg 2.5m')).toBeInTheDocument();
    expect(screen.getByText('0.5m 1.5m -0.2m')).toBeInTheDocument();
  });

  it('explains that the values under the slider are last saved', () => {
    renderDials();

    fireEvent.click(screen.getByRole('button', { name: /about saved camera values/i }));
    expect(screen.getByText(/last saved camera/i)).toBeInTheDocument();
    expect(screen.getByText(/live preview until you save/i)).toBeInTheDocument();
  });

  it('parses and formats camera strings', () => {
    expect(parseCameraOrbit('45deg 60deg 3.5m')).toEqual({
      azimuth: 45,
      polar: 60,
      radius: 3.5,
    });
    expect(parseCameraTarget('1.1m 2m -0.4m')).toEqual({ x: 1.1, y: 2, z: -0.4 });
    expect(formatCameraOrbit({ azimuth: 45, polar: 60, radius: 3.5 })).toBe('45deg 60deg 3.5m');
    expect(formatCameraTarget({ x: 1.1, y: 2, z: -0.4 })).toBe('1.1m 2m -0.4m');
  });
});
