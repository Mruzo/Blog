import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import EpisodeSetupStep from '../EpisodeSetupStep';
import { ApiProvider } from '../../../contexts/ApiContext';

const mockApiContext = {
  createEpisode: jest.fn(),
  loadEpisodes: jest.fn(),
  stories: [],
  seasons: [],
  characters: [],
  episodes: [],
  dialogues: [],
  studios: [],
  audioTracks: [],
  currentStory: null,
  currentSeason: null,
  currentEpisode: null,
  myStudio: null,
  isLoading: false,
  error: null,
  loadStories: jest.fn(),
  loadStory: jest.fn(),
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
  updateEpisode: jest.fn(),
  deleteEpisode: jest.fn(),
  loadDialogues: jest.fn(),
  createDialogue: jest.fn(),
  updateDialogue: jest.fn(),
  deleteDialogue: jest.fn(),
  loadStudios: jest.fn(),
  loadMyStudio: jest.fn(),
  createStudio: jest.fn(),
  updateStudio: jest.fn(),
  deleteStudio: jest.fn(),
  loadAudioTracks: jest.fn(),
  createAudioTrack: jest.fn(),
  updateAudioTrack: jest.fn(),
  deleteAudioTrack: jest.fn(),
};

jest.mock('../../../contexts/ApiContext', () => ({
  useApi: () => mockApiContext,
  ApiProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const mockStoryData = {
  story: {
    id: 1,
    title: 'Test Story',
    description: 'A test story',
    is_public: false,
  },
  season: {
    id: 1,
    title: 'Season 1',
    season_number: 1,
    description: 'First season',
    release_date: '2024-01-01',
  },
  characters: [
    {
      id: 1,
      name: 'Test Character',
      bio: 'Test bio',
      personality: 'Brave',
      love_interest: '',
    },
  ],
  episode: {
    title: '',
    episode_number: 1,
    description: '',
    summary: '',
    is_published: false,
  },
  dialogues: [],
  model: {
    file: null,
    file_url: '',
    format: 'glb' as const,
    previewUrl: null,
    usesSharedModel: true,
  },
  cameraPosition: '0deg 75deg 3m',
  cameraTarget: '0m 1.6m 0m',
  publish: {
    is_published: false,
    publish_date: '',
  },
};

const mockOnNext = jest.fn();
const mockOnDataUpdate = jest.fn();

function renderEpisodeSetupStep(
  overrides?: Partial<React.ComponentProps<typeof EpisodeSetupStep>>
) {
  let footerNext: (() => Promise<void>) | null = null;
  const registerFooterNext = (fn: (() => Promise<void>) | null) => {
    footerNext = fn;
  };
  const utils = render(
    <ApiProvider>
      <EpisodeSetupStep
        data={mockStoryData}
        onDataUpdate={mockOnDataUpdate}
        onNext={mockOnNext}
        onPrevious={jest.fn()}
        isFirstStep={false}
        isLastStep={false}
        registerFooterNext={registerFooterNext}
        {...overrides}
      />
    </ApiProvider>
  );
  return { ...utils, getFooterNext: () => footerNext };
}

describe('EpisodeSetupStep Progressive Saving', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApiContext.createEpisode.mockResolvedValue({
      id: 1,
      title: 'Test Episode',
      episode_number: 1,
      description: 'Test episode description',
      summary: '',
      is_published: false,
    });
    mockApiContext.loadEpisodes.mockResolvedValue([]);
  });

  test('footer next saves episode then advances', async () => {
    const { getFooterNext } = renderEpisodeSetupStep();

    fireEvent.change(screen.getByLabelText(/^title/i), { target: { value: 'Test Episode' } });
    fireEvent.change(screen.getByLabelText(/episode number/i), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText(/episode description/i), {
      target: { value: 'Test episode description' },
    });

    await act(async () => {
      await getFooterNext()!();
    });

    await waitFor(() => {
      expect(mockApiContext.createEpisode).toHaveBeenCalledWith(1, {
        title: 'Test Episode',
        episode_number: 1,
        description: 'Test episode description',
        summary: '',
        is_published: false,
      });
    });

    expect(mockOnDataUpdate).toHaveBeenCalledWith({
      episode: {
        title: 'Test Episode',
        episode_number: 1,
        description: 'Test episode description',
        summary: '',
        is_published: false,
        id: 1,
      },
    });
    expect(mockOnNext).toHaveBeenCalled();
  });

  test('handles API errors gracefully', async () => {
    mockApiContext.createEpisode.mockRejectedValue(new Error('API Error'));
    const { getFooterNext } = renderEpisodeSetupStep();

    fireEvent.change(screen.getByLabelText(/^title/i), { target: { value: 'Test Episode' } });
    fireEvent.change(screen.getByLabelText(/episode number/i), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText(/episode description/i), {
      target: { value: 'Test episode description' },
    });

    await act(async () => {
      await getFooterNext()!();
    });

    await waitFor(() => {
      expect(screen.getByText(/failed to save episode/i)).toBeInTheDocument();
    });
    expect(mockOnNext).not.toHaveBeenCalled();
  });

  test('shows error if season ID is missing', async () => {
    const { getFooterNext } = renderEpisodeSetupStep({
      data: {
        ...mockStoryData,
        season: { ...mockStoryData.season, id: undefined },
      },
    });

    fireEvent.change(screen.getByLabelText(/^title/i), { target: { value: 'Test Episode' } });
    fireEvent.change(screen.getByLabelText(/episode number/i), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText(/episode description/i), {
      target: { value: 'Test episode description' },
    });

    await act(async () => {
      await getFooterNext()!();
    });

    await waitFor(() => {
      expect(screen.getByText(/season not found/i)).toBeInTheDocument();
    });
    expect(mockApiContext.createEpisode).not.toHaveBeenCalled();
  });

  test('validates required fields', async () => {
    const { getFooterNext } = renderEpisodeSetupStep();

    await act(async () => {
      await getFooterNext()!();
    });

    await waitFor(() => {
      expect(screen.getByText(/episode title is required/i)).toBeInTheDocument();
    });
    expect(mockApiContext.createEpisode).not.toHaveBeenCalled();
  });

  test('reuses existing episode when season already has one', async () => {
    mockApiContext.loadEpisodes.mockResolvedValue([
      {
        id: 42,
        title: 'Existing Episode',
        episode_number: 1,
        description: 'Already there',
        summary: '',
        is_published: false,
      },
    ]);

    const { getFooterNext } = renderEpisodeSetupStep();

    fireEvent.change(screen.getByLabelText(/^title/i), { target: { value: 'Test Episode' } });
    fireEvent.change(screen.getByLabelText(/episode number/i), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText(/episode description/i), {
      target: { value: 'Test episode description' },
    });

    await act(async () => {
      await getFooterNext()!();
    });

    expect(mockApiContext.createEpisode).not.toHaveBeenCalled();
    expect(mockOnNext).toHaveBeenCalled();
  });
});
