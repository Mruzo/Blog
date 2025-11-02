import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ApiProvider } from '../contexts/ApiContext';
import MyStudio from '../pages/MyStudio';

// Mock the API context with draft stories
const mockApiContext = {
  stories: [
    {
      id: 1,
      title: 'Published Story',
      description: 'A published story',
      is_public: true,
      moderation_status: 'approved',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      user: 1
    },
    {
      id: 2,
      title: 'Draft Story 1',
      description: 'A draft story',
      is_public: false,
      moderation_status: 'approved',
      created_at: '2024-01-02T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
      user: 1
    },
    {
      id: 3,
      title: 'Draft Story 2',
      description: 'Another draft story',
      is_public: false,
      moderation_status: 'approved',
      created_at: '2024-01-03T00:00:00Z',
      updated_at: '2024-01-03T00:00:00Z',
      user: 1
    }
  ],
  seasons: [],
  characters: [],
  episodes: [],
  dialogues: [],
  studios: [],
  audioTracks: [],
  currentStory: null,
  currentSeason: null,
  currentEpisode: null,
  myStudio: {
    id: 1,
    name: 'Test Studio',
    description: 'A test studio',
    owner: {
      id: 1,
      username: 'testuser',
      first_name: 'Test',
      last_name: 'User'
    },
    collaborators: [],
    stories_count: 3,
    collaborators_count: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    is_public: true
  },
  isLoading: false,
  error: null,
  loadStories: jest.fn(),
  loadMyStudio: jest.fn(),
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
  clearError: jest.fn(),
  setCurrentStory: jest.fn(),
  setCurrentSeason: jest.fn(),
  setCurrentEpisode: jest.fn(),
};

// Helper to render with context
const renderWithContext = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <ApiProvider value={mockApiContext}>
        {component}
      </ApiProvider>
    </BrowserRouter>
  );
};

describe('MyStudio Draft Stories Display', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should display all stories including drafts', async () => {
    renderWithContext(<MyStudio />);

    // Wait for the component to render
    await waitFor(() => {
      expect(screen.getByText('My Studio')).toBeInTheDocument();
    });

    // Check that all stories are displayed
    expect(screen.getByText('Published Story')).toBeInTheDocument();
    expect(screen.getByText('Draft Story 1')).toBeInTheDocument();
    expect(screen.getByText('Draft Story 2')).toBeInTheDocument();
  });

  it('should show correct story count including drafts', async () => {
    renderWithContext(<MyStudio />);

    // Wait for the component to render
    await waitFor(() => {
      expect(screen.getByText('My Studio')).toBeInTheDocument();
    });

    // Check that the story count includes all stories (3 total)
    expect(screen.getByText('3')).toBeInTheDocument(); // Stories count
  });

  it('should display draft stories with correct status', async () => {
    renderWithContext(<MyStudio />);

    // Wait for the component to render
    await waitFor(() => {
      expect(screen.getByText('My Studio')).toBeInTheDocument();
    });

    // Check that draft stories show as drafts
    const draftStories = screen.getAllByText(/draft/i);
    expect(draftStories.length).toBeGreaterThan(0);
  });

  it('should call loadStories on mount', async () => {
    renderWithContext(<MyStudio />);

    // Wait for the component to render
    await waitFor(() => {
      expect(screen.getByText('My Studio')).toBeInTheDocument();
    });

    // Verify that loadStories was called
    expect(mockApiContext.loadStories).toHaveBeenCalled();
  });
});


