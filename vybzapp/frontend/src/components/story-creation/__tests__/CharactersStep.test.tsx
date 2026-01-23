import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CharactersStep from '../CharactersStep';
import { ApiProvider } from '../../../contexts/ApiContext';

// Mock the API context
const mockApiContext = {
  createStory: jest.fn(),
  createSeason: jest.fn(),
  createCharacter: jest.fn(),
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
  updateStory: jest.fn(),
  deleteStory: jest.fn(),
  loadSeasons: jest.fn(),
  updateSeason: jest.fn(),
  deleteSeason: jest.fn(),
  loadCharacters: jest.fn(),
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
    title: 'Test Story',
    description: 'A test story',
    summary: 'Test summary',
    genre: 'Fantasy',
    target_audience: 'Adults',
  },
  season: {
    title: 'Season 1',
    season_number: 1,
    description: 'First season',
  },
  characters: [],
  episode: {
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

describe('CharactersStep Progressive Saving', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApiContext.createStory.mockResolvedValue({ id: 1, ...mockStoryData.story });
    mockApiContext.createSeason.mockResolvedValue({ id: 1, ...mockStoryData.season });
    mockApiContext.createCharacter.mockResolvedValue({ id: 1, name: 'Test Character', bio: 'Test bio', role: 'Protagonist', appearance: 'Test appearance' });
  });

  test('should save story, season, and characters to database when Next is clicked', async () => {
    render(
      <ApiProvider>
        <CharactersStep {...mockProps} />
      </ApiProvider>
    );

    // Add a character
    fireEvent.change(screen.getByLabelText(/character name/i), { target: { value: 'Test Character' } });
    fireEvent.change(screen.getByLabelText(/character bio/i), { target: { value: 'Test bio' } });
    fireEvent.change(screen.getByLabelText(/character role/i), { target: { value: 'Protagonist' } });
    fireEvent.change(screen.getByLabelText(/character appearance/i), { target: { value: 'Test appearance' } });
    
    fireEvent.click(screen.getByText(/add character/i));

    // Wait for character to be added
    await waitFor(() => {
      expect(screen.getByText('Test Character')).toBeInTheDocument();
    });

    // Mock the Next button click (this would be triggered by the wizard's Next button)
    const { onNext } = mockProps;
    
    // Simulate the wizard calling the step's handleNext function
    const stepComponent = screen.getByTestId('characters-step');
    if (stepComponent) {
      // The handleNext function should be called when the wizard's Next button is clicked
      // This is handled by the onNext prop override in the component
      onNext();
    }

    // Wait for API calls to complete
    await waitFor(() => {
      expect(mockApiContext.createStory).toHaveBeenCalledWith({
        title: 'Test Story',
        description: 'A test story',
        summary: 'Test summary',
        genre: 'Fantasy',
        target_audience: 'Adults',
      });
    });

    await waitFor(() => {
      expect(mockApiContext.createSeason).toHaveBeenCalledWith(1, {
        title: 'Season 1',
        season_number: 1,
        description: 'First season',
      });
    });

    await waitFor(() => {
      expect(mockApiContext.createCharacter).toHaveBeenCalledWith(1, {
        name: 'Test Character',
        bio: 'Test bio',
        role: 'Protagonist',
        appearance: 'Test appearance',
      });
    });

    // Verify onDataUpdate was called with updated data
    expect(mockProps.onDataUpdate).toHaveBeenCalledWith({
      story: { ...mockStoryData.story, id: 1 },
      season: { ...mockStoryData.season, id: 1 },
      characters: [{ id: 1, name: 'Test Character', bio: 'Test bio', role: 'Protagonist', appearance: 'Test appearance' }],
    });
  });

  test('should handle API errors gracefully', async () => {
    mockApiContext.createStory.mockRejectedValue(new Error('API Error'));

    render(
      <ApiProvider>
        <CharactersStep {...mockProps} />
      </ApiProvider>
    );

    // Add a character
    fireEvent.change(screen.getByLabelText(/character name/i), { target: { value: 'Test Character' } });
    fireEvent.change(screen.getByLabelText(/character bio/i), { target: { value: 'Test bio' } });
    fireEvent.change(screen.getByLabelText(/character role/i), { target: { value: 'Protagonist' } });
    fireEvent.change(screen.getByLabelText(/character appearance/i), { target: { value: 'Test appearance' } });
    
    fireEvent.click(screen.getByText(/add character/i));

    // Wait for character to be added
    await waitFor(() => {
      expect(screen.getByText('Test Character')).toBeInTheDocument();
    });

    // Mock the Next button click
    const { onNext } = mockProps;
    onNext();

    // Wait for error to be displayed
    await waitFor(() => {
      expect(screen.getByText(/failed to save story data/i)).toBeInTheDocument();
    });

    // Verify onNext was not called due to error
    expect(mockProps.onNext).not.toHaveBeenCalled();
  });

  test('should not save if no characters are added', async () => {
    render(
      <ApiProvider>
        <CharactersStep {...mockProps} />
      </ApiProvider>
    );

    // Try to proceed without adding characters
    const { onNext } = mockProps;
    onNext();

    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText(/please add at least one character/i)).toBeInTheDocument();
    });

    // Verify API calls were not made
    expect(mockApiContext.createStory).not.toHaveBeenCalled();
    expect(mockApiContext.createSeason).not.toHaveBeenCalled();
    expect(mockApiContext.createCharacter).not.toHaveBeenCalled();
  });

  test('should update existing characters if they already have IDs', async () => {
    const existingCharacter = {
      id: 1,
      name: 'Existing Character',
      bio: 'Existing bio',
      role: 'Protagonist',
      appearance: 'Existing appearance',
    };

    const propsWithExistingCharacter = {
      ...mockProps,
      data: {
        ...mockStoryData,
        characters: [existingCharacter],
      },
    };

    render(
      <ApiProvider>
        <CharactersStep {...propsWithExistingCharacter} />
      </ApiProvider>
    );

    // Mock the Next button click
    const { onNext } = mockProps;
    onNext();

    // Wait for API calls to complete
    await waitFor(() => {
      expect(mockApiContext.createStory).toHaveBeenCalled();
    });

    // Verify existing character was not re-created
    expect(mockApiContext.createCharacter).not.toHaveBeenCalledWith(1, existingCharacter);
  });

  test('should save POV head position data when creating character', async () => {
    render(
      <ApiProvider>
        <CharactersStep {...mockProps} />
      </ApiProvider>
    );

    // Add a character with POV data
    fireEvent.change(screen.getByLabelText(/character name/i), { target: { value: 'Test Character' } });
    fireEvent.change(screen.getByLabelText(/character bio/i), { target: { value: 'Test bio' } });
    fireEvent.change(screen.getByLabelText(/personality/i), { target: { value: 'Brave' } });
    fireEvent.change(screen.getByLabelText(/love interest/i), { target: { value: 'Test love interest' } });
    
    // Add POV head position data
    const headXInput = screen.getByLabelText(/head x position/i);
    const headYInput = screen.getByLabelText(/head y position/i);
    const headZInput = screen.getByLabelText(/head z position/i);
    
    fireEvent.change(headXInput, { target: { value: '2.5' } });
    fireEvent.change(headYInput, { target: { value: '1.8' } });
    fireEvent.change(headZInput, { target: { value: '-1.2' } });
    
    fireEvent.click(screen.getByText(/add character/i));

    // Wait for character to be added
    await waitFor(() => {
      expect(screen.getByText('Test Character')).toBeInTheDocument();
    });

    // Mock the Next button click
    const { onNext } = mockProps;
    onNext();

    // Wait for API calls to complete
    await waitFor(() => {
      expect(mockApiContext.createCharacter).toHaveBeenCalledWith(1, {
        name: 'Test Character',
        bio: 'Test bio',
        personality: 'Brave',
        love_interest: 'Test love interest',
      });
    });

    // Verify POV data is preserved in onDataUpdate
    await waitFor(() => {
      expect(mockProps.onDataUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          characters: expect.arrayContaining([
            expect.objectContaining({
              pov_head_x: 2.5,
              pov_head_y: 1.8,
              pov_head_z: -1.2
            })
          ])
        })
      );
    });
  });

  test('should handle POV data when editing existing character', async () => {
    const existingCharacter = {
      id: 1,
      name: 'Existing Character',
      bio: 'Existing bio',
      personality: 'Brave',
      love_interest: 'Existing love interest',
      pov_head_x: 1.0,
      pov_head_y: 1.6,
      pov_head_z: 0.0
    };

    const propsWithExistingCharacter = {
      ...mockProps,
      data: {
        ...mockStoryData,
        characters: [existingCharacter],
      },
    };

    render(
      <ApiProvider>
        <CharactersStep {...propsWithExistingCharacter} />
      </ApiProvider>
    );

    // Click edit on the existing character
    const editButtons = screen.getAllByText(/edit/i);
    fireEvent.click(editButtons[0]);

    // Update POV data
    const headXInput = screen.getByLabelText(/head x position/i);
    fireEvent.change(headXInput, { target: { value: '3.0' } });

    // Update character
    fireEvent.click(screen.getByText(/update character/i));

    // Wait for character to be updated
    await waitFor(() => {
      expect(mockProps.onDataUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          characters: expect.arrayContaining([
            expect.objectContaining({
              pov_head_x: 3.0,
              pov_head_y: 1.6, // Should remain unchanged
              pov_head_z: 0.0  // Should remain unchanged
            })
          ])
        })
      );
    });
  });
});








