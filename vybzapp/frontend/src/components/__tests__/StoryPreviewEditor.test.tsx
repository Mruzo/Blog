import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import StoryPreviewEditor from '../StoryPreviewEditor';
import { StoryCreationData } from '../StoryCreationWizard';

const baseDialogue = {
  scene_title: '',
  scene_description: '',
  shot_type: '',
  rotation: '0deg 0deg 0deg',
};

function buildData(overrides?: Partial<StoryCreationData>): StoryCreationData {
  return {
    story: { title: 'Dial Test', description: 'Desc', is_public: false },
    season: { title: 'Season 1', season_number: 1, description: '', release_date: '2024-01-01' },
    episode: {
      title: 'Episode 1',
      episode_number: 1,
      description: '',
      summary: '',
      is_published: false,
    },
    characters: [{ id: 1, name: 'Ava', bio: '', personality: '', love_interest: '' }],
    dialogues: [
      {
        id: 10,
        character: 1,
        text: 'Line one',
        order: 1,
        camera_orbit: '10deg 70deg 2.5m',
        camera_target: '0.5m 1.5m -0.2m',
        field_of_view: 40,
        zoom_speed: 1.2,
        ...baseDialogue,
      },
      {
        id: 11,
        character: 1,
        text: 'Line two',
        order: 2,
        camera_orbit: '-20deg 80deg 4m',
        camera_target: '-1m 1.8m 0.5m',
        field_of_view: 55,
        zoom_speed: 0.8,
        ...baseDialogue,
      },
    ],
    model: {
      file: null,
      file_url: 'https://example.com/scene.glb',
      format: 'glb',
      previewUrl: 'https://example.com/scene.glb',
      usesSharedModel: true,
    },
    cameraPosition: '',
    cameraTarget: '',
    publish: { is_published: false, publish_date: '' },
    ...overrides,
  };
}

function enterEditMode() {
  fireEvent.click(screen.getByRole('button', { name: /edit mode/i }));
}

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

function expectDialValue(id: string, value: string) {
  fireEvent.click(chip(id));
  expect(slider()).toHaveValue(value);
}

describe('StoryPreviewEditor camera dials', () => {
  beforeEach(() => {
    window.localStorage.removeItem('vybzDialogueCameraAnimate');
  });

  it('shows CameraDials icons in edit mode', () => {
    render(
      <StoryPreviewEditor
        data={buildData()}
        onDataUpdate={jest.fn()}
        onNext={jest.fn()}
        onBack={jest.fn()}
      />
    );

    enterEditMode();
    expect(document.querySelector('.comic-3d-viewer')).toHaveClass('is-editing');

    const icons = Array.from(document.querySelectorAll('.material-symbols-outlined')).map(
      (el) => el.textContent?.trim()
    );

    expect(icons).toEqual(
      expect.arrayContaining(['360', '360', 'clock_loader_90', 'arrow_range', 'arrow_range', 'arrow_range'])
    );
    expect(icons.filter((icon) => icon === 'arrow_range')).toHaveLength(3);
    expect(icons.filter((icon) => icon === '360')).toHaveLength(2);
  });

  it('serializes dial values into dialogue camera fields on Save', async () => {
    const onDataUpdate = jest.fn();
    render(
      <StoryPreviewEditor
        data={buildData()}
        onDataUpdate={onDataUpdate}
        onNext={jest.fn()}
        onBack={jest.fn()}
      />
    );

    enterEditMode();

    setDial('orbitAzimuth', '45');
    setDial('orbitPolar', '60');
    setDial('orbitRadius', '3.5');
    setDial('targetX', '1.1');
    setDial('targetY', '2.0');
    setDial('targetZ', '-0.4');

    fireEvent.click(screen.getByRole('button', { name: /save camera/i }));

    await waitFor(() => {
      expect(onDataUpdate).toHaveBeenCalled();
    });

    const payload = onDataUpdate.mock.calls[0][0];
    expect(payload.dialogues[0]).toEqual(
      expect.objectContaining({
        id: 10,
        camera_orbit: '45deg 60deg 3.5m',
        camera_target: '1.1m 2m -0.4m',
        // FOV / zoom dials are hidden; existing dialogue values are preserved
        field_of_view: 40,
        zoom_speed: 1.2,
      })
    );
    // Other dialogue framing stays untouched
    expect(payload.dialogues[1]).toEqual(
      expect.objectContaining({
        id: 11,
        camera_orbit: '-20deg 80deg 4m',
        camera_target: '-1m 1.8m 0.5m',
        field_of_view: 55,
        zoom_speed: 0.8,
      })
    );
    expect(screen.getByText(/camera saved for this dialogue/i)).toBeInTheDocument();
  });

  it('restores each dialogue line camera when navigating Next/Previous', async () => {
    render(
      <StoryPreviewEditor
        data={buildData()}
        onDataUpdate={jest.fn()}
        onNext={jest.fn()}
        onBack={jest.fn()}
      />
    );

    enterEditMode();

    expectDialValue('orbitAzimuth', '10');
    expectDialValue('orbitPolar', '70');
    expectDialValue('orbitRadius', '2.5');
    expect(chip('fieldOfView')).toBeNull();
    expect(chip('zoomSpeed')).toBeNull();

    fireEvent.click(screen.getByTitle(/next dialogue/i));

    await waitFor(() => {
      expectDialValue('orbitAzimuth', '-20');
    });
    expectDialValue('orbitPolar', '80');
    expectDialValue('orbitRadius', '4');
    expectDialValue('targetX', '-1');
    expectDialValue('targetY', '1.8');
    expectDialValue('targetZ', '0.5');

    fireEvent.click(screen.getByTitle(/previous dialogue/i));

    await waitFor(() => {
      expectDialValue('orbitAzimuth', '10');
    });
    expectDialValue('targetX', '0.5');
  });

  it('keeps the current line when camera dials change after leaving the first line', () => {
    render(
      <StoryPreviewEditor
        data={buildData()}
        onDataUpdate={jest.fn()}
        onNext={jest.fn()}
        onBack={jest.fn()}
      />
    );

    enterEditMode();
    fireEvent.click(screen.getByTitle(/next dialogue/i));
    expect(screen.getByText(/line two/i)).toBeInTheDocument();

    setDial('orbitAzimuth', '90');

    expect(screen.getByText(/line two/i)).toBeInTheDocument();
    expect(screen.queryByText(/line one/i)).not.toBeInTheDocument();
    expectDialValue('orbitAzimuth', '90');
  });

  it('hides field of view and zoom speed dials', () => {
    render(
      <StoryPreviewEditor
        data={buildData()}
        onDataUpdate={jest.fn()}
        onNext={jest.fn()}
        onBack={jest.fn()}
      />
    );

    enterEditMode();

    expect(chip('orbitAzimuth')).toBeTruthy();
    expect(chip('fieldOfView')).toBeNull();
    expect(chip('zoomSpeed')).toBeNull();
    expect(screen.queryByText(/field of view/i)).toBeNull();
    expect(screen.queryByText(/zoom speed/i)).toBeNull();
  });
  it('resets dials to the last saved values for the current line', async () => {
    render(
      <StoryPreviewEditor
        data={buildData()}
        onDataUpdate={jest.fn()}
        onNext={jest.fn()}
        onBack={jest.fn()}
      />
    );

    enterEditMode();

    setDial('orbitAzimuth', '90');
    expectDialValue('orbitAzimuth', '90');

    fireEvent.click(screen.getByRole('button', { name: /^reset$/i }));

    await waitFor(() => {
      expectDialValue('orbitAzimuth', '10');
    });
    expect(screen.getByText(/reset to last saved values/i)).toBeInTheDocument();
  });

  it('saves snap on the current line and cuts when that line plays', () => {
    const onDataUpdate = jest.fn();
    const data = buildData();
    const { rerender } = render(
      <StoryPreviewEditor
        data={data}
        onDataUpdate={onDataUpdate}
        onNext={jest.fn()}
        onBack={jest.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Animate camera' }));
    expect(onDataUpdate).toHaveBeenCalledWith({
      dialogues: [
        expect.objectContaining({ id: 10, camera_transition: 'snap' }),
        expect.objectContaining({ id: 11 }),
      ],
    });

    const withSnapOnSecond = buildData({
      dialogues: data.dialogues.map((dialogue, index) =>
        index === 1 ? { ...dialogue, camera_transition: 'snap' } : dialogue
      ),
    });
    rerender(
      <StoryPreviewEditor
        data={withSnapOnSecond}
        onDataUpdate={onDataUpdate}
        onNext={jest.fn()}
        onBack={jest.fn()}
      />
    );

    const modelViewer = document.querySelector('model-viewer') as HTMLElement & {
      jumpCameraToGoal?: jest.Mock;
    };
    const jumpCameraToGoal = jest.fn();
    modelViewer.jumpCameraToGoal = jumpCameraToGoal;

    fireEvent.click(screen.getByTitle(/next dialogue/i));
    expect(jumpCameraToGoal).toHaveBeenCalled();
  });
});
