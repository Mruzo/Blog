import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DialoguesStep from '../DialoguesStep';
import { ApiProvider } from '../../../contexts/ApiContext';

jest.mock('../../SimpleRichTextEditor', () => ({
  __esModule: true,
  default: function MockSimpleRichTextEditor({
    value,
    onChange,
    id,
  }: {
    value: string;
    onChange: (value: string) => void;
    id?: string;
  }) {
    return (
      <textarea
        id={id}
        aria-label="Dialogue text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  },
}));

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

const mockOnNext = jest.fn();
const mockOnDataUpdate = jest.fn();

const expectedCameraPayload = {
  camera_orbit: '0deg 75deg 3m',
  camera_target: '0m 1.6m 0m',
  field_of_view: 45,
  zoom_speed: 1,
  rotation: '0deg 0deg 0deg',
};

function fillDialogueText(text: string) {
  const editor = document.getElementById('dialogue-text') as HTMLTextAreaElement;
  fireEvent.change(editor, { target: { value: text } });
}

function selectCharacter(value: string) {
  const select = document.getElementById('character') as HTMLSelectElement;
  fireEvent.change(select, { target: { value } });
}

function setOrder(value: string) {
  const input = document.getElementById('order') as HTMLInputElement;
  fireEvent.change(input, { target: { value } });
}

function renderDialoguesStep(
  overrides?: Partial<React.ComponentProps<typeof DialoguesStep>>
) {
  let footerNext: (() => Promise<void>) | null = null;
  const registerFooterNext = (fn: (() => Promise<void>) | null) => {
    footerNext = fn;
  };
  const utils = render(
    <ApiProvider>
      <DialoguesStep
        data={mockStoryData}
        onDataUpdate={mockOnDataUpdate}
        onNext={mockOnNext}
        onPrevious={jest.fn()}
        isFirstStep={false}
        isLastStep={false}
        registerFooterNext={registerFooterNext}
        {...overrides}
      />
    </ApiProvider>
  );
  return { ...utils, getFooterNext: () => footerNext };
}

describe('DialoguesStep Progressive Saving', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApiContext.createDialogue.mockResolvedValue({
      id: 1,
      character: 1,
      text: 'Test dialogue',
      order: 1,
      ...expectedCameraPayload,
    });
    mockApiContext.loadEpisodes.mockResolvedValue([]);
    mockApiContext.createEpisode.mockResolvedValue({
      id: 99,
      title: 'Episode 1',
      episode_number: 1,
      description: 'First episode',
    });
  });

  test('should save dialogues to database when Next is clicked', async () => {
    const { getFooterNext } = renderDialoguesStep();

    // Add a dialogue
    selectCharacter('1');
    fillDialogueText('Test dialogue text');
    setOrder('1');
    
    fireEvent.click(screen.getByText(/add line/i));

    // Wait for dialogue to be added
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /script \(1\)/i })).toBeInTheDocument();
    });

    await getFooterNext()?.();

    await waitFor(() => {
      expect(mockApiContext.createDialogue).toHaveBeenCalledWith(1, {
        character: 1,
        text: 'Test dialogue text',
        order: 1,
        scene_title: '',
        scene_description: '',
        ...expectedCameraPayload,
      });
    });

    expect(mockOnDataUpdate).toHaveBeenCalledWith({
      dialogues: [{
        id: 1,
        character: 1,
        text: 'Test dialogue',
        order: 1,
        ...expectedCameraPayload,
      }],
    });

    expect(mockOnNext).toHaveBeenCalled();
  });

  test('should handle API errors gracefully', async () => {
    mockApiContext.createDialogue.mockRejectedValue(new Error('API Error'));

    const { getFooterNext } = renderDialoguesStep();

    selectCharacter('1');
    fillDialogueText('Test dialogue text');
    setOrder('1');
    
    fireEvent.click(screen.getByText(/add line/i));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /script \(1\)/i })).toBeInTheDocument();
    });

    await getFooterNext()?.();

    await waitFor(() => {
      expect(screen.getByText(/failed to save dialogues/i)).toBeInTheDocument();
    });

    expect(mockOnNext).not.toHaveBeenCalled();
  });

  test('should not save if no dialogues are added', async () => {
    const { getFooterNext } = renderDialoguesStep();

    await getFooterNext()?.();

    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText(/please add at least one dialogue/i)).toBeInTheDocument();
    });

    // Verify API call was not made
    expect(mockApiContext.createDialogue).not.toHaveBeenCalled();
  });

  test('should show error if season ID is missing when saving', async () => {
    const { getFooterNext } = renderDialoguesStep({
      data: {
        ...mockStoryData,
        season: { ...mockStoryData.season, id: undefined },
        episode: { ...mockStoryData.episode, id: undefined },
      },
    });

    selectCharacter('1');
    fillDialogueText('Test dialogue text');
    setOrder('1');

    fireEvent.click(screen.getByText(/add line/i));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /script \(1\)/i })).toBeInTheDocument();
    });

    await getFooterNext()?.();

    await waitFor(() => {
      expect(screen.getByText(/episode not found/i)).toBeInTheDocument();
    });

    expect(mockApiContext.createEpisode).not.toHaveBeenCalled();
    expect(mockApiContext.createDialogue).not.toHaveBeenCalled();
  });

  test('should validate required fields when adding dialogue', async () => {
    renderDialoguesStep();

    selectCharacter('1');
    setOrder('1');

    fireEvent.click(screen.getByText(/add line/i));

    await waitFor(() => {
      expect(screen.getByText(/dialogue text is required/i)).toBeInTheDocument();
    });

    expect(screen.queryByRole('heading', { name: /script \(1\)/i })).not.toBeInTheDocument();
  });

  test('should update character selection when character is selected', async () => {
    renderDialoguesStep();

    // Select a character
    selectCharacter('1');

    // Verify the character name is updated in the form
    expect(screen.getByDisplayValue('Test Character')).toBeInTheDocument();
  });

  test('should handle multiple dialogues', async () => {
    mockApiContext.createDialogue
      .mockResolvedValueOnce({ id: 1, character: 1, text: 'First dialogue', order: 1, ...expectedCameraPayload })
      .mockResolvedValueOnce({ id: 2, character: 2, text: 'Second dialogue', order: 2, ...expectedCameraPayload });

    const { getFooterNext } = renderDialoguesStep();

    // Add first dialogue
    selectCharacter('1');
    fillDialogueText('First dialogue');
    setOrder('1');
    fireEvent.click(screen.getByText(/add line/i));

    // Wait for first dialogue to be added
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /script \(1\)/i })).toBeInTheDocument();
    });

    // Add second dialogue
    selectCharacter('2');
    fillDialogueText('Second dialogue');
    setOrder('2');
    fireEvent.click(screen.getByText(/add line/i));

    // Wait for second dialogue to be added
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /script \(2\)/i })).toBeInTheDocument();
    });

    await getFooterNext()?.();

    await waitFor(() => {
      expect(mockApiContext.createDialogue).toHaveBeenCalledTimes(2);
    });

    expect(mockApiContext.createDialogue).toHaveBeenCalledWith(1, {
      character: 1,
      text: 'First dialogue',
      order: 1,
      scene_title: '',
      scene_description: '',
      ...expectedCameraPayload,
    });

    expect(mockApiContext.createDialogue).toHaveBeenCalledWith(1, {
      character: 2,
      text: 'Second dialogue',
      order: 2,
      scene_title: '',
      scene_description: '',
      ...expectedCameraPayload,
    });
  });

  test('creates episode when missing before saving dialogues', async () => {
    const { getFooterNext } = renderDialoguesStep({
      data: {
        ...mockStoryData,
        episode: {
          title: 'My Episode',
          episode_number: 1,
          description: 'Episode desc',
          summary: '',
          is_published: false,
        },
      },
    });

    selectCharacter('1');
    fillDialogueText('Test dialogue text');
    setOrder('1');
    fireEvent.click(screen.getByText(/add line/i));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /script \(1\)/i })).toBeInTheDocument();
    });

    await getFooterNext()?.();

    await waitFor(() => {
      expect(mockApiContext.createEpisode).toHaveBeenCalledWith(1, {
        title: 'My Episode',
        episode_number: 1,
        description: 'Episode desc',
        summary: '',
        is_published: false,
      });
    });

    await waitFor(() => {
      expect(mockApiContext.createDialogue).toHaveBeenCalledWith(99, expect.objectContaining({
        character: 1,
        text: 'Test dialogue text',
        order: 1,
      }));
    });
    expect(mockOnNext).toHaveBeenCalled();
  });
});










