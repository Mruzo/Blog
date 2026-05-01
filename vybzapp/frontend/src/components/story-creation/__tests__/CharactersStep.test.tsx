import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import CharactersStep from '../CharactersStep';
import { ApiProvider } from '../../../contexts/ApiContext';

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

jest.mock('../../../contexts/ApiContext', () => ({
  useApi: () => mockApiContext,
  ApiProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const mockStoryData = {
  story: {
    title: 'Test Story',
    description: 'A test story',
    is_public: false,
  },
  season: {
    title: 'Season 1',
    season_number: 1,
    description: 'First season',
    release_date: '2024-01-01',
  },
  characters: [] as Array<{
    id?: number;
    name: string;
    bio: string;
    personality: string;
    love_interest: string;
    pov_head_x?: number;
    pov_head_y?: number;
    pov_head_z?: number;
  }>,
  episode: {
    title: 'Episode 1',
    episode_number: 1,
    description: 'First episode',
    summary: '',
    is_published: false,
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

function renderCharactersStep(
  overrides?: Partial<React.ComponentProps<typeof CharactersStep>>
) {
  let footerNext: (() => Promise<void>) | null = null;
  const registerFooterNext = (fn: (() => Promise<void>) | null) => {
    footerNext = fn;
  };
  const utils = render(
    <ApiProvider>
      <CharactersStep
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

describe('CharactersStep', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApiContext.createStory.mockResolvedValue({
      id: 101,
      title: 'Test Story',
      description: 'A test story',
      is_public: false,
    });
    mockApiContext.createSeason.mockResolvedValue({
      id: 201,
      title: 'Season 1',
      season_number: 1,
      description: 'First season',
      release_date: '2024-01-01',
    });
    mockApiContext.createCharacter.mockResolvedValue({
      id: 301,
      name: 'Hero',
      bio: 'Bio here',
      personality: 'Brave',
      love_interest: '',
    });
  });

  const fillAndAddCharacter = () => {
    fireEvent.change(screen.getByLabelText(/character name/i), { target: { value: 'Hero' } });
    fireEvent.change(screen.getByLabelText(/character bio/i), { target: { value: 'Bio here' } });
    fireEvent.change(screen.getByLabelText(/^personality/i), { target: { value: 'Brave' } });
    fireEvent.click(screen.getByRole('button', { name: /add character/i }));
  };

  test('footer next persists new characters (createStory, createSeason, createCharacter) then advances', async () => {
    const { getFooterNext } = renderCharactersStep();

    fillAndAddCharacter();
    await waitFor(() => {
      expect(screen.getByText('Hero')).toBeInTheDocument();
    });

    const footerNext = getFooterNext();
    expect(footerNext).not.toBeNull();

    await act(async () => {
      await footerNext!();
    });

    await waitFor(() => {
      expect(mockApiContext.createStory).toHaveBeenCalledWith({
        title: 'Test Story',
        description: 'A test story',
        is_public: false,
      });
    });
    await waitFor(() => {
      expect(mockApiContext.createSeason).toHaveBeenCalledWith(101, {
        title: 'Season 1',
        season_number: 1,
        description: 'First season',
        release_date: '2024-01-01',
      });
    });
    await waitFor(() => {
      expect(mockApiContext.createCharacter).toHaveBeenCalledWith(101, {
        name: 'Hero',
        bio: 'Bio here',
        personality: 'Brave',
        love_interest: '',
      });
    });
    expect(mockOnNext).toHaveBeenCalled();
  });

  test('does not call createCharacter for characters that already have server ids', async () => {
    const { getFooterNext } = renderCharactersStep({
      data: {
        ...mockStoryData,
        story: { ...mockStoryData.story, id: 99 },
        season: { ...mockStoryData.season, id: 88 },
        characters: [
          {
            id: 7,
            name: 'Existing',
            bio: 'Bio',
            personality: 'Shy',
            love_interest: '',
          },
        ],
      },
    });

    await act(async () => {
      await getFooterNext()!();
    });

    expect(mockApiContext.createStory).not.toHaveBeenCalled();
    expect(mockApiContext.createSeason).not.toHaveBeenCalled();
    expect(mockApiContext.createCharacter).not.toHaveBeenCalled();
    expect(mockOnNext).toHaveBeenCalled();
  });

  test('shows error when advancing with no characters', async () => {
    const { getFooterNext } = renderCharactersStep();

    await act(async () => {
      await getFooterNext()!();
    });

    await waitFor(() => {
      expect(screen.getByText(/please add at least one character/i)).toBeInTheDocument();
    });
    expect(mockApiContext.createStory).not.toHaveBeenCalled();
    expect(mockOnNext).not.toHaveBeenCalled();
  });

  test('preserves POV coordinates when creating character', async () => {
    const { getFooterNext } = renderCharactersStep();

    fireEvent.change(screen.getByLabelText(/character name/i), { target: { value: 'Hero' } });
    fireEvent.change(screen.getByLabelText(/character bio/i), { target: { value: 'Bio here' } });
    fireEvent.change(screen.getByLabelText(/^personality/i), { target: { value: 'Brave' } });
    fireEvent.change(screen.getByLabelText(/^X:/i), { target: { value: '2.5' } });
    fireEvent.change(screen.getByLabelText(/^Y:/i), { target: { value: '1.8' } });
    fireEvent.change(screen.getByLabelText(/^Z:/i), { target: { value: '-1.2' } });
    fireEvent.click(screen.getByRole('button', { name: /add character/i }));

    await waitFor(() => {
      expect(screen.getByText('Hero')).toBeInTheDocument();
    });

    await act(async () => {
      await getFooterNext()!();
    });

    await waitFor(() => {
      expect(mockOnDataUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          characters: expect.arrayContaining([
            expect.objectContaining({
              id: 301,
              pov_head_x: 2.5,
              pov_head_y: 1.8,
              pov_head_z: -1.2,
            }),
          ]),
        })
      );
    });
  });
});
