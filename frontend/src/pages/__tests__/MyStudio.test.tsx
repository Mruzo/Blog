import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import MyStudio from '../MyStudio';
import { ApiProvider } from '../../contexts/ApiContext';

// Mock the API context
const mockApiContext = {
  stories: [
    {
      id: 1,
      title: 'Test Story 1',
      description: 'A test story description',
      is_public: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      user: 1,
      moderation_status: 'approved'
    },
    {
      id: 2,
      title: 'Test Story 2',
      description: 'Another test story description',
      is_public: false,
      created_at: '2024-01-02T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
      user: 1,
      moderation_status: 'approved'
    }
  ],
  myStudio: {
    id: 1,
    name: 'Test Studio',
    description: 'A test studio',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    user: 1
  },
  seasons: [],
  characters: [],
  episodes: [],
  dialogues: [],
  studios: [],
  audioTracks: [],
  currentStory: null,
  currentSeason: null,
  currentEpisode: null,
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
  loadMyStudio: jest.fn(),
  createStudio: jest.fn(),
  updateStudio: jest.fn(),
  deleteStudio: jest.fn(),
  loadAudioTracks: jest.fn(),
  createAudioTrack: jest.fn(),
  updateAudioTrack: jest.fn(),
  deleteAudioTrack: jest.fn(),
  clearError: jest.fn(),
  setCurrentStory: jest.fn(),
  setCurrentSeason: jest.fn(),
  setCurrentEpisode: jest.fn()
};

// Mock the useApi hook
jest.mock('../../contexts/ApiContext', () => ({
  useApi: () => mockApiContext,
  ApiProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <ApiProvider>
        {component}
      </ApiProvider>
    </BrowserRouter>
  );
};

describe('MyStudio Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders studio name and description', async () => {
    renderWithRouter(<MyStudio />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Studio')).toBeInTheDocument();
      expect(screen.getByText('A test studio')).toBeInTheDocument();
    });
  });

  test('loads and displays stories with titles', async () => {
    renderWithRouter(<MyStudio />);
    
    await waitFor(() => {
      // Check that both story titles are displayed
      expect(screen.getByText('Test Story 1')).toBeInTheDocument();
      expect(screen.getByText('Test Story 2')).toBeInTheDocument();
    });
  });

  test('displays story descriptions', async () => {
    renderWithRouter(<MyStudio />);
    
    await waitFor(() => {
      expect(screen.getByText('A test story description')).toBeInTheDocument();
      expect(screen.getByText('Another test story description')).toBeInTheDocument();
    });
  });

  test('shows correct story status badges', async () => {
    renderWithRouter(<MyStudio />);
    
    await waitFor(() => {
      // Check for public/private badges
      expect(screen.getByText('Public')).toBeInTheDocument();
      expect(screen.getByText('Private')).toBeInTheDocument();
    });
  });

  test('displays story management and edit links', async () => {
    renderWithRouter(<MyStudio />);
    
    await waitFor(() => {
      // Check for manage and edit links
      const manageLinks = screen.getAllByText('Manage');
      const editLinks = screen.getAllByText('Edit');
      
      expect(manageLinks).toHaveLength(2); // One for each story
      expect(editLinks).toHaveLength(2); // One for each story
    });
  });

  test('calls loadStories and loadMyStudio on mount', async () => {
    renderWithRouter(<MyStudio />);
    
    await waitFor(() => {
      expect(mockApiContext.loadStories).toHaveBeenCalledTimes(1);
      expect(mockApiContext.loadMyStudio).toHaveBeenCalledTimes(1);
    });
  });

  test('handles empty stories array', async () => {
    const emptyStoriesContext = {
      ...mockApiContext,
      stories: []
    };
    
    jest.mocked(require('../../contexts/ApiContext').useApi).mockReturnValue(emptyStoriesContext);
    
    renderWithRouter(<MyStudio />);
    
    await waitFor(() => {
      // Should show some message about no stories
      expect(screen.getByText('Test Studio')).toBeInTheDocument();
    });
  });

  test('handles stories with empty titles gracefully', async () => {
    const storiesWithEmptyTitles = [
      {
        id: 1,
        title: '',
        description: 'A story with empty title',
        is_public: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        user: 1,
        moderation_status: 'approved'
      }
    ];
    
    const contextWithEmptyTitles = {
      ...mockApiContext,
      stories: storiesWithEmptyTitles
    };
    
    jest.mocked(require('../../contexts/ApiContext').useApi).mockReturnValue(contextWithEmptyTitles);
    
    renderWithRouter(<MyStudio />);
    
    await waitFor(() => {
      // Should still render the story card even with empty title
      expect(screen.getByText('A story with empty title')).toBeInTheDocument();
    });
  });

  test('verifies characters are story-specific', async () => {
    // This test verifies that characters are loaded per story, not globally
    renderWithRouter(<MyStudio />);
    
    await waitFor(() => {
      // Verify that loadStories and loadMyStudio are called
      expect(mockApiContext.loadStories).toHaveBeenCalledTimes(1);
      expect(mockApiContext.loadMyStudio).toHaveBeenCalledTimes(1);
      
      // Verify that loadCharacters is NOT called globally
      expect(mockApiContext.loadCharacters).not.toHaveBeenCalled();
    });
  });
});
