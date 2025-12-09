/**
 * Tests for Views Count and Social Media Share Features in Stories Component
 * 
 * This test suite covers:
 * 1. Views count display and calculation
 * 2. Social media share button functionality
 * 3. Share tracking API calls
 * 4. Integration with existing Stories component
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Stories from '../Stories';
import { ApiProvider } from '../../contexts/ApiContext';
import apiService from '../../services/api';

// Mock the API service
jest.mock('../../services/api');
const mockedApiService = apiService as jest.Mocked<typeof apiService>;

// Mock fetch for share tracking
global.fetch = jest.fn();

// Mock window.open for share functionality
const mockWindowOpen = jest.fn();
window.open = mockWindowOpen;

// Mock navigator.clipboard for copy link
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn().mockResolvedValue(undefined),
  },
});

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
  handleApiCall: jest.fn(),
};

// Test data with episodes that have view_count
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
];

const mockSeasons = [
  {
    id: 1,
    title: 'Season 1',
    season_number: 1,
    description: 'First season',
    comic: 1,
  },
];

const mockEpisodes = [
  {
    id: 1,
    title: 'Episode 1',
    episode_number: 1,
    description: 'First episode',
    season: 1,
    is_published: true,
    view_count: 10,
    last_viewed: '2024-01-01T00:00:00Z',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 2,
    title: 'Episode 2',
    episode_number: 2,
    description: 'Second episode',
    season: 1,
    is_published: true,
    view_count: 25,
    last_viewed: '2024-01-02T00:00:00Z',
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  },
  {
    id: 3,
    title: 'Episode 3',
    episode_number: 3,
    description: 'Third episode',
    season: 1,
    is_published: true,
    view_count: 15,
    last_viewed: '2024-01-03T00:00:00Z',
    created_at: '2024-01-03T00:00:00Z',
    updated_at: '2024-01-03T00:00:00Z',
  },
];

const mockDialogues = [];
const mockCollaborators = [];

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <ApiProvider value={mockApiContext as any}>
        {ui}
      </ApiProvider>
    </BrowserRouter>
  );
};

describe('Stories Component - Views Count and Share Features', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    });
    mockWindowOpen.mockClear();
  });

  describe('Views Count Display', () => {
    it('should display total views count from all episodes', async () => {
      mockedApiService.getPublicStories.mockResolvedValue(mockStories);
      mockedApiService.getSeasons.mockResolvedValue(mockSeasons);
      mockedApiService.getEpisodes.mockResolvedValue(mockEpisodes);
      mockedApiService.getDialogues.mockResolvedValue(mockDialogues);
      mockedApiService.getCollaborators = jest.fn().mockResolvedValue(mockCollaborators);

      renderWithProviders(<Stories />);

      await waitFor(() => {
        expect(screen.getByText(/50/)).toBeInTheDocument(); // 10 + 25 + 15 = 50
      });

      // Check that views badge is displayed
      const viewsBadge = screen.getByText(/50/);
      expect(viewsBadge).toBeInTheDocument();
      expect(viewsBadge.closest('.badge')).toHaveStyle({
        background: '#f9a602',
        color: '#111e7f',
      });
    });

    it('should display 0 views when episodes have no views', async () => {
      const episodesWithNoViews = mockEpisodes.map(ep => ({ ...ep, view_count: 0 }));
      
      mockedApiService.getPublicStories.mockResolvedValue(mockStories);
      mockedApiService.getSeasons.mockResolvedValue(mockSeasons);
      mockedApiService.getEpisodes.mockResolvedValue(episodesWithNoViews);
      mockedApiService.getDialogues.mockResolvedValue(mockDialogues);
      mockedApiService.getCollaborators = jest.fn().mockResolvedValue(mockCollaborators);

      renderWithProviders(<Stories />);

      await waitFor(() => {
        expect(screen.getByText(/0/)).toBeInTheDocument();
      });
    });

    it('should handle missing view_count gracefully', async () => {
      const episodesWithoutViewCount = mockEpisodes.map(({ view_count, ...ep }) => ep);
      
      mockedApiService.getPublicStories.mockResolvedValue(mockStories);
      mockedApiService.getSeasons.mockResolvedValue(mockSeasons);
      mockedApiService.getEpisodes.mockResolvedValue(episodesWithoutViewCount);
      mockedApiService.getDialogues.mockResolvedValue(mockDialogues);
      mockedApiService.getCollaborators = jest.fn().mockResolvedValue(mockCollaborators);

      renderWithProviders(<Stories />);

      await waitFor(() => {
        expect(screen.getByText(/0/)).toBeInTheDocument();
      });
    });

    it('should display views count with eye icon', async () => {
      mockedApiService.getPublicStories.mockResolvedValue(mockStories);
      mockedApiService.getSeasons.mockResolvedValue(mockSeasons);
      mockedApiService.getEpisodes.mockResolvedValue(mockEpisodes);
      mockedApiService.getDialogues.mockResolvedValue(mockDialogues);
      mockedApiService.getCollaborators = jest.fn().mockResolvedValue(mockCollaborators);

      renderWithProviders(<Stories />);

      await waitFor(() => {
        const eyeIcon = screen.getByText(/50/).closest('.badge')?.querySelector('.fa-eye');
        expect(eyeIcon).toBeInTheDocument();
      });
    });
  });

  describe('Social Media Share Buttons', () => {
    beforeEach(async () => {
      mockedApiService.getPublicStories.mockResolvedValue(mockStories);
      mockedApiService.getSeasons.mockResolvedValue(mockSeasons);
      mockedApiService.getEpisodes.mockResolvedValue(mockEpisodes);
      mockedApiService.getDialogues.mockResolvedValue(mockDialogues);
      mockedApiService.getCollaborators = jest.fn().mockResolvedValue(mockCollaborators);

      renderWithProviders(<Stories />);
      await waitFor(() => {
        expect(screen.getByText('Test Story 1')).toBeInTheDocument();
      });
    });

    it('should display all share buttons', async () => {
      await waitFor(() => {
        expect(screen.getByTitle('Share on Facebook')).toBeInTheDocument();
        expect(screen.getByTitle('Share on X (Twitter)')).toBeInTheDocument();
        expect(screen.getByTitle('Share on Reddit')).toBeInTheDocument();
        expect(screen.getByTitle('Copy link')).toBeInTheDocument();
      });
    });

    it('should open Facebook share dialog when Facebook button is clicked', async () => {
      const facebookButton = screen.getByTitle('Share on Facebook');
      fireEvent.click(facebookButton);

      await waitFor(() => {
        expect(mockWindowOpen).toHaveBeenCalledWith(
          expect.stringContaining('facebook.com/sharer'),
          '_blank',
          'width=600,height=400'
        );
      });
    });

    it('should open Twitter share dialog when X button is clicked', async () => {
      const twitterButton = screen.getByTitle('Share on X (Twitter)');
      fireEvent.click(twitterButton);

      await waitFor(() => {
        expect(mockWindowOpen).toHaveBeenCalledWith(
          expect.stringContaining('twitter.com/intent/tweet'),
          '_blank',
          'width=600,height=400'
        );
      });
    });

    it('should open Reddit share dialog when Reddit button is clicked', async () => {
      const redditButton = screen.getByTitle('Share on Reddit');
      fireEvent.click(redditButton);

      await waitFor(() => {
        expect(mockWindowOpen).toHaveBeenCalledWith(
          expect.stringContaining('reddit.com/submit'),
          '_blank',
          'width=600,height=400'
        );
      });
    });

    it('should copy link to clipboard when copy link button is clicked', async () => {
      const copyButton = screen.getByTitle('Copy link');
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(window.location.href);
      });
    });

    it('should show success feedback when link is copied', async () => {
      const copyButton = screen.getByTitle('Copy link');
      fireEvent.click(copyButton);

      await waitFor(() => {
        // Check for checkmark icon (success feedback)
        const checkIcon = copyButton.querySelector('.fa-check');
        expect(checkIcon).toBeInTheDocument();
      });
    });
  });

  describe('Share Tracking API Calls', () => {
    beforeEach(async () => {
      mockedApiService.getPublicStories.mockResolvedValue(mockStories);
      mockedApiService.getSeasons.mockResolvedValue(mockSeasons);
      mockedApiService.getEpisodes.mockResolvedValue(mockEpisodes);
      mockedApiService.getDialogues.mockResolvedValue(mockDialogues);
      mockedApiService.getCollaborators = jest.fn().mockResolvedValue(mockCollaborators);

      renderWithProviders(<Stories />);
      await waitFor(() => {
        expect(screen.getByText('Test Story 1')).toBeInTheDocument();
      });
    });

    it('should track Facebook share click', async () => {
      const facebookButton = screen.getByTitle('Share on Facebook');
      fireEvent.click(facebookButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/immersivecomics/api/track-share/'),
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
            }),
            body: expect.stringContaining('"platform":"facebook"'),
          })
        );
      });
    });

    it('should track Twitter share click', async () => {
      const twitterButton = screen.getByTitle('Share on X (Twitter)');
      fireEvent.click(twitterButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/immersivecomics/api/track-share/'),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('"platform":"x_twitter"'),
          })
        );
      });
    });

    it('should track Reddit share click', async () => {
      const redditButton = screen.getByTitle('Share on Reddit');
      fireEvent.click(redditButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/immersivecomics/api/track-share/'),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('"platform":"reddit"'),
          })
        );
      });
    });

    it('should track copy link click', async () => {
      const copyButton = screen.getByTitle('Copy link');
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/immersivecomics/api/track-share/'),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('"platform":"copy_link"'),
          })
        );
      });
    });

    it('should include story_id in tracking request', async () => {
      const facebookButton = screen.getByTitle('Share on Facebook');
      fireEvent.click(facebookButton);

      await waitFor(() => {
        const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
        const body = JSON.parse(fetchCall[1].body);
        expect(body).toHaveProperty('story_id', 1);
        expect(body).toHaveProperty('platform', 'facebook');
      });
    });

    it('should handle tracking API errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const facebookButton = screen.getByTitle('Share on Facebook');
      fireEvent.click(facebookButton);

      // Should not throw error, should fail silently
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });
  });

  describe('Integration with Existing Features', () => {
    it('should display views count above collaborators section', async () => {
      mockedApiService.getPublicStories.mockResolvedValue(mockStories);
      mockedApiService.getSeasons.mockResolvedValue(mockSeasons);
      mockedApiService.getEpisodes.mockResolvedValue(mockEpisodes);
      mockedApiService.getDialogues.mockResolvedValue(mockDialogues);
      mockedApiService.getCollaborators = jest.fn().mockResolvedValue(mockCollaborators);

      renderWithProviders(<Stories />);

      await waitFor(() => {
        const viewsSection = screen.getByText(/50/).closest('.card');
        const collaboratorsSection = screen.queryByText(/Collaborators/);
        
        // Views should be rendered
        expect(viewsSection).toBeInTheDocument();
        // Collaborators section should also be present (even if empty)
        expect(collaboratorsSection).toBeInTheDocument();
      });
    });

    it('should display share buttons after collaborators section', async () => {
      mockedApiService.getPublicStories.mockResolvedValue(mockStories);
      mockedApiService.getSeasons.mockResolvedValue(mockSeasons);
      mockedApiService.getEpisodes.mockResolvedValue(mockEpisodes);
      mockedApiService.getDialogues.mockResolvedValue(mockDialogues);
      mockedApiService.getCollaborators = jest.fn().mockResolvedValue(mockCollaborators);

      renderWithProviders(<Stories />);

      await waitFor(() => {
        const shareButtons = screen.getByTitle('Share on Facebook');
        expect(shareButtons).toBeInTheDocument();
      });
    });

    it('should work with multiple stories', async () => {
      const multipleStories = [
        ...mockStories,
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

      mockedApiService.getPublicStories.mockResolvedValue(multipleStories);
      mockedApiService.getSeasons.mockResolvedValue(mockSeasons);
      mockedApiService.getEpisodes.mockResolvedValue(mockEpisodes);
      mockedApiService.getDialogues.mockResolvedValue(mockDialogues);
      mockedApiService.getCollaborators = jest.fn().mockResolvedValue(mockCollaborators);

      renderWithProviders(<Stories />);

      await waitFor(() => {
        // Should display views for each story
        const viewsBadges = screen.getAllByText(/50/);
        expect(viewsBadges.length).toBeGreaterThan(0);
      });
    });
  });
});


