import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Stories from '../Stories';
import { ApiProvider } from '../../contexts/ApiContext';
import apiService from '../../services/api';

// Mock the API service
jest.mock('../../services/api');
const mockedApiService = apiService as jest.Mocked<typeof apiService>;

// Integration test data that matches real API responses
const mockApiStories = [
  {
    id: 1,
    title: 'Epic Adventure',
    description: 'A thrilling tale of heroes and villains',
    is_public: true,
    user: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 2,
    title: 'Mystery Manor',
    description: 'A dark mystery unfolds in an old mansion',
    is_public: true,
    user: 2,
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  },
];

const mockApiCharacters = [
  {
    id: 1,
    name: 'Hero',
    bio: 'The brave protagonist',
    personality: 'Courageous',
    love_interest: 'Justice',
    user: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 2,
    name: 'Villain',
    bio: 'The cunning antagonist',
    personality: 'Devious',
    love_interest: 'Power',
    user: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 3,
    name: 'Sidekick',
    bio: 'The loyal companion',
    personality: 'Loyal',
    love_interest: 'Friendship',
    user: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

const mockApiContext = {
  stories: mockApiStories,
  loadPublicStories: jest.fn(),
  isLoading: false,
  error: null,
  characters: [],
  loadCharacters: jest.fn(),
  episodes: [],
  loadEpisodes: jest.fn(),
  createEpisode: jest.fn(),
  updateEpisode: jest.fn(),
  deleteEpisode: jest.fn(),
  dialogues: [],
  loadDialogues: jest.fn(),
  createDialogue: jest.fn(),
  updateDialogue: jest.fn(),
  deleteDialogue: jest.fn(),
  createStory: jest.fn(),
  updateStory: jest.fn(),
  deleteStory: jest.fn(),
  createSeason: jest.fn(),
  updateSeason: jest.fn(),
  deleteSeason: jest.fn(),
  createCharacter: jest.fn(),
  updateCharacter: jest.fn(),
  deleteCharacter: jest.fn(),
  loadPublicStories: jest.fn(),
  handleApiCall: jest.fn(),
};

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <ApiProvider value={mockApiContext}>
        {ui}
      </ApiProvider>
    </BrowserRouter>
  );
};

describe('Stories Component - Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should load and display characters for multiple stories', async () => {
    // Mock different character sets for different stories
    mockedApiService.getCharacters
      .mockResolvedValueOnce(mockApiCharacters) // For story 1
      .mockResolvedValueOnce([mockApiCharacters[0]]); // For story 2

    renderWithProviders(<Stories />);

    // Wait for all API calls to complete
    await waitFor(() => {
      expect(mockedApiService.getCharacters).toHaveBeenCalledTimes(2);
    });

    // Check that both stories are displayed
    expect(screen.getByText('Epic Adventure')).toBeInTheDocument();
    expect(screen.getByText('Mystery Manor')).toBeInTheDocument();

    // Check character counts
    expect(screen.getByText('Characters (3)')).toBeInTheDocument(); // First story
    expect(screen.getByText('Characters (1)')).toBeInTheDocument(); // Second story

    // Check character names are displayed
    expect(screen.getByText('Hero')).toBeInTheDocument();
    expect(screen.getByText('Villain')).toBeInTheDocument();
    expect(screen.getByText('Sidekick')).toBeInTheDocument();
  });

  it('should handle mixed character loading results', async () => {
    // Mock one story with characters, one without
    mockedApiService.getCharacters
      .mockResolvedValueOnce(mockApiCharacters) // Story 1 has characters
      .mockResolvedValueOnce([]); // Story 2 has no characters

    renderWithProviders(<Stories />);

    await waitFor(() => {
      expect(mockedApiService.getCharacters).toHaveBeenCalledTimes(2);
    });

    // First story should show characters
    expect(screen.getByText('Characters (3)')).toBeInTheDocument();
    expect(screen.getByText('Hero')).toBeInTheDocument();

    // Second story should show no characters
    expect(screen.getByText('Characters (0)')).toBeInTheDocument();
    expect(screen.getByText('No characters yet')).toBeInTheDocument();
  });

  it('should handle API errors for individual stories gracefully', async () => {
    // Mock one successful call, one error
    mockedApiService.getCharacters
      .mockResolvedValueOnce(mockApiCharacters) // Story 1 succeeds
      .mockRejectedValueOnce(new Error('Network error')); // Story 2 fails

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    renderWithProviders(<Stories />);

    await waitFor(() => {
      expect(mockedApiService.getCharacters).toHaveBeenCalledTimes(2);
    });

    // First story should show characters
    expect(screen.getByText('Characters (3)')).toBeInTheDocument();
    expect(screen.getByText('Hero')).toBeInTheDocument();

    // Second story should show no characters due to error
    expect(screen.getByText('Characters (0)')).toBeInTheDocument();
    expect(screen.getByText('No characters yet')).toBeInTheDocument();

    // Error should be logged
    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to load characters for story 2:',
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });

  it('should display character tooltips with personality information', async () => {
    mockedApiService.getCharacters.mockResolvedValue(mockApiCharacters);

    renderWithProviders(<Stories />);

    await waitFor(() => {
      const heroBadge = screen.getByText('Hero');
      const villainBadge = screen.getByText('Villain');
      const sidekickBadge = screen.getByText('Sidekick');

      expect(heroBadge).toHaveAttribute('title', 'Hero - Courageous');
      expect(villainBadge).toHaveAttribute('title', 'Villain - Devious');
      expect(sidekickBadge).toHaveAttribute('title', 'Sidekick - Loyal');
    });
  });

  it('should show overflow indicator when there are more than 3 characters', async () => {
    const manyCharacters = [
      ...mockApiCharacters,
      {
        id: 4,
        name: 'Mentor',
        bio: 'Wise teacher',
        personality: 'Wise',
        love_interest: 'Knowledge',
        user: 1,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
      {
        id: 5,
        name: 'Guardian',
        bio: 'Protective spirit',
        personality: 'Protective',
        love_interest: 'Safety',
        user: 1,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ];

    mockedApiService.getCharacters.mockResolvedValue(manyCharacters);

    renderWithProviders(<Stories />);

    await waitFor(() => {
      // Should show first 3 characters
      expect(screen.getByText('Hero')).toBeInTheDocument();
      expect(screen.getByText('Villain')).toBeInTheDocument();
      expect(screen.getByText('Sidekick')).toBeInTheDocument();

      // Should show overflow indicator
      expect(screen.getByText('+2 more')).toBeInTheDocument();

      // Should not show the 4th and 5th characters
      expect(screen.queryByText('Mentor')).not.toBeInTheDocument();
      expect(screen.queryByText('Guardian')).not.toBeInTheDocument();
    });
  });

  it('should maintain character display when stories are re-rendered', async () => {
    mockedApiService.getCharacters.mockResolvedValue(mockApiCharacters);

    const { rerender } = renderWithProviders(<Stories />);

    await waitFor(() => {
      expect(screen.getByText('Hero')).toBeInTheDocument();
    });

    // Re-render the component
    rerender(
      <BrowserRouter>
        <ApiProvider value={mockApiContext}>
          <Stories />
        </ApiProvider>
      </BrowserRouter>
    );

    // Characters should still be displayed
    expect(screen.getByText('Hero')).toBeInTheDocument();
    expect(screen.getByText('Characters (3)')).toBeInTheDocument();
  });

  it('should call getCharacters with correct story IDs', async () => {
    mockedApiService.getCharacters.mockResolvedValue(mockApiCharacters);

    renderWithProviders(<Stories />);

    await waitFor(() => {
      expect(mockedApiService.getCharacters).toHaveBeenCalledWith(1);
      expect(mockedApiService.getCharacters).toHaveBeenCalledWith(2);
    });
  });
});




