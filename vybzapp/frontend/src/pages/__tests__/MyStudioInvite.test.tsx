import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import MyStudio from '../MyStudio';
import { createMyStudioMockContext } from '../../testing/myStudioMocks';

const mockApiContext = createMyStudioMockContext();

jest.mock('../../contexts/ApiContext', () => ({
  useApi: () => mockApiContext,
  ApiProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('../../services/api', () => ({
  apiService: {
    getSeasons: jest.fn().mockResolvedValue([]),
    getEpisodes: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock('../../services/collaborationService', () => ({
  collaborationService: {
    getStudioCollaborators: jest.fn().mockResolvedValue([]),
    searchUsers: jest.fn().mockResolvedValue([]),
    inviteStudioUser: jest.fn(),
    inviteStudioByEmail: jest.fn(),
    removeStudioCollaborator: jest.fn(),
  },
}));

describe('MyStudio Invite Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.setItem('authToken', 'test-token');
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('shows invite collaborator control in the team panel', async () => {
    render(
      <BrowserRouter>
        <MyStudio />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTitle('Invite collaborator')).toBeInTheDocument();
    });
  });
});
