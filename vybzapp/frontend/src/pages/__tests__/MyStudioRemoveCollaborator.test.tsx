import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import MyStudio from '../MyStudio';
import { createMyStudioMockContext } from '../../testing/myStudioMocks';
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
    removeStudioCollaborator: jest.fn(),
  },
}));

const mockCollaborationService = collaborationService as jest.Mocked<typeof collaborationService>;

describe('MyStudio Remove Collaborator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.setItem('authToken', 'test-token');
    mockCollaborationService.getStudioCollaborators.mockResolvedValue([
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
    ] as any);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('renders team section with collaborator list', async () => {
    render(
      <BrowserRouter>
        <MyStudio />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('My team')).toBeInTheDocument();
    });
  });

  it('labels the owner extra role as Me and still shows other usernames', async () => {
    render(
      <BrowserRouter>
        <MyStudio />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('@collaborator1')).toBeInTheDocument();
    });

    const meLabels = screen.getAllByText('Me');
    expect(meLabels.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByTitle('Remove this sound engineer role')).toBeInTheDocument();
    expect(screen.getByTitle('Remove collaborator1 from studio')).toBeInTheDocument();
  });

  it('links team usernames to public studio pages', async () => {
    render(
      <BrowserRouter>
        <MyStudio />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('link', { name: '@collaborator1' })).toHaveAttribute(
        'href',
        '/immersivecomics/studio/42/',
      );
    });

    const meLinks = screen.getAllByRole('link', { name: 'Me' });
    expect(meLinks.length).toBeGreaterThanOrEqual(2);
    meLinks.forEach((link) => {
      expect(link).toHaveAttribute('href', '/immersivecomics/studio/1/');
    });
  });
});
