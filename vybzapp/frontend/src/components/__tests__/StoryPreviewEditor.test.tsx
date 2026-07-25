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

function dial(id: string) {
  return document.getElementById(id) as HTMLInputElement;
}

describe('StoryPreviewEditor camera dials', () => {
  it('shows the same Material icon set as Comic3DViewer in edit mode', () => {
    render(
      <StoryPreviewEditor
        data={buildData()}
        onDataUpdate={jest.fn()}
        onNext={jest.fn()}
        onBack={jest.fn()}
      />
    );

    enterEditMode();

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

    fireEvent.change(dial('orbitAzimuth'), { target: { value: '45' } });
    fireEvent.change(dial('orbitPolar'), { target: { value: '60' } });
    fireEvent.change(dial('orbitRadius'), { target: { value: '3.5' } });
    fireEvent.change(dial('targetX'), { target: { value: '1.1' } });
    fireEvent.change(dial('targetY'), { target: { value: '2.0' } });
    fireEvent.change(dial('targetZ'), { target: { value: '-0.4' } });

    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

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

    expect(dial('orbitAzimuth')).toHaveValue('10');
    expect(dial('orbitPolar')).toHaveValue('70');
    expect(dial('orbitRadius')).toHaveValue('2.5');
    expect(dial('fieldOfView')).toBeNull();
    expect(dial('zoomSpeed')).toBeNull();

    fireEvent.click(screen.getByTitle(/next dialogue/i));

    await waitFor(() => {
      expect(dial('orbitAzimuth')).toHaveValue('-20');
    });
    expect(dial('orbitPolar')).toHaveValue('80');
    expect(dial('orbitRadius')).toHaveValue('4');
    expect(dial('targetX')).toHaveValue('-1');
    expect(dial('targetY')).toHaveValue('1.8');
    expect(dial('targetZ')).toHaveValue('0.5');

    fireEvent.click(screen.getByTitle(/previous dialogue/i));

    await waitFor(() => {
      expect(dial('orbitAzimuth')).toHaveValue('10');
    });
    expect(dial('targetX')).toHaveValue('0.5');
  });

  it('hides field of view and zoom speed dials like Comic3DViewer', () => {
    render(
      <StoryPreviewEditor
        data={buildData()}
        onDataUpdate={jest.fn()}
        onNext={jest.fn()}
        onBack={jest.fn()}
      />
    );

    enterEditMode();

    expect(dial('orbitAzimuth')).toBeTruthy();
    expect(dial('fieldOfView')).toBeNull();
    expect(dial('zoomSpeed')).toBeNull();
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

    fireEvent.change(dial('orbitAzimuth'), { target: { value: '90' } });
    expect(dial('orbitAzimuth')).toHaveValue('90');

    fireEvent.click(screen.getByRole('button', { name: /^reset$/i }));

    await waitFor(() => {
      expect(dial('orbitAzimuth')).toHaveValue('10');
    });
    expect(screen.getByText(/reset to last saved values/i)).toBeInTheDocument();
  });
});
