import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Studios from '../Studios';
import { ApiProvider } from '../../contexts/ApiContext';
import apiService from '../../services/api';

// Mock the API service
jest.mock('../../services/api');
const mockedApiService = apiService as jest.Mocked<typeof apiService>;

// Mock the API context
const mockApiContext = {
  studios: [],
  loadStudios: jest.fn(),
  isLoading: false,
  error: null,
  stories: [],
  loadStories: jest.fn(),
  loadPublicStories: jest.fn(),
  myStudio: null,
  loadMyStudio: jest.fn(),
  seasons: [],
  characters: [],
  episodes: [],
  dialogues: [],
  audioTracks: [],
  currentStory: null,
  currentSeason: null,
  currentEpisode: null,
  createStory: jest.fn(),
  updateStory: jest.fn(),
  deleteStory: jest.fn(),
  createSeason: jest.fn(),
  updateSeason: jest.fn(),
  deleteSeason: jest.fn(),
  createCharacter: jest.fn(),
  updateCharacter: jest.fn(),
  deleteCharacter: jest.fn(),
  loadSeasons: jest.fn(),
  loadCharacters: jest.fn(),
  loadEpisodes: jest.fn(),
  loadDialogues: jest.fn(),
  loadAudioTracks: jest.fn(),
  createStudio: jest.fn(),
  updateStudio: jest.fn(),
  deleteStudio: jest.fn(),
  createEpisode: jest.fn(),
  updateEpisode: jest.fn(),
  deleteEpisode: jest.fn(),
  createDialogue: jest.fn(),
  updateDialogue: jest.fn(),
  deleteDialogue: jest.fn(),
  clearError: jest.fn(),
  setCurrentStory: jest.fn(),
  setCurrentSeason: jest.fn(),
  setCurrentEpisode: jest.fn(),
};

// Test data
const mockStudios = [
  {
    id: 1,
    name: 'Studio Alpha',
    description: 'A creative studio',
    owner: {
      id: 1,
      username: 'owner1',
      first_name: 'John',
      last_name: 'Doe',
      avatar: 'https://example.com/owner1.jpg',
    },
    collaborators: [
      {
        id: 1,
        username: 'collab1',
        first_name: 'Jane',
        last_name: 'Smith',
        role: 'writer',
        is_active: true,
        avatar: 'https://example.com/collab1.jpg',
      }
    ],
    stories_count: 5,
    total_episode_views: 42,
    collaborators_count: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    is_public: true,
    avatar_url: 'https://example.com/avatar1.jpg'
  },
  {
    id: 2,
    name: 'Studio Beta',
    description: 'Another creative studio',
    owner: {
      id: 2,
      username: 'owner2',
      first_name: 'Bob',
      last_name: 'Wilson',
      avatar: '',
    },
    collaborators: [],
    stories_count: 3,
    total_episode_views: 0,
    collaborators_count: 0,
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
    is_public: true,
    avatar_url: null
  }
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

describe('Studios Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApiContext.studios = [];
    mockApiContext.isLoading = false;
    mockApiContext.error = null;
  });

  it('should render studios header', () => {
    mockApiContext.studios = mockStudios;
    renderWithProviders(<Studios />);
    
    expect(screen.getByText('Collaborative Studios')).toBeInTheDocument();
    expect(
      screen.getByText(/Discover creative studios where artists collaborate/i)
    ).toBeInTheDocument();
  });

  it('should load studios on mount', async () => {
    mockApiContext.loadStudios.mockResolvedValue(mockStudios);
    mockApiContext.studios = mockStudios;
    
    renderWithProviders(<Studios />);
    
    await waitFor(() => {
      expect(mockApiContext.loadStudios).toHaveBeenCalledTimes(1);
    });
  });

  it('should display studios when loaded', async () => {
    mockApiContext.studios = mockStudios;
    
    renderWithProviders(<Studios />);
    
    await waitFor(() => {
      expect(screen.getByText('Studio Alpha')).toBeInTheDocument();
      expect(screen.getByText('Studio Beta')).toBeInTheDocument();
    });
  });

  it('should display studio information correctly', async () => {
    mockApiContext.studios = mockStudios;
    
    renderWithProviders(<Studios />);
    
    await waitFor(() => {
      expect(screen.getByText('Studio Alpha')).toBeInTheDocument();
      expect(screen.getByText('A creative studio')).toBeInTheDocument();
      expect(screen.getByTitle(/Studio Alpha — A creative studio/)).toBeInTheDocument();
      expect(screen.getByText('Studio Beta')).toBeInTheDocument();
      expect(screen.getByText('Another creative studio')).toBeInTheDocument();
      expect(screen.getByTitle(/Studio Beta — Another creative studio/)).toBeInTheDocument();
    });
  });

  it('should display studio stats correctly', async () => {
    mockApiContext.studios = mockStudios;
    
    renderWithProviders(<Studios />);
    
    await waitFor(() => {
      expect(screen.getAllByText('5').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('3').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('42')).toBeInTheDocument();
    });
  });

  it('should display collaborators correctly', async () => {
    mockApiContext.studios = mockStudios;
    
    const { container } = renderWithProviders(<Studios />);
    
    await waitFor(() => {
      expect(container.querySelector('img[src="https://example.com/owner1.jpg"]')).toBeTruthy();
      expect(container.querySelector('img[src="https://example.com/collab1.jpg"]')).toBeTruthy();
      expect(screen.getByTitle('@collab1')).toBeInTheDocument();
    });
  });

  it('should display empty state when no studios', () => {
    mockApiContext.studios = [];
    
    renderWithProviders(<Studios />);
    
    expect(screen.getByText('No studios found')).toBeInTheDocument();
    expect(screen.getByText(/Be the first to create a collaborative studio!/)).toBeInTheDocument();
  });

  it('should show loading spinner while loading', () => {
    mockApiContext.isLoading = true;
    
    renderWithProviders(<Studios />);
    
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('should handle API errors gracefully', async () => {
    mockApiContext.loadStudios.mockRejectedValue(new Error('API Error'));
    
    renderWithProviders(<Studios />);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load studios. Please refresh the page.')).toBeInTheDocument();
    });
  });

  it('should clear error message when data becomes available', async () => {
    // Start with error
    mockApiContext.loadStudios.mockRejectedValueOnce(new Error('API Error'));
    mockApiContext.studios = [];
    
    const { rerender } = renderWithProviders(<Studios />);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load studios. Please refresh the page.')).toBeInTheDocument();
    });
    
    // Update with data
    mockApiContext.studios = mockStudios;
    mockApiContext.loadStudios.mockResolvedValue(mockStudios);
    
    rerender(
      <BrowserRouter>
        <ApiProvider value={mockApiContext}>
          <Studios />
        </ApiProvider>
      </BrowserRouter>
    );
    
    await waitFor(() => {
      expect(screen.queryByText('Failed to load studios. Please refresh the page.')).not.toBeInTheDocument();
      expect(screen.getByText('Studio Alpha')).toBeInTheDocument();
    });
  });

  it('should make only one API call on mount', async () => {
    mockApiContext.loadStudios.mockResolvedValue(mockStudios);
    mockApiContext.studios = mockStudios;
    
    renderWithProviders(<Studios />);
    
    await waitFor(() => {
      expect(mockApiContext.loadStudios).toHaveBeenCalledTimes(1);
    });
  });

  it('should handle studios with no avatar', async () => {
    mockApiContext.studios = [mockStudios[1]]; // Studio Beta has no avatar
    
    const { container } = renderWithProviders(<Studios />);
    
    await waitFor(() => {
      expect(screen.getByText('Studio Beta')).toBeInTheDocument();
      expect(container.querySelector('.fa-building')).toBeFalsy();
    });
  });

  it('should display studio links correctly', async () => {
    mockApiContext.studios = mockStudios;
    
    renderWithProviders(<Studios />);
    
    await waitFor(() => {
      const viewStoryLinks = screen.getAllByRole('link', { name: /view stories from this studio/i });
      expect(viewStoryLinks.length).toBe(2);
      expect(viewStoryLinks[0]).toHaveAttribute('href', '/immersivecomics/?studio=1');
      expect(viewStoryLinks[1]).toHaveAttribute('href', '/immersivecomics/?studio=2');

      expect(screen.getByRole('link', { name: 'Studio Alpha' })).toHaveAttribute(
        'href',
        '/immersivecomics/studio/1/'
      );
      expect(screen.getByRole('link', { name: 'Studio Beta' })).toHaveAttribute(
        'href',
        '/immersivecomics/studio/2/'
      );
    });
  });

  it('should handle 403/401 errors gracefully', async () => {
    const error = new Error('Forbidden');
    (error as any).response = { status: 403 };
    mockApiContext.loadStudios.mockRejectedValue(error);
    
    renderWithProviders(<Studios />);
    
    // Should not show error message for auth errors if data is available
    // (graceful degradation)
    await waitFor(() => {
      // Should not show error message
      expect(screen.queryByText('Failed to load studios. Please refresh the page.')).not.toBeInTheDocument();
    });
  });
});





