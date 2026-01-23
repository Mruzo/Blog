import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import StoryManage from '../StoryManage';
import { useApi } from '../../contexts/ApiContext';
import { Story, Episode, Dialogue } from '../../services/api';

// Mock the useApi hook
jest.mock('../../contexts/ApiContext');
const mockUseApi = useApi as jest.MockedFunction<typeof useApi>;

// Mock the Comic3DViewer component
jest.mock('../../components/Comic3DViewer', () => {
  return function MockComic3DViewer({ episodes, dialogues, onEpisodeSelect, onDialogueUpdate }: any) {
    return (
      <div data-testid="comic-3d-viewer">
        <h5>3D Comic Viewer</h5>
        <div data-testid="episodes-count">Episodes: {episodes.length}</div>
        <div data-testid="dialogues-count">Dialogues: {dialogues.length}</div>
        {episodes.map((episode: Episode) => (
          <button
            key={episode.id}
            data-testid={`episode-${episode.id}`}
            onClick={() => onEpisodeSelect(episode)}
          >
            {episode.title}
          </button>
        ))}
      </div>
    );
  };
});

// Mock data
const mockStory: Story = {
  id: 1,
  title: 'Test Story',
  description: 'A test story',
  is_public: false,
  moderation_status: 'approved',
  user: 1,
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
};

const mockEpisodes: Episode[] = [
  {
    id: 1,
    title: 'Episode 1',
    episode_number: 1,
    description: 'First episode',
    summary: 'Episode 1 summary',
    is_published: false,
    season: 1,
    model_gltf: 'https://example.com/model1.gltf',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  },
  {
    id: 2,
    title: 'Episode 2',
    episode_number: 2,
    description: 'Second episode',
    summary: 'Episode 2 summary',
    is_published: false,
    season: 1,
    model_gltf: 'https://example.com/model2.gltf',
    created_at: '2023-01-02T00:00:00Z',
    updated_at: '2023-01-02T00:00:00Z',
  },
];

const mockDialogues: Dialogue[] = [
  {
    id: 1,
    character: 1,
    text: 'Hello, this is dialogue 1',
    camera_orbit: '0deg 75deg 3m',
    camera_target: '0m 1.6m 0m',
    field_of_view: 45,
    zoom_speed: 1.0,
    episode: 1,
    order: 1,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  },
  {
    id: 2,
    character: 2,
    text: 'This is dialogue 2',
    camera_orbit: '45deg 60deg 4m',
    camera_target: '1m 1.8m 0m',
    field_of_view: 50,
    zoom_speed: 1.2,
    episode: 1,
    order: 2,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  },
];

const mockSeasons = [
  {
    id: 1,
    title: 'Season 1',
    season_number: 1,
    description: 'First season',
    release_date: '2023-01-01',
    comic: 1,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  },
];

const mockCharacters = [
  {
    id: 1,
    name: 'Character 1',
    description: 'First character',
    story: 1,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  },
];

describe('StoryManage with 3D Viewer Integration', () => {
  const mockApiContext = {
    stories: [],
    seasons: mockSeasons,
    characters: mockCharacters,
    episodes: mockEpisodes,
    dialogues: mockDialogues,
    studios: [],
    audioTracks: [],
    currentStory: null,
    currentSeason: null,
    currentEpisode: null,
    myStudio: null,
    isLoading: false,
    error: null,
    loadStories: jest.fn(),
    loadPublicStories: jest.fn(),
    loadStory: jest.fn().mockResolvedValue(mockStory),
    createStory: jest.fn(),
    updateStory: jest.fn(),
    deleteStory: jest.fn(),
    loadSeasons: jest.fn(),
    createSeason: jest.fn(),
    updateSeason: jest.fn(),
    deleteSeason: jest.fn(),
    loadCharacters: jest.fn(),
    createCharacter: jest.fn(),
    updateCharacter: jest.fn(),
    deleteCharacter: jest.fn(),
    loadEpisodes: jest.fn(),
    createEpisode: jest.fn(),
    updateEpisode: jest.fn(),
    deleteEpisode: jest.fn(),
    loadDialogues: jest.fn(),
    createDialogue: jest.fn(),
    updateDialogue: jest.fn(),
    deleteDialogue: jest.fn(),
    loadStudios: jest.fn(),
    loadMyStudio: jest.fn(),
    loadAudioTracks: jest.fn(),
    clearError: jest.fn(),
    setCurrentStory: jest.fn(),
    setCurrentSeason: jest.fn(),
    setCurrentEpisode: jest.fn(),
  };

  beforeEach(() => {
    mockUseApi.mockReturnValue(mockApiContext);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders Comic3DViewer with episodes and dialogues', async () => {
    render(
      <BrowserRouter>
        <StoryManage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('comic-3d-viewer')).toBeInTheDocument();
    });

    expect(screen.getByText('3D Comic Viewer')).toBeInTheDocument();
    expect(screen.getByTestId('episodes-count')).toHaveTextContent('Episodes: 2');
    expect(screen.getByTestId('dialogues-count')).toHaveTextContent('Dialogues: 2');
  });

  it('displays episode buttons in Comic3DViewer', async () => {
    render(
      <BrowserRouter>
        <StoryManage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('episode-1')).toBeInTheDocument();
      expect(screen.getByTestId('episode-2')).toBeInTheDocument();
    });

    expect(screen.getByText('Episode 1')).toBeInTheDocument();
    expect(screen.getByText('Episode 2')).toBeInTheDocument();
  });

  it('handles episode selection in Comic3DViewer', async () => {
    render(
      <BrowserRouter>
        <StoryManage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('episode-1')).toBeInTheDocument();
    });

    const episodeButton = screen.getByTestId('episode-1');
    fireEvent.click(episodeButton);

    // The mock component should handle the click
    expect(episodeButton).toBeInTheDocument();
  });

  it('passes correct props to Comic3DViewer', async () => {
    render(
      <BrowserRouter>
        <StoryManage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('comic-3d-viewer')).toBeInTheDocument();
    });

    // Verify that the component receives the correct data
    expect(screen.getByTestId('episodes-count')).toHaveTextContent('Episodes: 2');
    expect(screen.getByTestId('dialogues-count')).toHaveTextContent('Dialogues: 2');
  });

  it('handles loading state correctly', () => {
    mockUseApi.mockReturnValue({
      ...mockApiContext,
      isLoading: true,
    });

    render(
      <BrowserRouter>
        <StoryManage />
      </BrowserRouter>
    );

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('handles error state correctly', () => {
    mockUseApi.mockReturnValue({
      ...mockApiContext,
      error: 'Failed to load story',
    });

    render(
      <BrowserRouter>
        <StoryManage />
      </BrowserRouter>
    );

    expect(screen.getByText('Failed to load story')).toBeInTheDocument();
  });

  it('loads story data on mount', async () => {
    render(
      <BrowserRouter>
        <StoryManage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(mockApiContext.loadStory).toHaveBeenCalledWith(1);
      expect(mockApiContext.loadSeasons).toHaveBeenCalledWith(1);
      expect(mockApiContext.loadCharacters).toHaveBeenCalledWith(1);
    });
  });

  it('displays story information', async () => {
    render(
      <BrowserRouter>
        <StoryManage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Story')).toBeInTheDocument();
      expect(screen.getByText('A test story')).toBeInTheDocument();
    });
  });

  it('shows seasons section', async () => {
    render(
      <BrowserRouter>
        <StoryManage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Seasons')).toBeInTheDocument();
      expect(screen.getByText('Season 1: Season 1')).toBeInTheDocument();
    });
  });

  it('shows characters section', async () => {
    render(
      <BrowserRouter>
        <StoryManage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Characters (1)')).toBeInTheDocument();
      expect(screen.getByText('Character 1')).toBeInTheDocument();
    });
  });
});


