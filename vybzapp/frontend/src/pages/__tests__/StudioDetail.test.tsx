import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import StudioDetail from '../StudioDetail';
import { createMockStudio, createPublicStory, renderWithRoute } from '../../testing/testHelpers';

const mockGetStudio = jest.fn();
const mockGetStories = jest.fn();
const mockGetPublicStories = jest.fn();
const mockGetCurrentUser = jest.fn();

jest.mock('../../services/api', () => ({
  apiService: {
    getStudio: (...args: unknown[]) => mockGetStudio(...args),
    getStories: (...args: unknown[]) => mockGetStories(...args),
    getPublicStories: (...args: unknown[]) => mockGetPublicStories(...args),
    getCurrentUser: (...args: unknown[]) => mockGetCurrentUser(...args),
    getCharacters: jest.fn().mockResolvedValue([]),
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

const draftStory = createPublicStory({
  id: 33,
  title: 'The Chase',
  is_public: false,
  moderation_status: 'pending',
  studio: 7,
  user: 1,
});

const studio = createMockStudio({
  id: 7,
  name: 'Chase Studio',
  owner: { id: 1, username: 'owner', first_name: 'Owner', last_name: 'One' },
  collaborators: [
    {
      id: 4,
      role: 'writer',
      is_active: true,
      user: { id: 99, username: 'teammate', first_name: 'Team', last_name: 'Mate' },
    },
  ],
});

const renderStudio = () =>
  renderWithRoute(<StudioDetail />, {
    path: '/immersivecomics/studio/:id/',
    url: '/immersivecomics/studio/7/',
  });

describe('StudioDetail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockGetStudio.mockResolvedValue(studio);
    mockGetStories.mockResolvedValue([draftStory]);
    mockGetPublicStories.mockResolvedValue([]);
  });

  it('shows teammates drafts they can manage', async () => {
    localStorage.setItem('authToken', 'token');
    mockGetCurrentUser.mockResolvedValue({
      id: 99,
      username: 'teammate',
      first_name: 'Team',
    });

    renderStudio();

    expect(await screen.findByRole('heading', { level: 2, name: 'Studio stories' })).toBeInTheDocument();
    expect(screen.getByText(/Drafts and published stories you can work on/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Open workspace/i })).toHaveAttribute(
      'href',
      '/immersivecomics/studio/7/workspace/',
    );
    await waitFor(() => {
      expect(mockGetStories).toHaveBeenCalled();
    });
    expect(await screen.findByText('The Chase')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Manage story/i })).toHaveAttribute(
      'href',
      '/immersivecomics/story/33/manage/',
    );
    expect(mockGetPublicStories).not.toHaveBeenCalled();
  });

  it('keeps the public catalogue for visitors', async () => {
    mockGetCurrentUser.mockResolvedValue(null);

    renderStudio();

    expect(await screen.findByRole('heading', { level: 2, name: 'Published stories' })).toBeInTheDocument();
    expect(screen.getByText(/Stories published by this studio/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(mockGetPublicStories).toHaveBeenCalled();
    });
    expect(mockGetStories).not.toHaveBeenCalled();
    expect(screen.queryByRole('link', { name: /Manage story/i })).not.toBeInTheDocument();
  });
});
