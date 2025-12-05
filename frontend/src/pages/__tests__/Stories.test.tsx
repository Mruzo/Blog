import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Stories from '../Stories';
import { ApiProvider } from '../../contexts/ApiContext';
import apiService from '../../services/api';

// Mock the API service
jest.mock('../../services/api');
const mockedApiService = apiService as jest.Mocked<typeof apiService>;

// Mock the API context
const mockApiContext = {
  stories: [],
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

// Test data
const mockStories = [
  {
    id: 1,
    title: 'Test Story 1',
    description: 'A test story description',
    is_public: true,
    user: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 2,
    title: 'Test Story 2',
    description: 'Another test story',
    is_public: true,
    user: 1,
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  },
];

const mockCharacters = [
  {
    id: 1,
    name: 'Alice',
    bio: 'A brave protagonist',
    personality: 'Hero',
    love_interest: 'Adventure',
    user: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 2,
    name: 'Bob',
    bio: 'A loyal friend',
    personality: 'Supporting',
    love_interest: 'Friendship',
    user: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 3,
    name: 'Charlie',
    bio: 'A mysterious character',
    personality: 'Antagonist',
    love_interest: 'Power',
    user: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <ApiProvider value={mockApiContext}>
        {ui}
      </ApiProvider>
    </BrowserRouter>
  );
};

describe('Stories Component - Character Display', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock successful API responses
    mockedApiService.getCharacters.mockResolvedValue(mockCharacters);
  });

  it('should display characters for each story', async () => {
    // Mock the API context to return stories
    const contextWithStories = {
      ...mockApiContext,
      stories: mockStories,
    };

    render(
      <BrowserRouter>
        <ApiProvider value={contextWithStories}>
          <Stories />
        </ApiProvider>
      </BrowserRouter>
    );

    // Wait for characters to load
    await waitFor(() => {
      expect(mockedApiService.getCharacters).toHaveBeenCalledWith(1);
      expect(mockedApiService.getCharacters).toHaveBeenCalledWith(2);
    });

    // Check that character names are displayed
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
  });

  it('should show character count for each story', async () => {
    const contextWithStories = {
      ...mockApiContext,
      stories: mockStories,
    };

    render(
      <BrowserRouter>
        <ApiProvider value={contextWithStories}>
          <Stories />
        </ApiProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Characters (3)')).toBeInTheDocument();
    });

    // Should show character count for each story
    const characterCounts = screen.getAllByText(/Characters \(\d+\)/);
    expect(characterCounts).toHaveLength(2); // One for each story
  });

  it('should display character badges with names', async () => {
    const contextWithStories = {
      ...mockApiContext,
      stories: mockStories,
    };

    render(
      <BrowserRouter>
        <ApiProvider value={contextWithStories}>
          <Stories />
        </ApiProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      // Check for character badges
      const aliceBadge = screen.getByText('Alice');
      const bobBadge = screen.getByText('Bob');
      const charlieBadge = screen.getByText('Charlie');

      expect(aliceBadge).toHaveClass('badge', 'bg-primary');
      expect(bobBadge).toHaveClass('badge', 'bg-primary');
      expect(charlieBadge).toHaveClass('badge', 'bg-primary');
    });
  });

  it('should show tooltips with character personality', async () => {
    const contextWithStories = {
      ...mockApiContext,
      stories: mockStories,
    };

    render(
      <BrowserRouter>
        <ApiProvider value={contextWithStories}>
          <Stories />
        </ApiProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      const aliceBadge = screen.getByText('Alice');
      expect(aliceBadge).toHaveAttribute('title', 'Alice - Hero');
    });
  });

  it('should limit displayed characters to 3 and show overflow indicator', async () => {
    // Create more than 3 characters
    const manyCharacters = [
      ...mockCharacters,
      {
        id: 4,
        name: 'David',
        bio: 'Another character',
        personality: 'Sidekick',
        love_interest: 'Comedy',
        user: 1,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
      {
        id: 5,
        name: 'Eve',
        bio: 'Another character',
        personality: 'Mentor',
        love_interest: 'Wisdom',
        user: 1,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ];

    mockedApiService.getCharacters.mockResolvedValue(manyCharacters);

    const contextWithStories = {
      ...mockApiContext,
      stories: mockStories,
    };

    render(
      <BrowserRouter>
        <ApiProvider value={contextWithStories}>
          <Stories />
        </ApiProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      // Should show first 3 characters
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.getByText('Charlie')).toBeInTheDocument();
      
      // Should show overflow indicator
      expect(screen.getByText('+2 more')).toBeInTheDocument();
      
      // Should not show the 4th and 5th characters
      expect(screen.queryByText('David')).not.toBeInTheDocument();
      expect(screen.queryByText('Eve')).not.toBeInTheDocument();
    });
  });

  it('should show "No characters yet" when no characters exist', async () => {
    // Mock empty characters array
    mockedApiService.getCharacters.mockResolvedValue([]);

    const contextWithStories = {
      ...mockApiContext,
      stories: mockStories,
    };

    render(
      <BrowserRouter>
        <ApiProvider value={contextWithStories}>
          <Stories />
        </ApiProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('No characters yet')).toBeInTheDocument();
      expect(screen.getByText('Characters (0)')).toBeInTheDocument();
    });
  });

  it('should handle API errors gracefully', async () => {
    // Mock API error
    mockedApiService.getCharacters.mockRejectedValue(new Error('API Error'));

    const contextWithStories = {
      ...mockApiContext,
      stories: mockStories,
    };

    // Mock console.error to avoid noise in test output
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <BrowserRouter>
        <ApiProvider value={contextWithStories}>
          <Stories />
        </ApiProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      // Should show "No characters yet" when API fails
      expect(screen.getByText('No characters yet')).toBeInTheDocument();
      expect(screen.getByText('Characters (0)')).toBeInTheDocument();
    });

    // Should have logged the error
    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to load characters for story 1:',
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });

  it('should call getCharacters for each story', async () => {
    const contextWithStories = {
      ...mockApiContext,
      stories: mockStories,
    };

    render(
      <BrowserRouter>
        <ApiProvider value={contextWithStories}>
          <Stories />
        </ApiProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(mockedApiService.getCharacters).toHaveBeenCalledTimes(2);
      expect(mockedApiService.getCharacters).toHaveBeenCalledWith(1);
      expect(mockedApiService.getCharacters).toHaveBeenCalledWith(2);
    });
  });

  it('should display loading state initially', () => {
    const contextWithLoading = {
      ...mockApiContext,
      isLoading: true,
    };

    render(
      <BrowserRouter>
        <ApiProvider value={contextWithLoading}>
          <Stories />
        </ApiProvider>
      </BrowserRouter>
    );

    // Should show loading spinner
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('should display error state when there is an error', () => {
    const contextWithError = {
      ...mockApiContext,
      error: 'Failed to load stories',
    };

    render(
      <BrowserRouter>
        <ApiProvider value={contextWithError}>
          <Stories />
        </ApiProvider>
      </BrowserRouter>
    );

    expect(screen.getByText('Failed to load stories')).toBeInTheDocument();
  });

  it('should display empty state when no stories exist', () => {
    const contextWithNoStories = {
      ...mockApiContext,
      stories: [],
    };

    render(
      <BrowserRouter>
        <ApiProvider value={contextWithNoStories}>
          <Stories />
        </ApiProvider>
      </BrowserRouter>
    );

    expect(screen.getByText('No published stories yet')).toBeInTheDocument();
    expect(screen.getByText('Create Your First Story')).toBeInTheDocument();
  });
});









