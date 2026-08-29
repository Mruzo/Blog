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
} = {}) {
  return render(
    <Comic3DViewer
      episodes={overrides.episodes ?? episodes}
      seasons={[season]}
      dialogues={overrides.dialogues ?? []}
      storyId={1}
      readOnly={overrides.readOnly ?? true}
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

  it('keeps immersive fullscreen when switching episodes that share the same model', () => {
    renderViewer();
    startPlayback();
    enterFullscreen();

    fireEvent.click(within(document.querySelector('.comic3d-stage-episode-bar') as HTMLElement).getByRole('button', { name: /^E2$/i }));

    expect(document.querySelector('.comic3d-stage.comic3d-fullscreen')).toBeInTheDocument();
    expect(document.body).toHaveClass('comic3d-fullscreen-active');
    expect(screen.getByRole('button', { name: /E2: The Next Beat/i })).toBeInTheDocument();
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
});
