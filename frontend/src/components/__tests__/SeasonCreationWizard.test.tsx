import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import SeasonCreationWizard from '../SeasonCreationWizard';
import { ApiProvider } from '../../contexts/ApiContext';
import { SeasonCreateData } from '../../services/api';

// Mock the API context
const mockCreateSeason = jest.fn();
const mockLoadSeasons = jest.fn();

const mockApiContext = {
  stories: [],
  seasons: [],
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
  createSeason: mockCreateSeason,
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
  setCurrentStory: jest.fn(),
  setCurrentSeason: jest.fn(),
  setCurrentEpisode: jest.fn(),
  clearError: jest.fn()
};

// Mock useParams to return a storyId
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ storyId: '123' }),
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

describe('SeasonCreationWizard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the season creation form', () => {
    renderWithProviders(<SeasonCreationWizard />);
    
    expect(screen.getByText('Create New Season')).toBeInTheDocument();
    expect(screen.getByText('Add a new season to your story with 3D models')).toBeInTheDocument();
    expect(screen.getByLabelText(/Season Title/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Season Number/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Release Date/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Description/)).toBeInTheDocument();
    expect(screen.getByLabelText(/GLTF\/GLB Model/)).toBeInTheDocument();
    expect(screen.getByLabelText(/USDZ Model/)).toBeInTheDocument();
  });

  it('has default values for form fields', () => {
    renderWithProviders(<SeasonCreationWizard />);
    
    expect(screen.getByDisplayValue('1')).toBeInTheDocument(); // season_number
    expect(screen.getByDisplayValue('')).toBeInTheDocument(); // title
    expect(screen.getByDisplayValue('')).toBeInTheDocument(); // description
  });

  it('validates required fields', async () => {
    renderWithProviders(<SeasonCreationWizard />);
    
    const submitButton = screen.getByText('Create Season');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Please enter a season title')).toBeInTheDocument();
    });
  });

  it('validates season number', async () => {
    renderWithProviders(<SeasonCreationWizard />);
    
    const seasonNumberInput = screen.getByLabelText(/Season Number/);
    fireEvent.change(seasonNumberInput, { target: { value: '0' } });
    
    const titleInput = screen.getByLabelText(/Season Title/);
    fireEvent.change(titleInput, { target: { value: 'Test Season' } });
    
    const descriptionInput = screen.getByLabelText(/Description/);
    fireEvent.change(descriptionInput, { target: { value: 'Test Description' } });
    
    const submitButton = screen.getByText('Create Season');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Season number must be at least 1')).toBeInTheDocument();
    });
  });

  it('validates file types for GLTF model', async () => {
    renderWithProviders(<SeasonCreationWizard />);
    
    const titleInput = screen.getByLabelText(/Season Title/);
    fireEvent.change(titleInput, { target: { value: 'Test Season' } });
    
    const descriptionInput = screen.getByLabelText(/Description/);
    fireEvent.change(descriptionInput, { target: { value: 'Test Description' } });
    
    const gltfInput = screen.getByLabelText(/GLTF\/GLB Model/);
    const file = new File(['test'], 'test.txt', { type: 'text/plain' });
    fireEvent.change(gltfInput, { target: { files: [file] } });
    
    const submitButton = screen.getByText('Create Season');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('GLTF model must be a .glb or .gltf file')).toBeInTheDocument();
    });
  });

  it('validates file types for USDZ model', async () => {
    renderWithProviders(<SeasonCreationWizard />);
    
    const titleInput = screen.getByLabelText(/Season Title/);
    fireEvent.change(titleInput, { target: { value: 'Test Season' } });
    
    const descriptionInput = screen.getByLabelText(/Description/);
    fireEvent.change(descriptionInput, { target: { value: 'Test Description' } });
    
    const usdzInput = screen.getByLabelText(/USDZ Model/);
    const file = new File(['test'], 'test.txt', { type: 'text/plain' });
    fireEvent.change(usdzInput, { target: { files: [file] } });
    
    const submitButton = screen.getByText('Create Season');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('USDZ model must be a .usdz file')).toBeInTheDocument();
    });
  });

  it('validates file size for GLTF model', async () => {
    renderWithProviders(<SeasonCreationWizard />);
    
    const titleInput = screen.getByLabelText(/Season Title/);
    fireEvent.change(titleInput, { target: { value: 'Test Season' } });
    
    const descriptionInput = screen.getByLabelText(/Description/);
    fireEvent.change(descriptionInput, { target: { value: 'Test Description' } });
    
    const gltfInput = screen.getByLabelText(/GLTF\/GLB Model/);
    // Create a file larger than 50MB
    const largeFile = new File(['x'.repeat(51 * 1024 * 1024)], 'test.glb', { type: 'model/gltf-binary' });
    Object.defineProperty(largeFile, 'size', { value: 51 * 1024 * 1024 });
    fireEvent.change(gltfInput, { target: { files: [largeFile] } });
    
    const submitButton = screen.getByText('Create Season');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('GLTF model file size cannot exceed 50MB')).toBeInTheDocument();
    });
  });

  it('validates file size for USDZ model', async () => {
    renderWithProviders(<SeasonCreationWizard />);
    
    const titleInput = screen.getByLabelText(/Season Title/);
    fireEvent.change(titleInput, { target: { value: 'Test Season' } });
    
    const descriptionInput = screen.getByLabelText(/Description/);
    fireEvent.change(descriptionInput, { target: { value: 'Test Description' } });
    
    const usdzInput = screen.getByLabelText(/USDZ Model/);
    // Create a file larger than 25MB
    const largeFile = new File(['x'.repeat(26 * 1024 * 1024)], 'test.usdz', { type: 'model/vnd.usdz' });
    Object.defineProperty(largeFile, 'size', { value: 26 * 1024 * 1024 });
    fireEvent.change(usdzInput, { target: { files: [largeFile] } });
    
    const submitButton = screen.getByText('Create Season');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('USDZ model file size cannot exceed 25MB')).toBeInTheDocument();
    });
  });

  it('shows file information when files are selected', () => {
    renderWithProviders(<SeasonCreationWizard />);
    
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
    const mockCreatedSeason = {
      id: 1,
      title: 'Test Season',
      season_number: 1,
      description: 'Test Description',
      release_date: '2024-01-01',
      comic: 123,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };
    
    mockCreateSeason.mockResolvedValue(mockCreatedSeason);
    
    renderWithProviders(<SeasonCreationWizard />);
    
    const titleInput = screen.getByLabelText(/Season Title/);
    fireEvent.change(titleInput, { target: { value: 'Test Season' } });
    
    const descriptionInput = screen.getByLabelText(/Description/);
    fireEvent.change(descriptionInput, { target: { value: 'Test Description' } });
    
    const submitButton = screen.getByText('Create Season');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockCreateSeason).toHaveBeenCalledWith(123, {
        title: 'Test Season',
        description: 'Test Description',
        season_number: 1,
        release_date: expect.any(String),
        model_gltf: undefined,
        model_usdz: undefined
      });
    });
    
    await waitFor(() => {
      expect(screen.getByText('Season created successfully!')).toBeInTheDocument();
    });
  });

  it('submits form with 3D model files', async () => {
    const mockCreatedSeason = {
      id: 1,
      title: 'Test Season',
      season_number: 1,
      description: 'Test Description',
      release_date: '2024-01-01',
      comic: 123,
      model_gltf: 'http://example.com/model.glb',
      model_usdz: 'http://example.com/model.usdz',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };
    
    mockCreateSeason.mockResolvedValue(mockCreatedSeason);
    
    renderWithProviders(<SeasonCreationWizard />);
    
    const titleInput = screen.getByLabelText(/Season Title/);
    fireEvent.change(titleInput, { target: { value: 'Test Season' } });
    
    const descriptionInput = screen.getByLabelText(/Description/);
    fireEvent.change(descriptionInput, { target: { value: 'Test Description' } });
    
    const gltfInput = screen.getByLabelText(/GLTF\/GLB Model/);
    const gltfFile = new File(['test'], 'test.glb', { type: 'model/gltf-binary' });
    fireEvent.change(gltfInput, { target: { files: [gltfFile] } });
    
    const usdzInput = screen.getByLabelText(/USDZ Model/);
    const usdzFile = new File(['test'], 'test.usdz', { type: 'model/vnd.usdz' });
    fireEvent.change(usdzInput, { target: { files: [usdzFile] } });
    
    const submitButton = screen.getByText('Create Season');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockCreateSeason).toHaveBeenCalledWith(123, {
        title: 'Test Season',
        description: 'Test Description',
        season_number: 1,
        release_date: expect.any(String),
        model_gltf: gltfFile,
        model_usdz: usdzFile
      });
    });
  });

  it('handles API errors gracefully', async () => {
    mockCreateSeason.mockRejectedValue(new Error('API Error'));
    
    renderWithProviders(<SeasonCreationWizard />);
    
    const titleInput = screen.getByLabelText(/Season Title/);
    fireEvent.change(titleInput, { target: { value: 'Test Season' } });
    
    const descriptionInput = screen.getByLabelText(/Description/);
    fireEvent.change(descriptionInput, { target: { value: 'Test Description' } });
    
    const submitButton = screen.getByText('Create Season');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('API Error')).toBeInTheDocument();
    });
  });

  it('shows loading state during submission', async () => {
    mockCreateSeason.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
    
    renderWithProviders(<SeasonCreationWizard />);
    
    const titleInput = screen.getByLabelText(/Season Title/);
    fireEvent.change(titleInput, { target: { value: 'Test Season' } });
    
    const descriptionInput = screen.getByLabelText(/Description/);
    fireEvent.change(descriptionInput, { target: { value: 'Test Description' } });
    
    const submitButton = screen.getByText('Create Season');
    fireEvent.click(submitButton);
    
    expect(screen.getByText('Creating...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Creating/ })).toBeDisabled();
  });

  it('calls loadSeasons after successful creation', async () => {
    const mockCreatedSeason = {
      id: 1,
      title: 'Test Season',
      season_number: 1,
      description: 'Test Description',
      release_date: '2024-01-01',
      comic: 123,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };
    
    mockCreateSeason.mockResolvedValue(mockCreatedSeason);
    
    renderWithProviders(<SeasonCreationWizard />);
    
    const titleInput = screen.getByLabelText(/Season Title/);
    fireEvent.change(titleInput, { target: { value: 'Test Season' } });
    
    const descriptionInput = screen.getByLabelText(/Description/);
    fireEvent.change(descriptionInput, { target: { value: 'Test Description' } });
    
    const submitButton = screen.getByText('Create Season');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockLoadSeasons).toHaveBeenCalledWith(123);
    });
  });
});
