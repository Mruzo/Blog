import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import StoryCreationWizard from '../components/StoryCreationWizard';
import StoryDetailsStep from '../components/story-creation/StoryDetailsStep';
import PublishStep from '../components/story-creation/PublishStep';

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
  currentUser: { id: 1, username: 'testuser', email: 'test@example.com' },
  login: jest.fn(),
  logout: jest.fn(),
  register: jest.fn(),
};

jest.mock('../contexts/ApiContext', () => ({
  useApi: () => mockApiContext,
}));

const mockCreateCompleteStory = jest.fn();

jest.mock('../services/api', () => ({
  __esModule: true,
  apiService: {
    createCompleteStory: (...args: unknown[]) => mockCreateCompleteStory(...args),
    getStories: jest.fn().mockResolvedValue([]),
  },
  default: {
    createCompleteStory: (...args: unknown[]) => mockCreateCompleteStory(...args),
    getStories: jest.fn().mockResolvedValue([]),
  },
}));

const renderWithContext = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('Story Creation Data Synchronization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.setItem('authToken', 'test-token');
    mockCreateCompleteStory.mockResolvedValue({
      story: { id: 1, title: 'Test Story', description: 'Test Description', is_public: false, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z', user: 1, moderation_status: 'approved' },
      season: { id: 1, title: 'Test Season', season_number: 1, description: 'Test Season Description', release_date: '2024-01-01', comic: 1, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
      characters: [],
      episode: { id: 1, title: 'Test Episode', episode_number: 1, description: 'Test Episode Description', summary: 'Test Summary', is_published: false, season: 1, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
      dialogues: [],
      model_url: null,
    });
  });

  afterEach(() => {
    localStorage.removeItem('authToken');
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
        model: { file: null, file_url: '', format: 'glb' as const, previewUrl: null, usesSharedModel: true }
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
        model: { file: null, file_url: '', format: 'glb' as const, previewUrl: null, usesSharedModel: true }
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

    it('should not show the public visibility checkbox on basics', () => {
      const initialData = {
        story: { title: '', description: '', is_public: false },
        season: { title: '', season_number: 1, description: '', release_date: '' },
        episode: { title: '', episode_number: 1, description: '', summary: '' },
        characters: [],
        dialogues: [],
        model: { file: null, file_url: '', format: 'glb' as const, previewUrl: null, usesSharedModel: true }
      };

      renderWithContext(
        <StoryDetailsStep
          data={initialData}
          onDataUpdate={jest.fn()}
          onNext={jest.fn()}
          onPrevious={jest.fn()}
          isFirstStep={true}
          isLastStep={false}
        />
      );

      expect(screen.queryByLabelText(/make this story public/i)).toBeNull();
    });
  });

  describe('PublishStep review', () => {
    it('should show a story review without duplicate action buttons', () => {
      const initialData = {
        story: { title: 'Ready Story', description: 'A short blurb', is_public: false },
        season: { title: 'Season 1', season_number: 1, description: '', release_date: '2024-01-01' },
        episode: { title: 'Episode 1', episode_number: 1, description: 'Ep desc', summary: '', is_published: false },
        characters: [{ name: 'Ava', bio: '', personality: '', love_interest: '' }],
        dialogues: [{ character: 1, text: 'Hi', order: 1, scene_title: '', scene_description: '', shot_type: '', camera_orbit: '', camera_target: '', field_of_view: 45, zoom_speed: 1, rotation: '' }],
        model: { file: null, file_url: '', format: 'glb' as const, previewUrl: null, usesSharedModel: true },
        cameraPosition: '',
        cameraTarget: '',
        publish: { is_published: false, publish_date: '' },
      };

      renderWithContext(
        <PublishStep
          data={initialData}
          onDataUpdate={jest.fn()}
          onNext={jest.fn()}
          onPrevious={jest.fn()}
          isFirstStep={false}
          isLastStep={true}
        />
      );

      expect(screen.getByTestId('publish-step')).toBeInTheDocument();
      expect(screen.getByText('Ready Story')).toBeInTheDocument();
      expect(screen.getByText('Ava')).toBeInTheDocument();
      expect(screen.getByText('1 line')).toBeInTheDocument();
      expect(screen.queryByLabelText(/make this story public/i)).toBeNull();
      expect(screen.queryByRole('button', { name: /publish story/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /save as draft/i })).toBeNull();
    });
  });

  describe('StoryCreationWizard Save Draft', () => {
    it('should save draft successfully when story title is provided', async () => {
      renderWithContext(<StoryCreationWizard />);

      await waitFor(() => {
        expect(screen.getByTestId('story-details-step')).toBeInTheDocument();
      });

      const titleInput = screen.getByPlaceholderText('Story title');
      fireEvent.change(titleInput, { target: { value: 'My Test Story' } });

      const descriptionTextarea = screen.getByPlaceholderText(/story plot/i);
      
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
        expect(screen.getByText(/please enter a story title before saving/i)).toBeInTheDocument();
      });
    });

    it('should block Next on step 1 when title and description are empty', async () => {
      renderWithContext(<StoryCreationWizard />);

      await waitFor(() => {
        expect(screen.getByTestId('story-details-step')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /^next$/i }));

      await waitFor(() => {
        expect(screen.getByText(/story title is required/i)).toBeInTheDocument();
        expect(screen.getByText(/story description is required/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/step 1 of 7/i)).toBeInTheDocument();
    });

    it('should advance from step 1 when title and description are filled', async () => {
      renderWithContext(<StoryCreationWizard />);

      await waitFor(() => {
        expect(screen.getByTestId('story-details-step')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByPlaceholderText('Story title'), { target: { value: 'My Test Story' } });
      fireEvent.change(screen.getByPlaceholderText(/story plot/i), {
        target: { value: 'A compelling test description' },
      });

      fireEvent.click(screen.getByRole('button', { name: /^next$/i }));

      await waitFor(() => {
        expect(screen.getByText(/step 2 of 7/i)).toBeInTheDocument();
        expect(screen.getByTestId('characters-step')).toBeInTheDocument();
      });
    });
  });
});


