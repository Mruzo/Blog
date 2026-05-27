import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ApiProvider } from '../contexts/ApiContext';
import StoryCreationWizard from '../components/StoryCreationWizard';
import StoryDetailsStep from '../components/story-creation/StoryDetailsStep';

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
  isLoading: false,
  error: null,
  loadStories: jest.fn(),
  loadMyStudio: jest.fn(),
  loadPublicStories: jest.fn(),
  loadStory: jest.fn(),
  createStory: jest.fn().mockResolvedValue({ id: 1, title: 'Test Story', description: 'Test Description', is_public: false, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z', user: 1, moderation_status: 'approved' }),
  updateStory: jest.fn(),
  deleteStory: jest.fn(),
  loadSeasons: jest.fn(),
  createSeason: jest.fn().mockResolvedValue({ id: 1, title: 'Test Season', season_number: 1, description: 'Test Season Description', release_date: '2024-01-01', comic: 1, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' }),
  updateSeason: jest.fn(),
  deleteSeason: jest.fn(),
  loadCharacters: jest.fn(),
  createCharacter: jest.fn().mockResolvedValue({ id: 1, name: 'Test Character', bio: 'Test Bio', personality: 'Test Personality', love_interest: 'Test Love Interest', user: 1, story: 1, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' }),
  updateCharacter: jest.fn(),
  deleteCharacter: jest.fn(),
  loadEpisodes: jest.fn(),
  createEpisode: jest.fn().mockResolvedValue({ id: 1, title: 'Test Episode', episode_number: 1, description: 'Test Episode Description', summary: 'Test Summary', is_published: false, season: 1, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' }),
  updateEpisode: jest.fn(),
  deleteEpisode: jest.fn(),
  loadDialogues: jest.fn(),
  createDialogue: jest.fn().mockResolvedValue({ id: 1, character: 1, text: 'Test Dialogue', order: 1, scene_title: 'Test Scene', scene_description: 'Test Scene Description', shot_type: 'close-up', camera_orbit: 0, camera_target: 0, field_of_view: 50, zoom_speed: 1, rotation: 0, episode: 1, pov: 1, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' }),
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

// Mock the API service
jest.mock('../services/api', () => ({
  createCompleteStory: jest.fn().mockResolvedValue({
    story: { id: 1, title: 'Test Story', description: 'Test Description', is_public: false, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z', user: 1, moderation_status: 'approved' },
    season: { id: 1, title: 'Test Season', season_number: 1, description: 'Test Season Description', release_date: '2024-01-01', comic: 1, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
    characters: [],
    episode: { id: 1, title: 'Test Episode', episode_number: 1, description: 'Test Episode Description', summary: 'Test Summary', is_published: false, season: 1, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
    dialogues: [],
    model_url: null
  })
}));

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

describe('Story Creation Data Synchronization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('StoryDetailsStep Data Sync', () => {
    it('should update parent data when form fields change', async () => {
      const mockOnDataUpdate = jest.fn();
      const initialData = {
        story: { title: '', description: '', is_public: false },
        season: { title: '', season_number: 1, description: '', release_date: '' },
        episode: { title: '', episode_number: 1, description: '', summary: '' },
        characters: [],
        dialogues: [],
        model: { file: null }
      };

      renderWithContext(
        <StoryDetailsStep
          data={initialData}
          onDataUpdate={mockOnDataUpdate}
          onNext={jest.fn()}
          onPrevious={jest.fn()}
          isFirstStep={true}
          isLastStep={false}
        />
      );

      // Find the title input field
      const titleInput = screen.getByLabelText(/title/i);
      
      // Type in the title field
      fireEvent.change(titleInput, { target: { value: 'My Test Story' } });

      // Wait for the onDataUpdate to be called
      await waitFor(() => {
        expect(mockOnDataUpdate).toHaveBeenCalledWith({
          story: {
            title: 'My Test Story',
            description: '',
            is_public: false
          }
        });
      });
    });

    it('should update parent data when description changes', async () => {
      const mockOnDataUpdate = jest.fn();
      const initialData = {
        story: { title: '', description: '', is_public: false },
        season: { title: '', season_number: 1, description: '', release_date: '' },
        episode: { title: '', episode_number: 1, description: '', summary: '' },
        characters: [],
        dialogues: [],
        model: { file: null }
      };

      renderWithContext(
        <StoryDetailsStep
          data={initialData}
          onDataUpdate={mockOnDataUpdate}
          onNext={jest.fn()}
          onPrevious={jest.fn()}
          isFirstStep={true}
          isLastStep={false}
        />
      );

      // Find the description textarea
      const descriptionTextarea = screen.getByLabelText(/description/i);
      
      // Type in the description field
      fireEvent.change(descriptionTextarea, { target: { value: 'My test story description' } });

      // Wait for the onDataUpdate to be called
      await waitFor(() => {
        expect(mockOnDataUpdate).toHaveBeenCalledWith({
          story: {
            title: '',
            description: 'My test story description',
            is_public: false
          }
        });
      });
    });

    it('should update parent data when is_public checkbox changes', async () => {
      const mockOnDataUpdate = jest.fn();
      const initialData = {
        story: { title: '', description: '', is_public: false },
        season: { title: '', season_number: 1, description: '', release_date: '' },
        episode: { title: '', episode_number: 1, description: '', summary: '' },
        characters: [],
        dialogues: [],
        model: { file: null }
      };

      renderWithContext(
        <StoryDetailsStep
          data={initialData}
          onDataUpdate={mockOnDataUpdate}
          onNext={jest.fn()}
          onPrevious={jest.fn()}
          isFirstStep={true}
          isLastStep={false}
        />
      );

      // Find the is_public checkbox
      const publicCheckbox = screen.getByLabelText(/make this story public/i);
      
      // Check the checkbox
      fireEvent.click(publicCheckbox);

      // Wait for the onDataUpdate to be called
      await waitFor(() => {
        expect(mockOnDataUpdate).toHaveBeenCalledWith({
          story: {
            title: '',
            description: '',
            is_public: true
          }
        });
      });
    });
  });

  describe('StoryCreationWizard Save Draft', () => {
    it('should save draft successfully when story title is provided', async () => {
      renderWithContext(<StoryCreationWizard />);

      // Find the title input field
      const titleInput = screen.getByLabelText(/title/i);
      
      // Type in the title
      fireEvent.change(titleInput, { target: { value: 'My Test Story' } });

      // Find the description textarea
      const descriptionTextarea = screen.getByLabelText(/description/i);
      
      // Type in the description
      fireEvent.change(descriptionTextarea, { target: { value: 'My test story description' } });

      // Find and click the Save Draft button
      const saveDraftButton = screen.getByText(/save draft/i);
      fireEvent.click(saveDraftButton);

      // Wait for success message
      await waitFor(() => {
        expect(screen.getByText(/draft saved successfully/i)).toBeInTheDocument();
      });
    });

    it('should show error when trying to save draft without title', async () => {
      renderWithContext(<StoryCreationWizard />);

      // Find and click the Save Draft button without entering a title
      const saveDraftButton = screen.getByText(/save draft/i);
      fireEvent.click(saveDraftButton);

      // Wait for error message
      await waitFor(() => {
        expect(screen.getByText(/please enter a story title before saving as draft/i)).toBeInTheDocument();
      });
    });
  });
});


