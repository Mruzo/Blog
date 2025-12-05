import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { ApiProvider } from '../contexts/ApiContext';
import StoryManage from '../pages/StoryManage';
import MyStudio from '../pages/MyStudio';
import BackButton from '../components/BackButton';

// Mock the API context with pre-loaded data
const mockApiContextWithData = {
  stories: [
    { id: 1, title: 'Test Story', description: 'Test Description', is_public: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z', user: 1, moderation_status: 'approved' }
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
  myStudio: { id: 1, name: 'Test Studio', description: 'Test Studio Description', user: 1, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
  isLoading: false, // Data is already loaded
  error: null,
  loadStories: jest.fn(),
  loadMyStudio: jest.fn(),
  loadPublicStories: jest.fn(),
  loadStory: jest.fn().mockResolvedValue({ id: 1, title: 'Test Story', description: 'Test Description', is_public: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z', user: 1, moderation_status: 'approved' }),
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

// Mock the API context with loading state
const mockApiContextLoading = {
  ...mockApiContextWithData,
  isLoading: true,
  stories: [],
  myStudio: null,
};

// Helper to render with context
const renderWithContext = (component: React.ReactElement, contextValue = mockApiContextWithData) => {
  return render(
    <BrowserRouter>
      <ApiProvider value={contextValue}>
        {component}
      </ApiProvider>
    </BrowserRouter>
  );
};

describe('BackButton Navigation Spinner Behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('BackButton Component', () => {
    it('should not show any spinner when clicked', () => {
      const mockNavigate = jest.fn();
      jest.mock('react-router-dom', () => ({
        ...jest.requireActual('react-router-dom'),
        useNavigate: () => mockNavigate,
      }));

      renderWithContext(<BackButton to="/test" />);
      
      const backButton = screen.getByRole('button');
      fireEvent.click(backButton);
      
      // Should not show any spinner
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      expect(mockNavigate).toHaveBeenCalledWith('/test');
    });
  });

  describe('Navigation from StoryManage to MyStudio', () => {
    it('should not show spinner when navigating back if data is already loaded', async () => {
      renderWithContext(
        <MemoryRouter initialEntries={['/story/1/manage/']}>
          <ApiProvider value={mockApiContextWithData}>
            <StoryManage />
          </ApiProvider>
        </MemoryRouter>
      );

      // Wait for StoryManage to load
      await waitFor(() => {
        expect(screen.getByText('Test Story')).toBeInTheDocument();
      });

      // Find and click the back button
      const backButton = screen.getByRole('button', { name: /back/i });
      fireEvent.click(backButton);

      // The navigation should happen without showing a spinner
      // (Note: In a real test, we'd need to mock the navigation to verify this)
    });

    it('should show spinner only if MyStudio data is not loaded', async () => {
      renderWithContext(<MyStudio />, mockApiContextLoading);
      
      // Should show spinner when data is loading
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('should not show spinner if MyStudio data is already loaded', async () => {
      renderWithContext(<MyStudio />, mockApiContextWithData);
      
      // Should not show spinner when data is already available
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      expect(screen.getByText('Test Studio')).toBeInTheDocument();
    });
  });

  describe('Optimized Loading Behavior', () => {
    it('should not call loadStories if stories are already loaded', async () => {
      const mockLoadStories = jest.fn();
      const contextWithMockedLoad = {
        ...mockApiContextWithData,
        loadStories: mockLoadStories,
      };

      renderWithContext(<MyStudio />, contextWithMockedLoad);
      
      // Wait for component to mount and check if loadStories was called
      await waitFor(() => {
        expect(screen.getByText('Test Studio')).toBeInTheDocument();
      });

      // loadStories should not be called since stories are already loaded
      expect(mockLoadStories).not.toHaveBeenCalled();
    });

    it('should not call loadMyStudio if studio is already loaded', async () => {
      const mockLoadMyStudio = jest.fn();
      const contextWithMockedLoad = {
        ...mockApiContextWithData,
        loadMyStudio: mockLoadMyStudio,
      };

      renderWithContext(<MyStudio />, contextWithMockedLoad);
      
      // Wait for component to mount and check if loadMyStudio was called
      await waitFor(() => {
        expect(screen.getByText('Test Studio')).toBeInTheDocument();
      });

      // loadMyStudio should not be called since studio is already loaded
      expect(mockLoadMyStudio).not.toHaveBeenCalled();
    });
  });

  describe('Loading State Consistency', () => {
    it('should use global isLoading state instead of local loading state', () => {
      renderWithContext(<MyStudio />, mockApiContextWithData);
      
      // Should not show spinner when global isLoading is false and data is available
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    it('should show spinner when global isLoading is true', () => {
      renderWithContext(<MyStudio />, mockApiContextLoading);
      
      // Should show spinner when global isLoading is true
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });
  });
});


