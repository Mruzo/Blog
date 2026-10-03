import React from 'react';
import { render, screen, fireEvent, within, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import Comic3DViewer from '../Comic3DViewer';
import apiService from '../../services/api';
import { Dialogue, Episode, Season } from '../../services/api';

jest.mock('../../services/api', () => ({
  __esModule: true,
  default: {
    getAdPlacements: jest.fn(),
    incrementEpisodeView: jest.fn(),
    trackAdEvent: jest.fn(),
  },
}));

jest.mock('../AnimationController', () => () => null);

const mockApiService = apiService as jest.Mocked<typeof apiService>;

const MODEL_URL = 'https://example.com/scene.glb';

const season: Season = {
  id: 10,
  title: 'Season 1',
  season_number: 1,
  description: 'Test season',
  release_date: '2024-01-01',
  is_public: true,
  comic: 1,
  resolved_model_gltf: MODEL_URL,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const buildEpisode = (overrides: Partial<Episode> = {}): Episode => ({
  id: 1,
  title: 'Pilot',
  episode_number: 1,
  description: 'Episode one intro',
  summary: 'Episode one summary',
  is_published: true,
  season: season.id,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

const episodes: Episode[] = [
  buildEpisode(),
  buildEpisode({ id: 2, title: 'The Next Beat', episode_number: 2 }),
  buildEpisode({ id: 3, title: 'Finale', episode_number: 3 }),
];

const buildDialogue = (overrides: Partial<Dialogue> = {}): Dialogue => ({
  id: 100,
  character: 1,
  character_name: 'Hero',
  text: 'Hello world',
  order: 1,
  scene_title: '',
  scene_description: '',
  shot_type: '',
  camera_orbit: '0deg 75deg 3m',
  camera_target: '0m 1.6m 0m',
  field_of_view: 45,
  zoom_speed: 1,
  rotation: '0deg 0deg 0deg',
  episode: 1,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

function renderViewer(overrides: {
  episodes?: Episode[];
  dialogues?: Dialogue[];
  readOnly?: boolean;
  onDialogueUpdate?: (dialogueId: number, data: Partial<Dialogue>) => void;
} = {}) {
  return render(
    <Comic3DViewer
      episodes={overrides.episodes ?? episodes}
      seasons={[season]}
      dialogues={overrides.dialogues ?? []}
      storyId={1}
      readOnly={overrides.readOnly ?? true}
      onDialogueUpdate={overrides.onDialogueUpdate}
    />,
  );
}

function startPlayback() {
  act(() => {
    fireEvent.click(screen.getByRole('button', { name: /start/i }));
  });
}

function enterFullscreen() {
  act(() => {
    fireEvent.click(screen.getByRole('button', { name: 'Enter fullscreen' }));
  });
}

describe('Comic3DViewer immersive fullscreen', () => {
  beforeEach(() => {
    document.body.classList.remove('comic3d-fullscreen-active');
    window.localStorage.removeItem('vybzDialogueCameraAnimate');
    mockApiService.getAdPlacements.mockResolvedValue([]);
    mockApiService.incrementEpisodeView.mockResolvedValue({ story_total_views: 1 });
    mockApiService.trackAdEvent.mockResolvedValue(undefined);
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0);
      return 1;
    });
  });

  afterEach(() => {
    document.body.classList.remove('comic3d-fullscreen-active');
    jest.restoreAllMocks();
  });

  it('shows the inline episode selector before immersive mode', () => {
    renderViewer();

    expect(document.querySelector('.comic3d-episode-row')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /E1: Pilot/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^E2$/i })).toBeInTheDocument();
    expect(document.querySelector('.comic3d-stage-episode-bar')).not.toBeInTheDocument();
  });

  it('enters immersive fullscreen from the chrome bar and moves episodes into the stage', () => {
    renderViewer();
    startPlayback();

    enterFullscreen();

    expect(document.querySelector('.comic3d-stage.comic3d-fullscreen')).toBeInTheDocument();
    expect(document.body).toHaveClass('comic3d-fullscreen-active');
    expect(document.querySelector('.comic3d-episode-row')).not.toBeInTheDocument();

    const episodeBar = document.querySelector('.comic3d-stage-episode-bar');
    expect(episodeBar).toBeInTheDocument();
    expect(within(episodeBar as HTMLElement).getByRole('button', { name: /E1: Pilot/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Exit fullscreen' })).toBeInTheDocument();
  });

  it('exits immersive fullscreen with Escape or the chrome toggle', () => {
    renderViewer();
    startPlayback();
    enterFullscreen();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(document.querySelector('.comic3d-fullscreen')).not.toBeInTheDocument();
    expect(document.body).not.toHaveClass('comic3d-fullscreen-active');
    expect(document.querySelector('.comic3d-episode-row')).toBeInTheDocument();

    enterFullscreen();
    fireEvent.click(screen.getByRole('button', { name: 'Exit fullscreen' }));
    expect(document.querySelector('.comic3d-fullscreen')).not.toBeInTheDocument();
  });

  it('keeps a phone-shaped stage on desktop and exits from the backdrop', () => {
    renderViewer();
    startPlayback();
    enterFullscreen();

    expect(document.querySelector('.comic3d-stage-backdrop')).toBeInTheDocument();
    fireEvent.click(document.querySelector('.comic3d-stage-backdrop') as HTMLElement);
    expect(document.querySelector('.comic3d-fullscreen')).not.toBeInTheDocument();
  });

  it('shows the next episode cover instead of the previous 3D scene', () => {
    renderViewer({
      episodes: [
        buildEpisode({ cover_image: 'https://example.com/e1.jpg' }),
        buildEpisode({
          id: 2,
          title: 'The Next Beat',
          episode_number: 2,
          cover_image: 'https://example.com/e2.jpg',
        }),
      ],
    });

    expect(screen.getByAltText(/Pilot cover/i)).toHaveAttribute('src', 'https://example.com/e1.jpg');
    startPlayback();
    expect(document.querySelector('model-viewer')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^E2$/i }));

    expect(document.querySelector('model-viewer')).not.toBeInTheDocument();
    expect(screen.getByAltText(/The Next Beat cover/i)).toHaveAttribute('src', 'https://example.com/e2.jpg');
    expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument();
  });

  it('keeps immersive fullscreen when switching episodes that share the same model', () => {
    renderViewer();
    startPlayback();
    enterFullscreen();

    fireEvent.click(within(document.querySelector('.comic3d-stage-episode-bar') as HTMLElement).getByRole('button', { name: /^E2$/i }));

    expect(document.querySelector('.comic3d-stage.comic3d-fullscreen')).toBeInTheDocument();
    expect(document.body).toHaveClass('comic3d-fullscreen-active');
    expect(screen.getByRole('button', { name: /E2: The Next Beat/i })).toBeInTheDocument();
  });

  it('keeps the current scene when camera dials change after leaving the first line', () => {
    renderViewer({
      readOnly: false,
      episodes: [buildEpisode()],
      dialogues: [
        buildDialogue({
          id: 100,
          character_name: 'Hero',
          text: 'First line',
          order: 1,
          camera_orbit: '0deg 75deg 3m',
        }),
        buildDialogue({
          id: 101,
          character_name: 'Villain',
          text: 'Second line',
          order: 2,
          camera_orbit: '45deg 60deg 4m',
        }),
      ],
    });

    startPlayback();
    fireEvent.click(screen.getByRole('button', { name: 'Next dialogue' }));
    fireEvent.click(screen.getByRole('button', { name: /edit mode/i }));
    expect(document.querySelector('.comic-3d-viewer')).toHaveClass('is-editing');
    fireEvent.click(screen.getByRole('button', { name: 'Next dialogue' }));

    expect(document.getElementById('top-dialogue')?.textContent).toContain('Second line');

    const slider = document.getElementById('cameraDial') as HTMLInputElement;
    expect(slider).toBeInTheDocument();
    fireEvent.change(slider, { target: { value: '90' } });

    expect(document.getElementById('top-dialogue')?.textContent).toContain('Second line');
    expect(document.getElementById('top-dialogue')?.textContent).not.toContain('First line');
  });

  it('uses the same horizontally scrollable episode container in immersive mode', () => {
    renderViewer();

    expect(document.querySelector('.comic3d-episode-row .episode-select-container')).toHaveClass(
      'episode-select-container',
    );

    startPlayback();
    enterFullscreen();

    const scrollContainer = document.querySelector('.comic3d-stage-episode-select.episode-select-container');
    expect(scrollContainer).toBeInTheDocument();
    expect(scrollContainer).toHaveClass('episode-select-container');
    expect(scrollContainer).toHaveClass('comic3d-stage-episode-select');
  });

  it('snaps the camera when the next line is a cut', () => {
    renderViewer({
      dialogues: [
        buildDialogue({ id: 100, text: 'First line', order: 1 }),
        buildDialogue({
          id: 101,
          text: 'Second line',
          order: 2,
          camera_orbit: '45deg 60deg 4m',
          camera_target: '-1m 1.8m 0.5m',
          camera_transition: 'snap',
        }),
      ],
    });

    startPlayback();

    const modelViewer = document.querySelector('model-viewer') as HTMLElement & {
      jumpCameraToGoal?: jest.Mock;
    };
    const jumpCameraToGoal = jest.fn();
    modelViewer.jumpCameraToGoal = jumpCameraToGoal;

    fireEvent.click(screen.getByRole('button', { name: 'Next dialogue' }));
    expect(jumpCameraToGoal).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Animate camera' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Next dialogue' }));
    expect(document.getElementById('top-dialogue')?.textContent).toContain('Second line');
    expect(jumpCameraToGoal).toHaveBeenCalled();
  });

  it('saves move/snap on the current line in edit playback', () => {
    const onDialogueUpdate = jest.fn();
    renderViewer({
      readOnly: false,
      onDialogueUpdate,
      dialogues: [
        buildDialogue({ id: 100, text: 'First line', order: 1 }),
        buildDialogue({ id: 101, text: 'Second line', order: 2 }),
      ],
    });

    startPlayback();
    fireEvent.click(screen.getByRole('button', { name: 'Next dialogue' }));

    const toggle = screen.getByRole('button', { name: 'Animate camera' });
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(toggle);
    expect(onDialogueUpdate).toHaveBeenCalledWith(100, { camera_transition: 'snap' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
  });

  it('shows stop-sign names after the next episode starts from a cached model', async () => {
    renderViewer({
      dialogues: [
        buildDialogue({
          id: 100,
          character_name: 'Sam',
          episode: 1,
          pov_data: {
            id: 1,
            head_x: 1,
            head_y: 1.6,
            head_z: 0,
            default_camera_target: '0m 1.6m 0m',
            character: 1,
          },
        }),
        buildDialogue({
          id: 200,
          character_name: 'Will',
          episode: 2,
          pov_data: {
            id: 2,
            head_x: -1,
            head_y: 1.6,
            head_z: 0,
            default_camera_target: '0m 1.6m 0m',
            character: 2,
          },
        }),
      ],
    });

    startPlayback();
    const firstViewer = document.querySelector('model-viewer') as HTMLElement & { loaded?: boolean };
    firstViewer.loaded = true;
    fireEvent(firstViewer, new CustomEvent('load'));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    expect(firstViewer.querySelector('[data-character="Sam"]')?.textContent).toBe('Sam');

    fireEvent.click(screen.getByRole('button', { name: /^E2$/i }));
    startPlayback();

    const secondViewer = document.querySelector('model-viewer') as HTMLElement & { loaded?: boolean };
    expect(secondViewer).toBeInTheDocument();
    secondViewer.loaded = true;
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(secondViewer.querySelector('[data-character="Will"]')?.textContent).toBe('Will');
    expect(secondViewer.querySelector('[data-character="Sam"]')).not.toBeInTheDocument();
  });
});
