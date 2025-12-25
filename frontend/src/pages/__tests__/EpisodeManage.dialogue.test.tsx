import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import EpisodeManage from '../EpisodeManage';
import { ApiProvider } from '../../contexts/ApiContext';

// Mock the API context
const mockCreateDialogue = jest.fn();
const mockLoadDialogues = jest.fn();

const mockApiContext = {
  stories: [],
  seasons: [
    {
      id: 4,
      title: 'Test Season',
      season_number: 1,
      description: 'Test Description',
      release_date: '2024-01-01',
      comic: 8,
      model_gltf: 'http://example.com/model.glb',
      model_usdz: 'http://example.com/model.usdz',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }
  ],
  characters: [
    {
      id: 1,
      name: 'Test Character 1',
      bio: 'Test bio 1',
      personality: 'Protagonist',
      love_interest: 'Test appearance 1',
      is_public: false,
      story: 8,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 2,
      name: 'Test Character 2',
      bio: 'Test bio 2',
      personality: 'Antagonist',
      love_interest: 'Test appearance 2',
      is_public: false,
      story: 8,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }
  ],
  episodes: [
    {
      id: 4,
      title: 'Test Episode',
      episode_number: 1,
      description: 'Test episode description',
      season: 4,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }
  ],
  dialogues: [],
  myStudio: null,
  currentStory: null,
  currentSeason: null,
  currentEpisode: null,
  isLoading: false,
  error: null,
  loadStories: jest.fn(),
  loadStory: jest.fn(),
  loadSeasons: jest.fn(),
  loadCharacters: jest.fn(),
  loadEpisodes: jest.fn(),
  loadDialogues: mockLoadDialogues,
  loadMyStudio: jest.fn(),
  loadAudioTracks: jest.fn(),
  createStory: jest.fn(),
  createCompleteStory: jest.fn(),
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
  createDialogue: mockCreateDialogue,
  updateDialogue: jest.fn(),
  deleteDialogue: jest.fn(),
  setCurrentStory: jest.fn(),
  setCurrentSeason: jest.fn(),
  setCurrentEpisode: jest.fn(),
  clearError: jest.fn()
};

// Mock useParams to return a seasonId
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ seasonId: '4' })
}));

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <ApiProvider value={mockApiContext}>
        {component}
      </ApiProvider>
    </BrowserRouter>
  );
};

describe('EpisodeManage Dialogue Creation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the episode management page with characters', () => {
    renderWithProviders(<EpisodeManage />);
    
    expect(screen.getByText('Episode Management')).toBeInTheDocument();
    expect(screen.getByText('Episodes (1)')).toBeInTheDocument();
  });

  it('shows dialogue form when episode is selected and add dialogue is clicked', async () => {
    renderWithProviders(<EpisodeManage />);
    
    // Select an episode first
    const episodeCard = screen.getByText('Test Episode');
    fireEvent.click(episodeCard);
    
    // Click add dialogue button
    const addDialogueButton = screen.getByText('Add Dialogue');
    fireEvent.click(addDialogueButton);
    
    await waitFor(() => {
      expect(screen.getByText('Add New Dialogue')).toBeInTheDocument();
    });
  });

  it('populates character dropdown with correct character IDs and names', async () => {
    renderWithProviders(<EpisodeManage />);
    
    // Select an episode first
    const episodeCard = screen.getByText('Test Episode');
    fireEvent.click(episodeCard);
    
    // Click add dialogue button
    const addDialogueButton = screen.getByText('Add Dialogue');
    fireEvent.click(addDialogueButton);
    
    await waitFor(() => {
      const characterSelect = screen.getByLabelText('Character');
      expect(characterSelect).toBeInTheDocument();
      
      // Check that options have correct values (IDs) and display text (names)
      const options = characterSelect.querySelectorAll('option');
      expect(options[1]).toHaveValue('1'); // First character ID
      expect(options[1]).toHaveTextContent('Test Character 1'); // First character name
      expect(options[2]).toHaveValue('2'); // Second character ID
      expect(options[2]).toHaveTextContent('Test Character 2'); // Second character name
    });
  });

  it('submits dialogue form with correct character ID', async () => {
    const mockCreatedDialogue = {
      id: 1,
      character: 1,
      text: 'Test dialogue text',
      order: 1,
      scene_title: 'Test Scene',
      scene_description: 'Test scene description',
      shot_type: 'mediumShot',
      camera_orbit: '0deg 75deg 3m',
      camera_target: '0m 1.6m 0m',
      field_of_view: 45.0,
      zoom_speed: 1.0,
      rotation: '0deg 0deg 0deg',
      episode: 4,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };
    
    mockCreateDialogue.mockResolvedValue(mockCreatedDialogue);
    
    renderWithProviders(<EpisodeManage />);
    
    // Select an episode first
    const episodeCard = screen.getByText('Test Episode');
    fireEvent.click(episodeCard);
    
    // Click add dialogue button
    const addDialogueButton = screen.getByText('Add Dialogue');
    fireEvent.click(addDialogueButton);
    
    await waitFor(() => {
      // Fill in the form
      const characterSelect = screen.getByLabelText('Character');
      fireEvent.change(characterSelect, { target: { value: '1' } });
      
      const textArea = screen.getByLabelText('Dialogue Text');
      fireEvent.change(textArea, { target: { value: 'Test dialogue text' } });
      
      const orderInput = screen.getByLabelText('Order');
      fireEvent.change(orderInput, { target: { value: '1' } });
      
      // Submit the form
      const submitButton = screen.getByText('Create Dialogue');
      fireEvent.click(submitButton);
    });
    
    await waitFor(() => {
      expect(mockCreateDialogue).toHaveBeenCalledWith(4, {
        character: 1, // Should be character ID, not name
        text: 'Test dialogue text',
        order: 1,
        scene_title: '',
        scene_description: '',
        shot_type: 'mediumShot',
        camera_orbit: '0deg 75deg 3m',
        camera_target: '0m 1.6m 0m',
        field_of_view: 45.0,
        zoom_speed: 1.0,
        rotation: '0deg 0deg 0deg'
      });
    });
  });

  it('handles numeric field conversions correctly', async () => {
    renderWithProviders(<EpisodeManage />);
    
    // Select an episode first
    const episodeCard = screen.getByText('Test Episode');
    fireEvent.click(episodeCard);
    
    // Click add dialogue button
    const addDialogueButton = screen.getByText('Add Dialogue');
    fireEvent.click(addDialogueButton);
    
    await waitFor(() => {
      // Test field of view conversion
      const fovInput = screen.getByLabelText('Field of View');
      fireEvent.change(fovInput, { target: { value: '60.5' } });
      
      // Test zoom speed conversion
      const zoomInput = screen.getByLabelText('Zoom Speed');
      fireEvent.change(zoomInput, { target: { value: '2.5' } });
      
      // Test order conversion
      const orderInput = screen.getByLabelText('Order');
      fireEvent.change(orderInput, { target: { value: '5' } });
      
      // Test character conversion
      const characterSelect = screen.getByLabelText('Character');
      fireEvent.change(characterSelect, { target: { value: '2' } });
      
      // Verify the values are properly converted
      expect(fovInput).toHaveValue('60.5');
      expect(zoomInput).toHaveValue('2.5');
      expect(orderInput).toHaveValue('5');
      expect(characterSelect).toHaveValue('2');
    });
  });

  it('handles API errors gracefully', async () => {
    mockCreateDialogue.mockRejectedValue(new Error('API Error'));
    
    renderWithProviders(<EpisodeManage />);
    
    // Select an episode first
    const episodeCard = screen.getByText('Test Episode');
    fireEvent.click(episodeCard);
    
    // Click add dialogue button
    const addDialogueButton = screen.getByText('Add Dialogue');
    fireEvent.click(addDialogueButton);
    
    await waitFor(() => {
      // Fill in the form
      const characterSelect = screen.getByLabelText('Character');
      fireEvent.change(characterSelect, { target: { value: '1' } });
      
      const textArea = screen.getByLabelText('Dialogue Text');
      fireEvent.change(textArea, { target: { value: 'Test dialogue text' } });
      
      // Submit the form
      const submitButton = screen.getByText('Create Dialogue');
      fireEvent.click(submitButton);
    });
    
    await waitFor(() => {
      expect(screen.getByText('API Error')).toBeInTheDocument();
    });
  });

  it('validates required fields', async () => {
    renderWithProviders(<EpisodeManage />);
    
    // Select an episode first
    const episodeCard = screen.getByText('Test Episode');
    fireEvent.click(episodeCard);
    
    // Click add dialogue button
    const addDialogueButton = screen.getByText('Add Dialogue');
    fireEvent.click(addDialogueButton);
    
    await waitFor(() => {
      // Try to submit without filling required fields
      const submitButton = screen.getByText('Create Dialogue');
      fireEvent.click(submitButton);
      
      // Form should not submit due to HTML5 validation
      expect(mockCreateDialogue).not.toHaveBeenCalled();
    });
  });
});


