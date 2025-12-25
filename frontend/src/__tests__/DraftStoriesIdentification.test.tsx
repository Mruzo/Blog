import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ApiProvider } from '../contexts/ApiContext';
import MyStudio from '../pages/MyStudio';

// Mock the API service with mixed draft and published stories
const mockApiService = {
  getStories: jest.fn().mockResolvedValue([
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
    },
    {
      id: 4,
      title: 'Another Published Story',
      description: 'Another published story',
      is_public: true,
      moderation_status: 'approved',
      created_at: '2024-01-04T00:00:00Z',
      updated_at: '2024-01-04T00:00:00Z',
      user: 1
    }
  ]),
  getMyStudio: jest.fn().mockResolvedValue({
    id: 1,
    name: 'Test Studio',
    description: 'A test studio',
    owner: { id: 1, username: 'testuser' },
    collaborators: [],
    stories_count: 4,
    collaborators_count: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    is_public: true
  }),
  getPublicStories: jest.fn(),
  getStory: jest.fn(),
  getStudios: jest.fn(),
  getCharacters: jest.fn(),
  getSeasons: jest.fn(),
  getEpisodes: jest.fn(),
  getDialogues: jest.fn(),
  getAudioTracks: jest.fn(),
  createStory: jest.fn(),
  updateStory: jest.fn(),
  deleteStory: jest.fn(),
  createSeason: jest.fn(),
  updateSeason: jest.fn(),
  deleteSeason: jest.fn(),
  createCharacter: jest.fn(),
  updateCharacter: jest.fn(),
  deleteCharacter: jest.fn(),
  createEpisode: jest.fn(),
  updateEpisode: jest.fn(),
  deleteEpisode: jest.fn(),
  createDialogue: jest.fn(),
  updateDialogue: jest.fn(),
  deleteDialogue: jest.fn(),
  createStudio: jest.fn(),
  updateStudio: jest.fn(),
  deleteStudio: jest.fn(),
  createAudioTrack: jest.fn(),
  updateAudioTrack: jest.fn(),
  deleteAudioTrack: jest.fn(),
  createCompleteStory: jest.fn(),
  login: jest.fn(),
  getCurrentUser: jest.fn(),
};

jest.mock('../services/api', () => ({
  apiService: mockApiService
}));

// Helper to render with context
const renderWithContext = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <ApiProvider>
        {component}
      </ApiProvider>
    </BrowserRouter>
  );
};

describe('Draft Stories Identification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should display both draft and published stories', async () => {
    renderWithContext(<MyStudio />);

    // Wait for the component to render
    await waitFor(() => {
      expect(screen.getByText('My Studio')).toBeInTheDocument();
    });

    // Check that all stories are displayed
    expect(screen.getByText('Published Story')).toBeInTheDocument();
    expect(screen.getByText('Draft Story 1')).toBeInTheDocument();
    expect(screen.getByText('Draft Story 2')).toBeInTheDocument();
    expect(screen.getByText('Another Published Story')).toBeInTheDocument();
  });

  it('should show correct status badges for draft and published stories', async () => {
    renderWithContext(<MyStudio />);

    // Wait for the component to render
    await waitFor(() => {
      expect(screen.getByText('My Studio')).toBeInTheDocument();
    });

    // Check for draft story badges (should show "Private")
    const draftBadges = screen.getAllByText('Private');
    expect(draftBadges).toHaveLength(2); // Two draft stories

    // Check for published story badges (should show "Public")
    const publicBadges = screen.getAllByText('Public');
    expect(publicBadges).toHaveLength(2); // Two published stories
  });

  it('should show correct story count including drafts', async () => {
    renderWithContext(<MyStudio />);

    // Wait for the component to render
    await waitFor(() => {
      expect(screen.getByText('My Studio')).toBeInTheDocument();
    });

    // Check that the story count includes all stories (4 total)
    expect(screen.getByText('4')).toBeInTheDocument(); // Stories count
  });

  it('should call getStories API endpoint', async () => {
    renderWithContext(<MyStudio />);

    // Wait for the component to render
    await waitFor(() => {
      expect(screen.getByText('My Studio')).toBeInTheDocument();
    });

    // Verify that getStories was called
    expect(mockApiService.getStories).toHaveBeenCalledTimes(1);
  });

  it('should not filter out draft stories', async () => {
    renderWithContext(<MyStudio />);

    // Wait for the component to render
    await waitFor(() => {
      expect(screen.getByText('My Studio')).toBeInTheDocument();
    });

    // Verify that draft stories are present
    const draftStories = screen.getAllByText('Private');
    expect(draftStories.length).toBeGreaterThan(0);
    
    // Verify that we have both types of stories
    const allBadges = screen.getAllByText(/Private|Public/);
    expect(allBadges.length).toBe(4); // 2 draft + 2 published
  });
});


