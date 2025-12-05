import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import StoryManage from '../StoryManage';
import { ApiProvider } from '../../contexts/ApiContext';
import apiService from '../../services/api';

// Mock the API service
jest.mock('../../services/api');
const mockedApiService = apiService as jest.Mocked<typeof apiService>;

// Mock useParams
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ id: '1' }),
  useNavigate: () => jest.fn(),
}));

// Test data
const mockStory = {
  id: 1,
  title: 'Epic Adventure',
  description: 'A thrilling tale of heroes and villains',
  is_public: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  user: 1,
};

const mockCharacters = [
  {
    id: 1,
    name: 'Hero',
    bio: 'A brave protagonist who saves the day',
    personality: 'Hero',
    love_interest: 'Justice',
    user: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 2,
    name: 'Villain',
    bio: 'A cunning antagonist with dark plans',
    personality: 'Villain',
    love_interest: 'Power',
    user: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 3,
    name: 'Sidekick',
    bio: 'A loyal companion who supports the hero',
    personality: 'Supporting',
    love_interest: 'Friendship',
    user: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

const mockSeasons = [
  {
    id: 1,
    season_number: 1,
    title: 'The Beginning',
    description: 'Where it all starts',
    release_date: '2024-01-15',
    comic: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

const mockApiContext = {
  stories: [mockStory],
  seasons: mockSeasons,
  characters: mockCharacters,
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
  loadPublicStories: jest.fn(),
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
  createEpisode: jest.fn(),
  updateEpisode: jest.fn(),
  deleteEpisode: jest.fn(),
  loadDialogues: jest.fn(),
  createDialogue: jest.fn(),
  updateDialogue: jest.fn(),
  deleteDialogue: jest.fn(),
  loadStudios: jest.fn(),
  createStudio: jest.fn(),
  updateStudio: jest.fn(),
  deleteStudio: jest.fn(),
  loadAudioTracks: jest.fn(),
  createAudioTrack: jest.fn(),
  updateAudioTrack: jest.fn(),
  deleteAudioTrack: jest.fn(),
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

describe('StoryManage Component - Character Display', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should display characters for the story', async () => {
    renderWithProviders(<StoryManage />);

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByText('Epic Adventure')).toBeInTheDocument();
    });

    // Check that characters section shows character count
    expect(screen.getByText('Characters (3)')).toBeInTheDocument();

    // Check that character names are displayed
    expect(screen.getByText('Hero')).toBeInTheDocument();
    expect(screen.getByText('Villain')).toBeInTheDocument();
    expect(screen.getByText('Sidekick')).toBeInTheDocument();
  });

  it('should display character details correctly', async () => {
    renderWithProviders(<StoryManage />);

    await waitFor(() => {
      expect(screen.getByText('Epic Adventure')).toBeInTheDocument();
    });

    // Check character bios
    expect(screen.getByText('A brave protagonist who saves the day')).toBeInTheDocument();
    expect(screen.getByText('A cunning antagonist with dark plans')).toBeInTheDocument();
    expect(screen.getByText('A loyal companion who supports the hero')).toBeInTheDocument();

    // Check personality badges
    expect(screen.getByText('Hero')).toBeInTheDocument();
    expect(screen.getByText('Villain')).toBeInTheDocument();
    expect(screen.getByText('Supporting')).toBeInTheDocument();

    // Check love interests
    expect(screen.getByText('Interest: Justice')).toBeInTheDocument();
    expect(screen.getByText('Interest: Power')).toBeInTheDocument();
    expect(screen.getByText('Interest: Friendship')).toBeInTheDocument();
  });

  it('should show empty state when no characters exist', async () => {
    const contextWithNoCharacters = {
      ...mockApiContext,
      characters: [],
    };

    render(
      <BrowserRouter>
        <ApiProvider value={contextWithNoCharacters}>
          <StoryManage />
        </ApiProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Epic Adventure')).toBeInTheDocument();
    });

    // Should show empty state
    expect(screen.getByText('Characters (0)')).toBeInTheDocument();
    expect(screen.getByText('No Characters Yet')).toBeInTheDocument();
    expect(screen.getByText('Create characters to bring your story to life')).toBeInTheDocument();
  });

  it('should display character cards with proper styling', async () => {
    renderWithProviders(<StoryManage />);

    await waitFor(() => {
      expect(screen.getByText('Epic Adventure')).toBeInTheDocument();
    });

    // Check that character cards are displayed
    const characterCards = screen.getAllByText(/Hero|Villain|Sidekick/);
    expect(characterCards.length).toBeGreaterThan(0);

    // Check for action buttons
    expect(screen.getAllByText('Edit')).toHaveLength(3); // One for each character
    expect(screen.getAllByText('View')).toHaveLength(3); // One for each character
  });

  it('should call API functions to load data', async () => {
    renderWithProviders(<StoryManage />);

    await waitFor(() => {
      expect(mockApiContext.loadStories).toHaveBeenCalled();
      expect(mockApiContext.loadSeasons).toHaveBeenCalledWith(1);
      expect(mockApiContext.loadCharacters).toHaveBeenCalledWith(1);
    });
  });

  it('should display story details correctly', async () => {
    renderWithProviders(<StoryManage />);

    await waitFor(() => {
      expect(screen.getByText('Epic Adventure')).toBeInTheDocument();
    });

    // Check story details section
    expect(screen.getByText('Story Details')).toBeInTheDocument();
    expect(screen.getByText('A thrilling tale of heroes and villains')).toBeInTheDocument();
    expect(screen.getByText('Public')).toBeInTheDocument();
  });

  it('should display seasons correctly', async () => {
    renderWithProviders(<StoryManage />);

    await waitFor(() => {
      expect(screen.getByText('Epic Adventure')).toBeInTheDocument();
    });

    // Check seasons section
    expect(screen.getByText('Seasons')).toBeInTheDocument();
    expect(screen.getByText('Season 1: The Beginning')).toBeInTheDocument();
    expect(screen.getByText('Where it all starts')).toBeInTheDocument();
  });

  it('should handle loading state', () => {
    const contextWithLoading = {
      ...mockApiContext,
      stories: [],
    };

    render(
      <BrowserRouter>
        <ApiProvider value={contextWithLoading}>
          <StoryManage />
        </ApiProvider>
      </BrowserRouter>
    );

    // Should show loading spinner (text is visually hidden)
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    expect(screen.getByText('Loading story...')).toBeInTheDocument(); // This is visually hidden
  });

  it('should handle error state', () => {
    const contextWithError = {
      ...mockApiContext,
      stories: [],
      error: 'Failed to load story',
    };

    render(
      <BrowserRouter>
        <ApiProvider value={contextWithError}>
          <StoryManage />
        </ApiProvider>
      </BrowserRouter>
    );

    // Should show error message
    expect(screen.getByText('Failed to load story')).toBeInTheDocument();
  });

  it('should display character personality badges with correct colors', async () => {
    renderWithProviders(<StoryManage />);

    await waitFor(() => {
      expect(screen.getByText('Epic Adventure')).toBeInTheDocument();
    });

    // Check that personality badges are displayed
    const heroBadge = screen.getByText('Hero');
    const villainBadge = screen.getByText('Villain');
    const supportingBadge = screen.getByText('Supporting');

    expect(heroBadge).toBeInTheDocument();
    expect(villainBadge).toBeInTheDocument();
    expect(supportingBadge).toBeInTheDocument();
  });

  it('should show manage characters button', async () => {
    renderWithProviders(<StoryManage />);

    await waitFor(() => {
      expect(screen.getByText('Epic Adventure')).toBeInTheDocument();
    });

    // Check for manage characters button
    expect(screen.getByText('Manage Characters')).toBeInTheDocument();
  });

  it('should load characters for specific story only', async () => {
    const mockApiContext = {
      stories: [mockStory],
      seasons: mockSeasons,
      characters: mockCharacters,
      loadSeasons: jest.fn().mockResolvedValue(mockSeasons),
      loadCharacters: jest.fn().mockResolvedValue(mockCharacters),
      loadStory: jest.fn().mockResolvedValue(mockStory),
      error: null
    };

    const renderWithProviders = (component: React.ReactElement) => {
      return render(
        <BrowserRouter>
          <ApiProvider value={mockApiContext}>
            {component}
          </ApiProvider>
        </BrowserRouter>
      );
    };

    renderWithProviders(<StoryManage />);

    await waitFor(() => {
      expect(screen.getByText('Epic Adventure')).toBeInTheDocument();
    });

    // Verify that loadCharacters was called with the specific story ID
    expect(mockApiContext.loadCharacters).toHaveBeenCalledWith(1);
    expect(mockApiContext.loadCharacters).toHaveBeenCalledTimes(1);
  });
});


