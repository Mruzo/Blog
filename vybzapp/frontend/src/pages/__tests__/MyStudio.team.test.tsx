import React from 'react';
import { screen } from '@testing-library/react';
import { createMyStudioMockContext, renderMyStudioPage } from '../../testing/myStudioMocks';
import { collaborationService } from '../../services/collaborationService';

const mockApiContext = createMyStudioMockContext();

jest.mock('../../contexts/ApiContext', () => ({
  useApi: () => mockApiContext,
  ApiProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('../../services/api', () => ({
  apiService: {
    getSeasons: jest.fn().mockResolvedValue([]),
    getEpisodes: jest.fn().mockResolvedValue([]),
    getStudioCollaborationRequests: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock('../../services/collaborationService', () => ({
  collaborationService: {
    getStudioCollaborators: jest.fn(),
    searchUsers: jest.fn().mockResolvedValue([]),
    inviteStudioUser: jest.fn(),
    inviteStudioByEmail: jest.fn(),
    removeStudioCollaborator: jest.fn(),
  },
}));

const mockCollaboration = collaborationService as jest.Mocked<typeof collaborationService>;

const TEAM = [
  {
    id: 1,
    user: { id: 2, username: 'collaborator1', first_name: 'Collaborator', last_name: 'One' },
    role: 'writer',
    is_active: true,
    joined_at: '2024-01-01T00:00:00Z',
    owned_studio_id: 42,
  },
  {
    id: 2,
    user: { id: 1, username: 'testuser', first_name: 'Test', last_name: 'User' },
    role: 'sound_engineer',
    is_active: true,
    joined_at: '2024-01-01T00:00:00Z',
  },
];

describe('MyStudio team', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.setItem('authToken', 'test-token');
    mockCollaboration.getStudioCollaborators.mockResolvedValue(TEAM as never);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('shows invite, Me labels, and public studio links', async () => {
    renderMyStudioPage();

    expect(await screen.findByTitle('Invite collaborator')).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'Collaborator One' })).toHaveAttribute(
      'href',
      '/immersivecomics/studio/42/',
    );

    const meLinks = screen.getAllByRole('link', { name: 'Me' });
    expect(meLinks).toHaveLength(2);
    meLinks.forEach((link) => {
      expect(link).toHaveAttribute('href', '/immersivecomics/studio/1/');
    });
    expect(document.querySelector('.my-studio__teamPillOwner')).toHaveTextContent('Owner');
    expect(screen.getByText('WRITER')).toBeInTheDocument();
    expect(screen.getByText('SOUND ENGINEER')).toBeInTheDocument();
    expect(screen.getByTitle('Remove this sound engineer role')).toBeInTheDocument();
    expect(screen.getByTitle('Remove Collaborator One from studio')).toBeInTheDocument();
  });
});
