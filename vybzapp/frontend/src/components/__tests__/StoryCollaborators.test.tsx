import React from 'react';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import StoryCollaborators from '../StoryCollaborators';
import { collaborationService } from '../../services/collaborationService';
import { apiService } from '../../services/api';
import { renderWithRoute } from '../../testing/testHelpers';

jest.mock('../../services/collaborationService', () => ({
  collaborationService: {
    getStudioCollaboratorsForStory: jest.fn(),
    bulkAssignStoryCollaborators: jest.fn(),
  },
}));

jest.mock('../../services/api', () => ({
  apiService: {
    getStory: jest.fn(),
    getCurrentUser: jest.fn(),
  },
}));

const mockCollaboration = collaborationService as jest.Mocked<typeof collaborationService>;
const mockApi = apiService as jest.Mocked<typeof apiService>;

const renderPanel = () =>
  renderWithRoute(<StoryCollaborators />, {
    path: '/immersivecomics/story/:id/manage/',
    url: '/immersivecomics/story/45/manage/',
  });

describe('StoryCollaborators', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApi.getStory.mockResolvedValue({ id: 45, user: 1 } as never);
    mockApi.getCurrentUser.mockResolvedValue({ id: 1 } as never);
  });

  it('hides Save when there are no studio teammates', async () => {
    mockCollaboration.getStudioCollaboratorsForStory.mockResolvedValue([]);
    renderPanel();
    expect(await screen.findByText(/no studio collaborators yet/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /save story team/i })).not.toBeInTheDocument();
  });

  it('saves selected story roles for studio teammates', async () => {
    mockCollaboration.getStudioCollaboratorsForStory.mockResolvedValue([
      {
        id: 9,
        user: { id: 2, username: 'uzouzo' },
        role: 'writer',
        roles: ['writer'],
        is_story_collaborator: false,
      },
    ] as never);
    mockCollaboration.bulkAssignStoryCollaborators.mockResolvedValue([]);
    renderPanel();

    fireEvent.click(await screen.findByRole('button', { name: 'Writer' }));
    fireEvent.click(screen.getByRole('button', { name: /save story team/i }));

    await waitFor(() => {
      expect(mockCollaboration.bulkAssignStoryCollaborators).toHaveBeenCalledWith(45, [
        { user_id: 2, roles: ['writer'] },
      ]);
    });
  });

  it('lets teammates see themselves without managing the team', async () => {
    mockApi.getCurrentUser.mockResolvedValue({ id: 2 } as never);
    mockCollaboration.getStudioCollaboratorsForStory.mockResolvedValue([
      {
        id: 0,
        user: { id: 1, username: 'misteruzo', first_name: 'chris', last_name: 'uzo' },
        role: 'owner',
        roles: ['owner'],
        is_story_collaborator: true,
        is_owner: true,
        story_roles: ['owner'],
      },
      {
        id: 9,
        user: { id: 2, username: 'uzouzo' },
        role: 'writer',
        roles: ['writer', '3d_artist'],
        is_story_collaborator: true,
        is_owner: false,
        story_roles: ['writer', '3d_artist', 'voice_actor'],
      },
    ] as never);

    renderPanel();

    expect(await screen.findByText('Me')).toBeInTheDocument();
    expect(screen.getByText('chris uzo')).toBeInTheDocument();
    expect(screen.queryByText('@uzouzo')).not.toBeInTheDocument();
    expect(screen.getByText('Owner')).toBeInTheDocument();
    expect(screen.getByText('Writer')).toBeInTheDocument();
    expect(screen.getByText('3d Artist')).toBeInTheDocument();
    expect(screen.getByText('Voice Actor')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /save story team/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Writer' })).not.toBeInTheDocument();
    expect(screen.getByText(/only the story owner can change roles/i)).toBeInTheDocument();
  });
});
