import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ApiProvider } from '../contexts/ApiContext';
import MyStudio from '../pages/MyStudio';
import Stories from '../pages/Stories';
import StoryManage from '../pages/StoryManage';
import StoryEdit from '../pages/StoryEdit';
import StoryCreate from '../pages/StoryCreate';

// Mock the API service
const mockApiService = {
  getStories: jest.fn(),
  getPublicStories: jest.fn(),
  getStory: jest.fn(),
  getMyStudio: jest.fn(),
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

describe('Loading Spinner Behavior Across All Pages', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('MyStudio Page', () => {
    it('should show loading spinner initially and then hide it when data loads', async () => {
      // Mock API responses
      mockApiService.getStories.mockResolvedValue([
        { id: 1, title: 'Test Story', description: 'Test', is_public: false, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z', user: 1, moderation_status: 'approved' }
      ]);
      mockApiService.getMyStudio.mockResolvedValue({
        id: 1, name: 'Test Studio', description: 'Test', owner: { id: 1, username: 'test' },
        collaborators: [], stories_count: 1, collaborators_count: 1,
        created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z', is_public: true
      });

      renderWithContext(<MyStudio />);

      // Should show loading spinner initially
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('My Studio')).toBeInTheDocument();
      });

      // Loading spinner should be gone
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    it('should not show loading spinner when data is already loaded', async () => {
      // Mock API responses
      mockApiService.getStories.mockResolvedValue([
        { id: 1, title: 'Test Story', description: 'Test', is_public: false, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z', user: 1, moderation_status: 'approved' }
      ]);
      mockApiService.getMyStudio.mockResolvedValue({
        id: 1, name: 'Test Studio', description: 'Test', owner: { id: 1, username: 'test' },
        collaborators: [], stories_count: 1, collaborators_count: 1,
        created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z', is_public: true
      });

      renderWithContext(<MyStudio />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('My Studio')).toBeInTheDocument();
      });

      // Should not show loading spinner after data is loaded
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });
  });

  describe('Stories Page', () => {
    it('should show loading spinner initially and then hide it when data loads', async () => {
      mockApiService.getPublicStories.mockResolvedValue([
        { id: 1, title: 'Public Story', description: 'Test', is_public: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z', user: 1, moderation_status: 'approved' }
      ]);

      renderWithContext(<Stories />);

      // Should show loading spinner initially
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('Public Story')).toBeInTheDocument();
      });

      // Loading spinner should be gone
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });
  });

  describe('StoryManage Page', () => {
    it('should show loading spinner initially and then hide it when data loads', async () => {
      mockApiService.getStory.mockResolvedValue({
        id: 1, title: 'Test Story', description: 'Test', is_public: false, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z', user: 1, moderation_status: 'approved'
      });
      mockApiService.getCharacters.mockResolvedValue([]);
      mockApiService.getSeasons.mockResolvedValue([]);

      renderWithContext(<StoryManage />);

      // Should show loading spinner initially
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('Test Story')).toBeInTheDocument();
      });

      // Loading spinner should be gone
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });
  });

  describe('StoryEdit Page', () => {
    it('should show loading spinner initially and then hide it when data loads', async () => {
      mockApiService.getStory.mockResolvedValue({
        id: 1, title: 'Test Story', description: 'Test', is_public: false, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z', user: 1, moderation_status: 'approved'
      });

      renderWithContext(<StoryEdit />);

      // Should show loading spinner initially
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('Test Story')).toBeInTheDocument();
      });

      // Loading spinner should be gone
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });
  });

  describe('StoryCreate Page', () => {
    it('should not show loading spinner on create page', () => {
      renderWithContext(<StoryCreate />);

      // Should not show loading spinner on create page
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });
  });

  describe('Loading Spinner Consistency', () => {
    it('should use the same LoadingSpinner component across all pages', async () => {
      mockApiService.getStories.mockResolvedValue([]);
      mockApiService.getMyStudio.mockResolvedValue({
        id: 1, name: 'Test Studio', description: 'Test', owner: { id: 1, username: 'test' },
        collaborators: [], stories_count: 0, collaborators_count: 1,
        created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z', is_public: true
      });

      renderWithContext(<MyStudio />);

      // Check that LoadingSpinner component is used
      const loadingSpinner = screen.getByTestId('loading-spinner');
      expect(loadingSpinner).toBeInTheDocument();
      expect(loadingSpinner).toHaveClass('spinner-border');
      expect(loadingSpinner).toHaveClass('text-primary');
    });

    it('should have proper accessibility attributes', async () => {
      mockApiService.getStories.mockResolvedValue([]);
      mockApiService.getMyStudio.mockResolvedValue({
        id: 1, name: 'Test Studio', description: 'Test', owner: { id: 1, username: 'test' },
        collaborators: [], stories_count: 0, collaborators_count: 1,
        created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z', is_public: true
      });

      renderWithContext(<MyStudio />);

      const loadingSpinner = screen.getByTestId('loading-spinner');
      expect(loadingSpinner).toHaveAttribute('role', 'status');
      expect(loadingSpinner).toHaveAttribute('aria-label', 'Loading...');
    });
  });
});


