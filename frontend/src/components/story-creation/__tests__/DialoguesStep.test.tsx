import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DialoguesStep from '../DialoguesStep';
import { ApiProvider } from '../../../contexts/ApiContext';

// Mock the API context
const mockApiContext = {
  createDialogue: jest.fn(),
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
  updateDialogue: jest.fn(),
  deleteDialogue: jest.fn(),
  loadStudios: jest.fn(),
  loadMyStudio: jest.fn(),
  createStudio: jest.fn(),
  updateStudio: jest.fn(),
  deleteStudio: jest.fn(),
  loadAudioTracks: jest.fn(),
  createAudioTrack: jest.fn(),
  updateAudioTrack: jest.fn(),
  deleteAudioTrack: jest.fn(),
};

// Mock the API context provider
jest.mock('../../../contexts/ApiContext', () => ({
  useApi: () => mockApiContext,
  ApiProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const mockStoryData = {
  story: {
    id: 1,
    title: 'Test Story',
    description: 'A test story',
    summary: 'Test summary',
    genre: 'Fantasy',
    target_audience: 'Adults',
  },
  season: {
    id: 1,
    title: 'Season 1',
    season_number: 1,
    description: 'First season',
  },
  characters: [
    {
      id: 1,
      name: 'Test Character',
      bio: 'Test bio',
      role: 'Protagonist',
      appearance: 'Test appearance',
    },
    {
      id: 2,
      name: 'Another Character',
      bio: 'Another bio',
      role: 'Antagonist',
      appearance: 'Another appearance',
    },
  ],
  episode: {
    id: 1,
    title: 'Episode 1',
    episode_number: 1,
    description: 'First episode',
  },
  dialogues: [],
  model: {
    file: null,
    file_url: '',
    format: 'glb' as const,
    previewUrl: null,
  },
  cameraPosition: '0deg 75deg 3m',
  cameraTarget: '0m 1.6m 0m',
  publish: {
    is_published: false,
    publish_date: '',
  },
};

const mockProps = {
  data: mockStoryData,
  onDataUpdate: jest.fn(),
  onNext: jest.fn(),
  onPrevious: jest.fn(),
  isFirstStep: false,
  isLastStep: false,
};

describe('DialoguesStep Progressive Saving', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApiContext.createDialogue.mockResolvedValue({ 
      id: 1, 
      character: 'Test Character',
      text: 'Test dialogue',
      order: 1,
      camera_angle: { x: 0, y: 0, z: 0 }
    });
  });

  test('should save dialogues to database when Next is clicked', async () => {
    render(
      <ApiProvider>
        <DialoguesStep {...mockProps} />
      </ApiProvider>
    );

    // Add a dialogue
    fireEvent.change(screen.getByLabelText(/character/i), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText(/dialogue text/i), { target: { value: 'Test dialogue text' } });
    fireEvent.change(screen.getByLabelText(/order/i), { target: { value: '1' } });
    
    fireEvent.click(screen.getByText(/add dialogue/i));

    // Wait for dialogue to be added
    await waitFor(() => {
      expect(screen.getByText('Test Character')).toBeInTheDocument();
    });

    // Mock the Next button click
    const { onNext } = mockProps;
    onNext();

    // Wait for API call to complete
    await waitFor(() => {
      expect(mockApiContext.createDialogue).toHaveBeenCalledWith(1, {
        character: 'Test Character',
        text: 'Test dialogue text',
        order: 1,
        camera_angle: { x: 0, y: 0, z: 0 },
      });
    });

    // Verify onDataUpdate was called with updated dialogues
    expect(mockProps.onDataUpdate).toHaveBeenCalledWith({
      dialogues: [{
        id: 1,
        characterId: 1,
        character: 'Test Character',
        text: 'Test dialogue text',
        order: 1,
        camera_angle: { x: 0, y: 0, z: 0 },
      }],
    });

    // Verify onNext was called to proceed to next step
    expect(mockProps.onNext).toHaveBeenCalled();
  });

  test('should handle API errors gracefully', async () => {
    mockApiContext.createDialogue.mockRejectedValue(new Error('API Error'));

    render(
      <ApiProvider>
        <DialoguesStep {...mockProps} />
      </ApiProvider>
    );

    // Add a dialogue
    fireEvent.change(screen.getByLabelText(/character/i), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText(/dialogue text/i), { target: { value: 'Test dialogue text' } });
    fireEvent.change(screen.getByLabelText(/order/i), { target: { value: '1' } });
    
    fireEvent.click(screen.getByText(/add dialogue/i));

    // Wait for dialogue to be added
    await waitFor(() => {
      expect(screen.getByText('Test Character')).toBeInTheDocument();
    });

    // Mock the Next button click
    const { onNext } = mockProps;
    onNext();

    // Wait for error to be displayed
    await waitFor(() => {
      expect(screen.getByText(/failed to save dialogues/i)).toBeInTheDocument();
    });

    // Verify onNext was not called due to error
    expect(mockProps.onNext).not.toHaveBeenCalled();
  });

  test('should not save if no dialogues are added', async () => {
    render(
      <ApiProvider>
        <DialoguesStep {...mockProps} />
      </ApiProvider>
    );

    // Try to proceed without adding dialogues
    const { onNext } = mockProps;
    onNext();

    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText(/please add at least one dialogue/i)).toBeInTheDocument();
    });

    // Verify API call was not made
    expect(mockApiContext.createDialogue).not.toHaveBeenCalled();
  });

  test('should show error if episode ID is missing', async () => {
    const propsWithoutEpisodeId = {
      ...mockProps,
      data: {
        ...mockStoryData,
        episode: { ...mockStoryData.episode, id: undefined },
      },
    };

    render(
      <ApiProvider>
        <DialoguesStep {...propsWithoutEpisodeId} />
      </ApiProvider>
    );

    // Add a dialogue
    fireEvent.change(screen.getByLabelText(/character/i), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText(/dialogue text/i), { target: { value: 'Test dialogue text' } });
    fireEvent.change(screen.getByLabelText(/order/i), { target: { value: '1' } });
    
    fireEvent.click(screen.getByText(/add dialogue/i));

    // Wait for dialogue to be added
    await waitFor(() => {
      expect(screen.getByText('Test Character')).toBeInTheDocument();
    });

    // Mock the Next button click
    const { onNext } = mockProps;
    onNext();

    // Wait for error to be displayed
    await waitFor(() => {
      expect(screen.getByText(/episode not found/i)).toBeInTheDocument();
    });

    // Verify API call was not made
    expect(mockApiContext.createDialogue).not.toHaveBeenCalled();
  });

  test('should validate required fields when adding dialogue', async () => {
    render(
      <ApiProvider>
        <DialoguesStep {...mockProps} />
      </ApiProvider>
    );

    // Try to add dialogue without selecting character
    fireEvent.change(screen.getByLabelText(/dialogue text/i), { target: { value: 'Test dialogue text' } });
    fireEvent.change(screen.getByLabelText(/order/i), { target: { value: '1' } });
    
    fireEvent.click(screen.getByText(/add dialogue/i));

    // Wait for validation error
    await waitFor(() => {
      expect(screen.getByText(/please select a character/i)).toBeInTheDocument();
    });

    // Verify dialogue was not added
    expect(screen.queryByText('Test dialogue text')).not.toBeInTheDocument();
  });

  test('should update character selection when character is selected', async () => {
    render(
      <ApiProvider>
        <DialoguesStep {...mockProps} />
      </ApiProvider>
    );

    // Select a character
    fireEvent.change(screen.getByLabelText(/character/i), { target: { value: '1' } });

    // Verify the character name is updated in the form
    expect(screen.getByDisplayValue('Test Character')).toBeInTheDocument();
  });

  test('should handle multiple dialogues', async () => {
    mockApiContext.createDialogue
      .mockResolvedValueOnce({ id: 1, character: 'Test Character', text: 'First dialogue', order: 1, camera_angle: { x: 0, y: 0, z: 0 } })
      .mockResolvedValueOnce({ id: 2, character: 'Another Character', text: 'Second dialogue', order: 2, camera_angle: { x: 0, y: 0, z: 0 } });

    render(
      <ApiProvider>
        <DialoguesStep {...mockProps} />
      </ApiProvider>
    );

    // Add first dialogue
    fireEvent.change(screen.getByLabelText(/character/i), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText(/dialogue text/i), { target: { value: 'First dialogue' } });
    fireEvent.change(screen.getByLabelText(/order/i), { target: { value: '1' } });
    fireEvent.click(screen.getByText(/add dialogue/i));

    // Wait for first dialogue to be added
    await waitFor(() => {
      expect(screen.getByText('Test Character')).toBeInTheDocument();
    });

    // Add second dialogue
    fireEvent.change(screen.getByLabelText(/character/i), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText(/dialogue text/i), { target: { value: 'Second dialogue' } });
    fireEvent.change(screen.getByLabelText(/order/i), { target: { value: '2' } });
    fireEvent.click(screen.getByText(/add dialogue/i));

    // Wait for second dialogue to be added
    await waitFor(() => {
      expect(screen.getByText('Another Character')).toBeInTheDocument();
    });

    // Mock the Next button click
    const { onNext } = mockProps;
    onNext();

    // Wait for API calls to complete
    await waitFor(() => {
      expect(mockApiContext.createDialogue).toHaveBeenCalledTimes(2);
    });

    // Verify both dialogues were saved
    expect(mockApiContext.createDialogue).toHaveBeenCalledWith(1, {
      character: 'Test Character',
      text: 'First dialogue',
      order: 1,
      camera_angle: { x: 0, y: 0, z: 0 },
    });

    expect(mockApiContext.createDialogue).toHaveBeenCalledWith(1, {
      character: 'Another Character',
      text: 'Second dialogue',
      order: 2,
      camera_angle: { x: 0, y: 0, z: 0 },
    });
  });
});





