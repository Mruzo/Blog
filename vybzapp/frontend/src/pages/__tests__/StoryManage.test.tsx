import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import StoryManage from '../StoryManage';
import {
  createMockApiContext,
  renderWithRouter,
} from '../../testing/testHelpers';

const mockUseApi = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ id: '1' }),
  useNavigate: () => jest.fn(),
}));

jest.mock('../../contexts/ApiContext', () => ({
  useApi: () => mockUseApi(),
}));

jest.mock('../../contexts/FeedbackContext', () => {
  const React = require('react');
  return {
    FeedbackContext: React.createContext({ setContext: jest.fn() }),
  };
});

jest.mock('../../services/collaborationService', () => ({
  collaborationService: {
    getCollaborators: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock('../../services/api', () => ({
  __esModule: true,
  default: {
    getSeasons: jest.fn().mockResolvedValue([]),
    getCharacters: jest.fn().mockResolvedValue([]),
    getEpisodes: jest.fn().mockResolvedValue([]),
  },
}));

const mockStory = {
  id: 1,
  title: 'Epic Adventure',
  description: 'A thrilling tale of heroes and villains',
  is_public: true,
  moderation_status: 'approved',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  user: 1,
};

const renderStoryManage = () => renderWithRouter(<StoryManage />);

describe('StoryManage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseApi.mockReturnValue(
      createMockApiContext({
        seasons: [],
        loadStory: jest.fn().mockResolvedValue(mockStory),
        loadSeasons: jest.fn().mockResolvedValue([]),
        loadCharacters: jest.fn().mockResolvedValue([]),
        currentUser: { id: 1, username: 'testuser', first_name: 'Test' },
      }),
    );
  });

  it('renders manage story hero', async () => {
    renderStoryManage();

    expect(await screen.findByRole('heading', { level: 1, name: 'Manage story' })).toBeInTheDocument();
    expect(await screen.findByText(/Epic Adventure/)).toBeInTheDocument();
  });

  it('shows loading spinner while authorization is pending', () => {
    mockUseApi.mockReturnValue(
      createMockApiContext({
        seasons: [],
        loadStory: jest.fn(() => new Promise(() => {})),
        currentUser: { id: 1, username: 'testuser' },
      }),
    );

    renderStoryManage();

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('calls loadStory for route story id', async () => {
    const loadStory = jest.fn().mockResolvedValue(mockStory);
    mockUseApi.mockReturnValue(
      createMockApiContext({
        seasons: [],
        loadStory,
        loadSeasons: jest.fn().mockResolvedValue([]),
        loadCharacters: jest.fn().mockResolvedValue([]),
        currentUser: { id: 1, username: 'testuser' },
      }),
    );

    renderStoryManage();

    await waitFor(() => {
      expect(loadStory).toHaveBeenCalledWith(1);
    });
  });
});
