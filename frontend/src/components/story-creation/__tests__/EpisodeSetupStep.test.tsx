import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import EpisodeSetupStep from '../EpisodeSetupStep';
import { ApiProvider } from '../../../contexts/ApiContext';

// Mock the API context
const mockApiContext = {
  createEpisode: jest.fn(),
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
  loadEpisodes: jest.fn(),
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

// Mock the API context provider
jest.mock('../../../contexts/ApiContext', () => ({
  useApi: () => mockApiContext,
  ApiProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const mockStoryData = {
  story: {
    id: 1,
    title: 'Test Story',
    description: 'A test story',
    summary: 'Test summary',
    genre: 'Fantasy',
    target_audience: 'Adults',
  },
  season: {
    id: 1,
    title: 'Season 1',
    season_number: 1,
    description: 'First season',
  },
  characters: [
    {
      id: 1,
      name: 'Test Character',
      bio: 'Test bio',
      role: 'Protagonist',
      appearance: 'Test appearance',
    },
  ],
  episode: {
    title: 'Episode 1',
    episode_number: 1,
    description: 'First episode',
  },
  dialogues: [],
  model: {
    file: null,
    file_url: '',
    format: 'glb' as const,
    previewUrl: null,
  },
  cameraPosition: '0deg 75deg 3m',
  cameraTarget: '0m 1.6m 0m',
  publish: {
    is_published: false,
    publish_date: '',
  },
};

const mockProps = {
  data: mockStoryData,
  onDataUpdate: jest.fn(),
  onNext: jest.fn(),
  onPrevious: jest.fn(),
  isFirstStep: false,
  isLastStep: false,
};

describe('EpisodeSetupStep Progressive Saving', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApiContext.createEpisode.mockResolvedValue({ id: 1, ...mockStoryData.episode });
  });

  test('should save episode to database when Next is clicked', async () => {
    render(
      <ApiProvider>
        <EpisodeSetupStep {...mockProps} />
      </ApiProvider>
    );

    // Fill out episode form
    fireEvent.change(screen.getByLabelText(/episode title/i), { target: { value: 'Test Episode' } });
    fireEvent.change(screen.getByLabelText(/episode number/i), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText(/episode description/i), { target: { value: 'Test episode description' } });

    // Mock the Next button click
    const { onNext } = mockProps;
    onNext();

    // Wait for API call to complete
    await waitFor(() => {
      expect(mockApiContext.createEpisode).toHaveBeenCalledWith(1, {
        title: 'Test Episode',
        episode_number: 1,
        description: 'Test episode description',
      });
    });

    // Verify onDataUpdate was called with updated episode data
    expect(mockProps.onDataUpdate).toHaveBeenCalledWith({
      episode: { 
        title: 'Test Episode',
        episode_number: 1,
        description: 'Test episode description',
        id: 1 
      },
    });

    // Verify onNext was called to proceed to next step
    expect(mockProps.onNext).toHaveBeenCalled();
  });

  test('should handle API errors gracefully', async () => {
    mockApiContext.createEpisode.mockRejectedValue(new Error('API Error'));

    render(
      <ApiProvider>
        <EpisodeSetupStep {...mockProps} />
      </ApiProvider>
    );

    // Fill out episode form
    fireEvent.change(screen.getByLabelText(/episode title/i), { target: { value: 'Test Episode' } });
    fireEvent.change(screen.getByLabelText(/episode number/i), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText(/episode description/i), { target: { value: 'Test episode description' } });

    // Mock the Next button click
    const { onNext } = mockProps;
    onNext();

    // Wait for error to be displayed
    await waitFor(() => {
      expect(screen.getByText(/failed to save episode/i)).toBeInTheDocument();
    });

    // Verify onNext was not called due to error
    expect(mockProps.onNext).not.toHaveBeenCalled();
  });

  test('should show error if season ID is missing', async () => {
    const propsWithoutSeasonId = {
      ...mockProps,
      data: {
        ...mockStoryData,
        season: { ...mockStoryData.season, id: undefined },
      },
    };

    render(
      <ApiProvider>
        <EpisodeSetupStep {...propsWithoutSeasonId} />
      </ApiProvider>
    );

    // Fill out episode form
    fireEvent.change(screen.getByLabelText(/episode title/i), { target: { value: 'Test Episode' } });
    fireEvent.change(screen.getByLabelText(/episode number/i), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText(/episode description/i), { target: { value: 'Test episode description' } });

    // Mock the Next button click
    const { onNext } = mockProps;
    onNext();

    // Wait for error to be displayed
    await waitFor(() => {
      expect(screen.getByText(/season not found/i)).toBeInTheDocument();
    });

    // Verify API call was not made
    expect(mockApiContext.createEpisode).not.toHaveBeenCalled();
  });

  test('should validate required fields', async () => {
    render(
      <ApiProvider>
        <EpisodeSetupStep {...mockProps} />
      </ApiProvider>
    );

    // Try to proceed without filling required fields
    const { onNext } = mockProps;
    onNext();

    // Wait for validation errors
    await waitFor(() => {
      expect(screen.getByText(/episode title is required/i)).toBeInTheDocument();
    });

    // Verify API call was not made
    expect(mockApiContext.createEpisode).not.toHaveBeenCalled();
  });

  test('should update form data when user types', async () => {
    render(
      <ApiProvider>
        <EpisodeSetupStep {...mockProps} />
      </ApiProvider>
    );

    // Type in episode title
    fireEvent.change(screen.getByLabelText(/episode title/i), { target: { value: 'New Episode Title' } });

    // Verify the input value is updated
    expect(screen.getByDisplayValue('New Episode Title')).toBeInTheDocument();
  });
});





