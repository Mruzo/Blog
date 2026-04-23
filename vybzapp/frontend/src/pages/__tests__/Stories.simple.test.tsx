import React from 'react';
import { render } from 'react-dom';
import { BrowserRouter } from 'react-router-dom';
import Stories from '../Stories';
import { ApiProvider } from '../../contexts/ApiContext';
import apiService from '../../services/api';

// Mock the API service
jest.mock('../../services/api');
const mockedApiService = apiService as jest.Mocked<typeof apiService>;

// Simple test data
const mockStories = [
  {
    id: 1,
    title: 'Test Story',
    description: 'A test story',
    is_public: true,
    user: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

const mockCharacters = [
  {
    id: 1,
    name: 'Alice',
    bio: 'A brave protagonist',
    personality: 'Hero',
    love_interest: 'Adventure',
    user: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

const mockApiContext = {
  stories: mockStories,
  loadPublicStories: jest.fn(),
  isLoading: false,
  error: null,
  characters: [],
  loadCharacters: jest.fn(),
  episodes: [],
  loadEpisodes: jest.fn(),
  createEpisode: jest.fn(),
  updateEpisode: jest.fn(),
  deleteEpisode: jest.fn(),
  dialogues: [],
  loadDialogues: jest.fn(),
  createDialogue: jest.fn(),
  updateDialogue: jest.fn(),
  deleteDialogue: jest.fn(),
  createStory: jest.fn(),
  updateStory: jest.fn(),
  deleteStory: jest.fn(),
  createSeason: jest.fn(),
  updateSeason: jest.fn(),
  deleteSeason: jest.fn(),
  createCharacter: jest.fn(),
  updateCharacter: jest.fn(),
  deleteCharacter: jest.fn(),
  loadPublicStories: jest.fn(),
  handleApiCall: jest.fn(),
};

describe('Stories Component - Character Display Tests', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    jest.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('should render stories component without crashing', () => {
    mockedApiService.getCharacters.mockResolvedValue(mockCharacters);

    render(
      <BrowserRouter>
        <ApiProvider value={mockApiContext}>
          <Stories />
        </ApiProvider>
      </BrowserRouter>,
      container
    );

    // Basic check that component renders
    expect(container.innerHTML).toContain('Immersive stories');
  });

  it('should call getCharacters API for each story', async () => {
    mockedApiService.getCharacters.mockResolvedValue(mockCharacters);

    render(
      <BrowserRouter>
        <ApiProvider value={mockApiContext}>
          <Stories />
        </ApiProvider>
      </BrowserRouter>,
      container
    );

    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(mockedApiService.getCharacters).toHaveBeenCalledWith(1);
  });

  it('should handle API errors gracefully', async () => {
    mockedApiService.getCharacters.mockRejectedValue(new Error('API Error'));

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <BrowserRouter>
        <ApiProvider value={mockApiContext}>
          <Stories />
        </ApiProvider>
      </BrowserRouter>,
      container
    );

    await new Promise(resolve => setTimeout(resolve, 100));

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should display loading state when isLoading is true', () => {
    const contextWithLoading = {
      ...mockApiContext,
      isLoading: true,
    };

    render(
      <BrowserRouter>
        <ApiProvider value={contextWithLoading}>
          <Stories />
        </ApiProvider>
      </BrowserRouter>,
      container
    );

    expect(container.innerHTML).toContain('spinner-border');
  });

  it('should display error state when there is an error', () => {
    const contextWithError = {
      ...mockApiContext,
      error: 'Test error message',
    };

    render(
      <BrowserRouter>
        <ApiProvider value={contextWithError}>
          <Stories />
        </ApiProvider>
      </BrowserRouter>,
      container
    );

    expect(container.innerHTML).toContain('Test error message');
  });

  it('should display empty state when no stories exist', () => {
    const contextWithNoStories = {
      ...mockApiContext,
      stories: [],
    };

    render(
      <BrowserRouter>
        <ApiProvider value={contextWithNoStories}>
          <Stories />
        </ApiProvider>
      </BrowserRouter>,
      container
    );

    expect(container.innerHTML).toContain('No published stories yet');
  });
});









