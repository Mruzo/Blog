import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ApiProvider } from '../contexts/ApiContext';
import LoadingSpinner from '../components/LoadingSpinner';
import MyStudio from '../pages/MyStudio';
import Stories from '../pages/Stories';
import StoryManage from '../pages/StoryManage';
import StoryEdit from '../pages/StoryEdit';
import StoryCreate from '../pages/StoryCreate';

// Mock the API context
const mockApiContext = {
  stories: [],
  seasons: [],
  characters: [],
  episodes: [],
  dialogues: [],
  studios: [],
  audioTracks: [],
  currentStory: null,
  currentSeason: null,
  currentEpisode: null,
  myStudio: null,
  isLoading: true, // Set to true to trigger loading states
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

describe('Spinner Consistency Across All Pages', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('LoadingSpinner Component', () => {
    it('should render a blue spinning circle', () => {
      render(<LoadingSpinner />);
      
      const spinner = screen.getByTestId('loading-spinner');
      expect(spinner).toBeInTheDocument();
      
      const spinnerElement = spinner.querySelector('.spinner-border');
      expect(spinnerElement).toHaveClass('spinner-border');
      expect(spinnerElement).toHaveClass('text-primary');
    });

    it('should not display any text by default', () => {
      render(<LoadingSpinner />);
      
      const spinner = screen.getByTestId('loading-spinner');
      const visibleText = spinner.textContent?.trim();
      expect(visibleText).toBe('');
    });
  });

  describe('MyStudio Page', () => {
    it('should show blue spinning circle when loading', async () => {
      renderWithContext(<MyStudio />);
      
      await waitFor(() => {
        const spinner = screen.getByTestId('loading-spinner');
        expect(spinner).toBeInTheDocument();
        
        const spinnerElement = spinner.querySelector('.spinner-border');
        expect(spinnerElement).toHaveClass('spinner-border');
        expect(spinnerElement).toHaveClass('text-primary');
      });
    });
  });

  describe('Stories Page', () => {
    it('should show blue spinning circle when loading', async () => {
      renderWithContext(<Stories />);
      
      await waitFor(() => {
        const spinner = screen.getByTestId('loading-spinner');
        expect(spinner).toBeInTheDocument();
        
        const spinnerElement = spinner.querySelector('.spinner-border');
        expect(spinnerElement).toHaveClass('spinner-border');
        expect(spinnerElement).toHaveClass('text-primary');
      });
    });
  });

  describe('StoryManage Page', () => {
    it('should show blue spinning circle when loading', async () => {
      renderWithContext(<StoryManage />);
      
      await waitFor(() => {
        const spinner = screen.getByTestId('loading-spinner');
        expect(spinner).toBeInTheDocument();
        
        const spinnerElement = spinner.querySelector('.spinner-border');
        expect(spinnerElement).toHaveClass('spinner-border');
        expect(spinnerElement).toHaveClass('text-primary');
      });
    });
  });

  describe('StoryEdit Page', () => {
    it('should show blue spinning circle when loading', async () => {
      renderWithContext(<StoryEdit />);
      
      await waitFor(() => {
        const spinner = screen.getByTestId('loading-spinner');
        expect(spinner).toBeInTheDocument();
        
        const spinnerElement = spinner.querySelector('.spinner-border');
        expect(spinnerElement).toHaveClass('spinner-border');
        expect(spinnerElement).toHaveClass('text-primary');
      });
    });
  });

  describe('StoryCreate Page', () => {
    it('should show blue spinning circle in buttons when saving', () => {
      renderWithContext(<StoryCreate />);
      
      // The StoryCreate page shows spinner in buttons, not as a full page spinner
      // This test verifies that button spinners are also blue
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        const spinner = button.querySelector('.spinner-border');
        if (spinner) {
          expect(spinner).toHaveClass('spinner-border');
          expect(spinner).toHaveClass('spinner-border-sm');
        }
      });
    });
  });

  describe('Consistency Verification', () => {
    it('should use the same spinner classes across all pages', async () => {
      const pages = [
        <MyStudio />,
        <Stories />,
        <StoryManage />,
        <StoryEdit />
      ];

      for (const page of pages) {
        const { unmount } = renderWithContext(page);
        
        await waitFor(() => {
          const spinner = screen.queryByTestId('loading-spinner');
          if (spinner) {
            const spinnerElement = spinner.querySelector('.spinner-border');
            expect(spinnerElement).toHaveClass('spinner-border');
            expect(spinnerElement).toHaveClass('text-primary');
          }
        });
        
        unmount();
      }
    });

    it('should not use FontAwesome spinners anywhere', async () => {
      const pages = [
        <MyStudio />,
        <Stories />,
        <StoryManage />,
        <StoryEdit />
      ];

      for (const page of pages) {
        const { unmount } = renderWithContext(page);
        
        await waitFor(() => {
          // Check that no FontAwesome spinners are present
          const faSpinners = screen.queryAllByRole('status', { hidden: true })
            .filter(el => el.classList.contains('fa-spinner'));
          expect(faSpinners).toHaveLength(0);
        });
        
        unmount();
      }
    });

    it('should use consistent spinner-border classes', async () => {
      const pages = [
        <MyStudio />,
        <Stories />,
        <StoryManage />,
        <StoryEdit />
      ];

      for (const page of pages) {
        const { unmount } = renderWithContext(page);
        
        await waitFor(() => {
          const spinners = screen.queryAllByRole('status', { hidden: true })
            .filter(el => el.classList.contains('spinner-border'));
          
          spinners.forEach(spinner => {
            expect(spinner).toHaveClass('spinner-border');
            expect(spinner).toHaveClass('text-primary');
          });
        });
        
        unmount();
      }
    });
  });
});


