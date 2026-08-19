import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import Stories from '../Stories';
import {
  createMockApiContext,
  createPublicStory,
  renderWithRouter,
} from '../../testing/testHelpers';

const mockUseApi = jest.fn();

jest.mock('../../contexts/ApiContext', () => ({
  useApi: () => mockUseApi(),
}));

jest.mock('../../services/api', () => ({
  __esModule: true,
  default: {
    getStudio: jest.fn(),
    getStories: jest.fn().mockResolvedValue([]),
    getSeasons: jest.fn().mockResolvedValue([]),
    getEpisodes: jest.fn().mockResolvedValue([]),
    getDialogues: jest.fn().mockResolvedValue([]),
    getSeasonComments: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock('../../services/collaborationService', () => ({
  collaborationService: {
    getCollaborators: jest.fn().mockResolvedValue([]),
  },
}));

const renderStories = () => renderWithRouter(<Stories />);

describe('Stories', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseApi.mockReturnValue(createMockApiContext());
  });

  it('renders public stories hero copy', async () => {
    renderStories();

    expect(await screen.findByText('Explore')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Stories' })).toBeInTheDocument();
    expect(
      screen.getByText(/Immersive comics you can view and share/i),
    ).toBeInTheDocument();
  });

  it('shows loading spinner while stories load', () => {
    mockUseApi.mockReturnValue(createMockApiContext({ isLoading: true }));

    renderStories();

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('shows error state', () => {
    mockUseApi.mockReturnValue(
      createMockApiContext({ error: 'Failed to load stories' }),
    );

    renderStories();

    expect(screen.getByText('Failed to load stories')).toBeInTheDocument();
  });

  it('shows empty state when no published stories exist', async () => {
    renderStories();

    expect(await screen.findByText('No published stories yet')).toBeInTheDocument();
    expect(screen.getByText('Create your first story')).toBeInTheDocument();
  });

  it('renders approved public stories from context', async () => {
    mockUseApi.mockReturnValue(
      createMockApiContext({
        stories: [
          createPublicStory(),
          createPublicStory({
            id: 2,
            title: 'Mystery Manor',
            description: 'A dark mystery unfolds',
            is_public: false,
            moderation_status: 'approved',
          }),
        ],
      }),
    );

    renderStories();

    await waitFor(() => {
      expect(screen.getByText('Epic Adventure')).toBeInTheDocument();
    });
    expect(screen.queryByText('Mystery Manor')).toBeNull();
  });

  it('calls loadPublicStories on mount', async () => {
    const loadPublicStories = jest.fn().mockResolvedValue(undefined);
    mockUseApi.mockReturnValue(createMockApiContext({ loadPublicStories }));

    renderStories();

    await screen.findByText('Explore');
    expect(loadPublicStories).toHaveBeenCalled();
  });
});
