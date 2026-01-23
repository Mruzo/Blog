import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import SeasonEdit from '../SeasonEdit';
import { ApiProvider } from '../../contexts/ApiContext';
import { Season } from '../../services/api';

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

  it('shows current model files if they exist', () => {
    renderWithProviders(<SeasonEdit />);
    
    expect(screen.getByText(/Current: model.glb/)).toBeInTheDocument();
    expect(screen.getByText(/Current: model.usdz/)).toBeInTheDocument();
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

  it('validates file types for GLTF model', async () => {
    renderWithProviders(<SeasonEdit />);
    
    const gltfInput = screen.getByLabelText(/GLTF\/GLB Model/);
    const file = new File(['test'], 'test.txt', { type: 'text/plain' });
    fireEvent.change(gltfInput, { target: { files: [file] } });
    
    const submitButton = screen.getByText('Update Season');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('GLTF model must be a .glb or .gltf file')).toBeInTheDocument();
    });
  });

  it('validates file types for USDZ model', async () => {
    renderWithProviders(<SeasonEdit />);
    
    const usdzInput = screen.getByLabelText(/USDZ Model/);
    const file = new File(['test'], 'test.txt', { type: 'text/plain' });
    fireEvent.change(usdzInput, { target: { files: [file] } });
    
    const submitButton = screen.getByText('Update Season');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('USDZ model must be a .usdz file')).toBeInTheDocument();
    });
  });

  it('validates file size for GLTF model', async () => {
    renderWithProviders(<SeasonEdit />);
    
    const gltfInput = screen.getByLabelText(/GLTF\/GLB Model/);
    // Create a file larger than 50MB
    const largeFile = new File(['x'.repeat(51 * 1024 * 1024)], 'test.glb', { type: 'model/gltf-binary' });
    Object.defineProperty(largeFile, 'size', { value: 51 * 1024 * 1024 });
    fireEvent.change(gltfInput, { target: { files: [largeFile] } });
    
    const submitButton = screen.getByText('Update Season');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('GLTF model file size cannot exceed 50MB')).toBeInTheDocument();
    });
  });

  it('validates file size for USDZ model', async () => {
    renderWithProviders(<SeasonEdit />);
    
    const usdzInput = screen.getByLabelText(/USDZ Model/);
    // Create a file larger than 25MB
    const largeFile = new File(['x'.repeat(26 * 1024 * 1024)], 'test.usdz', { type: 'model/vnd.usdz' });
    Object.defineProperty(largeFile, 'size', { value: 26 * 1024 * 1024 });
    fireEvent.change(usdzInput, { target: { files: [largeFile] } });
    
    const submitButton = screen.getByText('Update Season');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('USDZ model file size cannot exceed 25MB')).toBeInTheDocument();
    });
  });

  it('shows file information when files are selected', () => {
    renderWithProviders(<SeasonEdit />);
    
    const gltfInput = screen.getByLabelText(/GLTF\/GLB Model/);
    const gltfFile = new File(['test'], 'test.glb', { type: 'model/gltf-binary' });
    Object.defineProperty(gltfFile, 'size', { value: 1024 });
    fireEvent.change(gltfInput, { target: { files: [gltfFile] } });
    
    expect(screen.getByText(/Selected: test.glb/)).toBeInTheDocument();
    expect(screen.getByText(/1 KB/)).toBeInTheDocument();
    
    const usdzInput = screen.getByLabelText(/USDZ Model/);
    const usdzFile = new File(['test'], 'test.usdz', { type: 'model/vnd.usdz' });
    Object.defineProperty(usdzFile, 'size', { value: 2048 });
    fireEvent.change(usdzInput, { target: { files: [usdzFile] } });
    
    expect(screen.getByText(/Selected: test.usdz/)).toBeInTheDocument();
    expect(screen.getByText(/2 KB/)).toBeInTheDocument();
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
        model_gltf: undefined,
        model_usdz: undefined
      });
    });
    
    await waitFor(() => {
      expect(screen.getByText('Season updated successfully!')).toBeInTheDocument();
    });
  });

  it('submits form with 3D model files', async () => {
    const gltfFile = new File(['test'], 'test.glb', { type: 'model/gltf-binary' });
    const usdzFile = new File(['test'], 'test.usdz', { type: 'model/vnd.usdz' });
    
    const mockUpdatedSeason = {
      id: 26,
      title: 'Test Season',
      season_number: 1,
      description: 'Test Description',
      release_date: '2024-01-01',
      comic: 8,
      model_gltf: 'http://example.com/test.glb',
      model_usdz: 'http://example.com/test.usdz',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };
    
    mockUpdateSeason.mockResolvedValue(mockUpdatedSeason);
    
    renderWithProviders(<SeasonEdit />);
    
    const gltfInput = screen.getByLabelText(/GLTF\/GLB Model/);
    fireEvent.change(gltfInput, { target: { files: [gltfFile] } });
    
    const usdzInput = screen.getByLabelText(/USDZ Model/);
    fireEvent.change(usdzInput, { target: { files: [usdzFile] } });
    
    const submitButton = screen.getByText('Update Season');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockUpdateSeason).toHaveBeenCalledWith(26, {
        title: 'Test Season',
        description: 'Test Description',
        season_number: 1,
        release_date: '2024-01-01',
        model_gltf: gltfFile,
        model_usdz: usdzFile
      });
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


