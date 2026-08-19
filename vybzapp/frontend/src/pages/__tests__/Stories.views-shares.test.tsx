import React from 'react';
import { screen, waitFor, fireEvent } from '@testing-library/react';
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
    getCollaborators: jest.fn(() => Promise.resolve([])),
  },
}));

import apiService from '../../services/api';
const mockedApiService = apiService as jest.Mocked<typeof apiService>;

global.fetch = jest.fn();

const mockWindowOpen = jest.fn();
window.open = mockWindowOpen;

Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn().mockResolvedValue(undefined),
  },
});

const mockSeasons = [
  {
    id: 1,
    title: 'Season 1',
    season_number: 1,
    description: 'First season',
    comic: 1,
  },
];

const mockEpisodes = [
  {
    id: 1,
    title: 'Episode 1',
    episode_number: 1,
    description: 'First episode',
    season: 1,
    is_published: true,
    view_count: 10,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

const setupStoryCatalogueMocks = () => {
  mockedApiService.getSeasons.mockResolvedValue(mockSeasons);
  mockedApiService.getEpisodes.mockResolvedValue(mockEpisodes);
  mockedApiService.getDialogues.mockResolvedValue([]);
  mockedApiService.getSeasonComments.mockResolvedValue([]);
};

const renderStoriesWithViews = () => {
  mockUseApi.mockReturnValue(
    createMockApiContext({
      stories: [
        createPublicStory({
          title: 'Test Story 1',
          description: 'A test story description',
          total_views: 50,
        }),
      ],
    }),
  );
  setupStoryCatalogueMocks();
  return renderWithRouter(<Stories />);
};

describe('Stories views and share features', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    });
    mockWindowOpen.mockClear();
  });

  it('displays total views from the story payload', async () => {
    renderStoriesWithViews();

    await waitFor(() => {
      expect(mockedApiService.getSeasons).toHaveBeenCalledWith(1, { catalogue: true });
    });

    await waitFor(() => {
      expect(screen.getByLabelText('Total story views')).toBeInTheDocument();
    });

    expect(screen.getByLabelText('Total story views')).toHaveTextContent('50');
  });

  it('shows share buttons once story data is loaded', async () => {
    renderStoriesWithViews();

    await waitFor(() => {
      expect(screen.getByTitle('Share on Facebook')).toBeInTheDocument();
      expect(screen.getByTitle('Share on X (Twitter)')).toBeInTheDocument();
      expect(screen.getByTitle('Share on Reddit')).toBeInTheDocument();
      expect(screen.getByTitle('Copy link')).toBeInTheDocument();
    });
  });

  it('opens Facebook share dialog when the Facebook button is clicked', async () => {
    renderStoriesWithViews();

    await waitFor(() => {
      expect(screen.getByTitle('Share on Facebook')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle('Share on Facebook'));

    await waitFor(() => {
      expect(mockWindowOpen).toHaveBeenCalledWith(
        expect.stringContaining('facebook.com/sharer'),
        '_blank',
        'width=600,height=400',
      );
    });
  });

  it('tracks share clicks', async () => {
    renderStoriesWithViews();

    await waitFor(() => {
      expect(screen.getByTitle('Share on Facebook')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle('Share on Facebook'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });
});
