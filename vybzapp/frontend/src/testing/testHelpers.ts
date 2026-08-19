import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

export type MockApiContext = ReturnType<typeof createMockApiContext>;

export const createMockApiContext = (overrides: Record<string, unknown> = {}) => ({
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
  currentUser: null,
  isLoading: false,
  error: null,
  authInitialized: true,
  loadStories: jest.fn(),
  loadPublicStories: jest.fn().mockResolvedValue(undefined),
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
  createDialogue: jest.fn(),
  updateDialogue: jest.fn(),
  deleteDialogue: jest.fn(),
  loadStudios: jest.fn(),
  loadMyStudio: jest.fn(),
  loadAudioTracks: jest.fn(),
  handleApiCall: jest.fn(),
  clearError: jest.fn(),
  setCurrentStory: jest.fn(),
  setCurrentSeason: jest.fn(),
  setCurrentEpisode: jest.fn(),
  logout: jest.fn(),
  ...overrides,
});

export const createPublicStory = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  title: 'Epic Adventure',
  description: 'A thrilling tale of heroes and villains',
  is_public: true,
  moderation_status: 'approved',
  user: 1,
  user_username: 'creator',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  total_views: 0,
  ...overrides,
});

export const createMockStudio = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  name: 'Test Studio',
  description: 'A test studio',
  owner: {
    id: 1,
    username: 'testuser',
    first_name: 'Test',
    last_name: 'User',
  },
  collaborators: [],
  stories_count: 0,
  collaborators_count: 0,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  is_public: true,
  ...overrides,
});

export const renderWithRouter = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: BrowserRouter, ...options });

/** Register a jest mock for ApiContext.useApi that reads from this ref. */
export const installMockUseApi = () => {
  const mockUseApi = jest.fn();
  jest.mock('../contexts/ApiContext', () => ({
    useApi: () => mockUseApi(),
  }));
  return mockUseApi;
};
