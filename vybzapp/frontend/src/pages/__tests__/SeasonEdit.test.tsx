import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import SeasonEdit from '../SeasonEdit';
import { ApiProvider } from '../../contexts/ApiContext';

// Mock the API context
const mockUpdateSeason = jest.fn();
const mockLoadSeasons = jest.fn();

const mockApiContext = {
  stories: [],
  seasons: [
    {
      id: 26,
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
  characters: [],
  episodes: [],
  dialogues: [],
  myStudio: null,
  currentStory: null,
  currentSeason: null,
  currentEpisode: null,
  isLoading: false,
  error: null,
  loadStories: jest.fn(),
  loadStory: jest.fn(),
  loadSeasons: mockLoadSeasons,
  loadCharacters: jest.fn(),
  loadEpisodes: jest.fn(),
  loadDialogues: jest.fn(),
  loadMyStudio: jest.fn(),
  loadAudioTracks: jest.fn(),
  createStory: jest.fn(),
  createCompleteStory: jest.fn(),
  updateStory: jest.fn(),
  deleteStory: jest.fn(),
  createSeason: jest.fn(),
  updateSeason: mockUpdateSeason,
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
  setCurrentStory: jest.fn(),
  setCurrentSeason: jest.fn(),
  setCurrentEpisode: jest.fn(),
  clearError: jest.fn()
};

// Mock useParams to return a seasonId
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ seasonId: '26' }),
  useNavigate: () => jest.fn()
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

describe('SeasonEdit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the season edit form with pre-populated data', () => {
    renderWithProviders(<SeasonEdit />);
    
    expect(screen.getByText('Edit Season: Test Season')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Season')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Description')).toBeInTheDocument();
    expect(screen.getByDisplayValue('1')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2024-01-01')).toBeInTheDocument();
  });

  it('shows shared model notice', () => {
    renderWithProviders(<SeasonEdit />);
    
    expect(screen.getByText(/shared JustVybz 3D model/i)).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    renderWithProviders(<SeasonEdit />);
    
    // Clear the title field
    const titleInput = screen.getByDisplayValue('Test Season');
    fireEvent.change(titleInput, { target: { value: '' } });
    
    const submitButton = screen.getByText('Update Season');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Please enter a season title')).toBeInTheDocument();
    });
  });

  it('submits form with valid data', async () => {
    const mockUpdatedSeason = {
      id: 26,
      title: 'Updated Season',
      season_number: 1,
      description: 'Updated Description',
      release_date: '2024-01-01',
      comic: 8,
      model_gltf: 'http://example.com/updated.glb',
      model_usdz: 'http://example.com/updated.usdz',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };
    
    mockUpdateSeason.mockResolvedValue(mockUpdatedSeason);
    
    renderWithProviders(<SeasonEdit />);
    
    const titleInput = screen.getByDisplayValue('Test Season');
    fireEvent.change(titleInput, { target: { value: 'Updated Season' } });
    
    const descriptionInput = screen.getByDisplayValue('Test Description');
    fireEvent.change(descriptionInput, { target: { value: 'Updated Description' } });
    
    const submitButton = screen.getByText('Update Season');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockUpdateSeason).toHaveBeenCalledWith(26, {
        title: 'Updated Season',
        description: 'Updated Description',
        season_number: 1,
        release_date: '2024-01-01',
        is_public: false
      });
    });
    
    await waitFor(() => {
      expect(screen.getByText('Season updated successfully!')).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    mockUpdateSeason.mockRejectedValue(new Error('API Error'));
    
    renderWithProviders(<SeasonEdit />);
    
    const submitButton = screen.getByText('Update Season');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('API Error')).toBeInTheDocument();
    });
  });

  it('shows loading state during submission', async () => {
    mockUpdateSeason.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
    
    renderWithProviders(<SeasonEdit />);
    
    const submitButton = screen.getByText('Update Season');
    fireEvent.click(submitButton);
    
    expect(screen.getByText('Updating...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Updating/ })).toBeDisabled();
  });

  it('shows error when season is not found', () => {
    const emptyApiContext = {
      ...mockApiContext,
      seasons: []
    };
    
    render(
      <BrowserRouter>
        <ApiProvider value={emptyApiContext}>
          <SeasonEdit />
        </ApiProvider>
      </BrowserRouter>
    );
    
    expect(screen.getByText('Season not found')).toBeInTheDocument();
  });
});


