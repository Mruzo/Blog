import React from 'react';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import EpisodeManage from '../EpisodeManage';
import { createMockApiContext, renderWithRouter } from '../../testing/testHelpers';

const mockUseApi = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ seasonId: '5' }),
}));

jest.mock('../../contexts/ApiContext', () => ({
  useApi: () => mockUseApi(),
}));

jest.mock('../../services/api', () => {
  const apiService = {
    getSeason: jest.fn(),
    getCharacters: jest.fn(),
    getStory: jest.fn(),
    getDialogues: jest.fn().mockResolvedValue([]),
  };
  return {
    __esModule: true,
    apiService,
    default: apiService,
  };
});

import { apiService } from '../../services/api';

const mockedApi = apiService as jest.Mocked<typeof apiService>;

const mockEpisode = {
  id: 9,
  title: 'Pilot',
  episode_number: 1,
  season: 5,
  season_number: 1,
  description: 'Opening episode',
  summary: '',
  is_published: false,
  cover_image: null,
  view_count: 0,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const storyCharacter = {
  id: 7,
  name: 'Maya',
  bio: '',
  personality: '',
  love_interest: '',
  user: 1,
  story: 42,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockSeason = {
  id: 5,
  title: 'Season 1',
  season_number: 1,
  description: '',
  release_date: '2024-01-01',
  is_public: true,
  comic: 42,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

describe('EpisodeManage dialogue character selector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedApi.getSeason.mockResolvedValue(mockSeason as never);
    mockedApi.getCharacters.mockResolvedValue([storyCharacter] as never);
    mockedApi.getStory.mockResolvedValue({ id: 42, title: 'Cast Story' } as never);
    mockedApi.getDialogues.mockResolvedValue([] as never);
    mockUseApi.mockReturnValue(
      createMockApiContext({
        seasons: [],
        characters: [],
        episodes: [mockEpisode],
        loadEpisodes: jest.fn().mockResolvedValue([mockEpisode]),
        loadSeasons: jest.fn().mockResolvedValue([mockSeason]),
        loadCharacters: jest.fn().mockResolvedValue(undefined),
        loadDialogues: jest.fn().mockResolvedValue(undefined),
        currentUser: { id: 1, username: 'owner' },
      })
    );
  });

  it('lists the story characters in the Edit Dialogue dropdown', async () => {
    renderWithRouter(<EpisodeManage />);

    expect(await screen.findByRole('heading', { level: 1, name: 'Episodes' })).toBeInTheDocument();
    await waitFor(() => {
      expect(mockedApi.getCharacters).toHaveBeenCalledWith(42);
    });
    expect(mockedApi.getCharacters).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /Pilot/i }));
    fireEvent.click(await screen.findByRole('button', { name: /add first dialogue/i }));

    const characterSelect = await screen.findByLabelText(/^Character$/i);
    expect(characterSelect).toHaveTextContent('Maya');
  });

  it('keeps the saved character in the dropdown after it is cleared', async () => {
    mockedApi.getCharacters.mockResolvedValue([
      {
        ...storyCharacter,
        id: 8,
        name: 'Jordan',
      },
    ] as never);
    mockedApi.getDialogues.mockResolvedValue([
      {
        id: 51,
        character: '7',
        character_name: 'Maya',
        text: 'Hello there',
        order: 1,
        episode: 9,
        scene_title: '',
        scene_description: '',
        shot_type: 'mediumShot',
        camera_orbit: '0deg 75deg 3m',
        camera_target: '0m 1.6m 0m',
        field_of_view: 45,
        zoom_speed: 1,
        rotation: '0deg 0deg 0deg',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ] as never);

    renderWithRouter(<EpisodeManage />);

    expect(await screen.findByRole('heading', { level: 1, name: 'Episodes' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Pilot/i }));
    fireEvent.click(await screen.findByTitle('Edit line'));

    const characterSelect = await screen.findByLabelText(/^Character$/i);
    expect(characterSelect).toHaveTextContent('Maya');
    expect(characterSelect).toHaveTextContent('Jordan');

    fireEvent.change(characterSelect, { target: { value: '' } });

    expect(characterSelect).toHaveValue('');
    expect(characterSelect).toHaveTextContent('Maya');
    expect(characterSelect).toHaveTextContent('Jordan');
  });

  it('orders Edit Dialogue fields as order, scene, character, pov, then text', async () => {
    renderWithRouter(<EpisodeManage />);

    expect(await screen.findByRole('heading', { level: 1, name: 'Episodes' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Pilot/i }));
    fireEvent.click(await screen.findByRole('button', { name: /add first dialogue/i }));

    const order = await screen.findByLabelText(/^Order$/i);
    const sceneTitle = screen.getByLabelText(/^Scene Title$/i);
    const sceneDescription = screen.getByLabelText(/^Scene Description$/i);
    const character = screen.getByLabelText(/^Character$/i);
    const pov = screen.getByLabelText(/^POV/i);
    const dialogueText = screen.getByLabelText(/^Dialogue Text$/i);

    const following = Node.DOCUMENT_POSITION_FOLLOWING;
    expect(order.compareDocumentPosition(sceneTitle) & following).toBeTruthy();
    expect(sceneTitle.compareDocumentPosition(sceneDescription) & following).toBeTruthy();
    expect(sceneDescription.compareDocumentPosition(character) & following).toBeTruthy();
    expect(character.compareDocumentPosition(pov) & following).toBeTruthy();
    expect(pov.compareDocumentPosition(dialogueText) & following).toBeTruthy();
    expect(character).toHaveClass('font-quicksand');
    expect(pov).toHaveClass('font-quicksand');
    expect(document.querySelector('.my-studio__modal--bottom')).not.toBeNull();
  });

  it('loads story characters from context season comic when getSeason fails', async () => {
    mockedApi.getSeason.mockRejectedValue(new Error('Not found'));
    mockUseApi.mockReturnValue(
      createMockApiContext({
        seasons: [mockSeason],
        characters: [],
        episodes: [mockEpisode],
        loadEpisodes: jest.fn().mockResolvedValue([mockEpisode]),
        loadSeasons: jest.fn().mockResolvedValue([mockSeason]),
        loadCharacters: jest.fn().mockResolvedValue(undefined),
        loadDialogues: jest.fn().mockResolvedValue(undefined),
        currentUser: { id: 1, username: 'owner' },
      })
    );

    renderWithRouter(<EpisodeManage />);

    expect(await screen.findByRole('heading', { level: 1, name: 'Episodes' })).toBeInTheDocument();
    await waitFor(() => {
      expect(mockedApi.getCharacters).toHaveBeenCalledWith(42);
    });
    expect(mockedApi.getCharacters).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /Pilot/i }));
    fireEvent.click(await screen.findByRole('button', { name: /add first dialogue/i }));

    expect(await screen.findByLabelText(/^Character$/i)).toHaveTextContent('Maya');
  });

  it('preselects the saved character when editing a dialogue', async () => {
    mockedApi.getDialogues.mockResolvedValue([
      {
        id: 51,
        character: '7',
        character_name: 'Maya',
        text: 'Hello there',
        order: 1,
        episode: 9,
        scene_title: '',
        scene_description: '',
        shot_type: 'mediumShot',
        camera_orbit: '0deg 75deg 3m',
        camera_target: '0m 1.6m 0m',
        field_of_view: 45,
        zoom_speed: 1,
        rotation: '0deg 0deg 0deg',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ] as never);
    mockUseApi.mockReturnValue(
      createMockApiContext({
        seasons: [mockSeason],
        characters: [storyCharacter],
        episodes: [mockEpisode],
        loadEpisodes: jest.fn().mockResolvedValue([mockEpisode]),
        loadSeasons: jest.fn().mockResolvedValue([mockSeason]),
        loadCharacters: jest.fn().mockResolvedValue(undefined),
        loadDialogues: jest.fn().mockResolvedValue(undefined),
        currentUser: { id: 1, username: 'owner' },
      })
    );

    renderWithRouter(<EpisodeManage />);

    expect(await screen.findByRole('heading', { level: 1, name: 'Episodes' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Pilot/i }));
    fireEvent.click(await screen.findByTitle('Edit line'));

    const characterSelect = await screen.findByLabelText(/^Character$/i);
    expect(characterSelect).toHaveValue('7');
    expect(characterSelect).toHaveTextContent('Maya');
  });

  it('defaults a new dialogue order to one after the last line', async () => {
    mockedApi.getDialogues.mockResolvedValue([
      {
        id: 51,
        character: 7,
        character_name: 'Maya',
        text: 'First',
        order: 190,
        episode: 9,
        scene_title: '',
        scene_description: '',
        shot_type: 'mediumShot',
        camera_orbit: '0deg 75deg 3m',
        camera_target: '0m 1.6m 0m',
        field_of_view: 45,
        zoom_speed: 1,
        rotation: '0deg 0deg 0deg',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
      {
        id: 52,
        character: 7,
        character_name: 'Maya',
        text: 'Second',
        order: 192,
        episode: 9,
        scene_title: '',
        scene_description: '',
        shot_type: 'mediumShot',
        camera_orbit: '0deg 75deg 3m',
        camera_target: '0m 1.6m 0m',
        field_of_view: 45,
        zoom_speed: 1,
        rotation: '0deg 0deg 0deg',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ] as never);

    renderWithRouter(<EpisodeManage />);

    expect(await screen.findByRole('heading', { level: 1, name: 'Episodes' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Pilot/i }));
    fireEvent.click(await screen.findByRole('button', { name: /^Add$/i }));

    expect(await screen.findByLabelText(/^Order$/i)).toHaveValue(193);
  });
});
