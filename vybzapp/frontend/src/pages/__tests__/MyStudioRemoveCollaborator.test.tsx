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
    getStudioCollaborators: jest.fn().mockResolvedValue([
      {
        id: 1,
        user: { id: 2, username: 'collaborator1', first_name: 'Collaborator', last_name: 'One' },
        role: 'writer',
        is_active: true,
        joined_at: '2024-01-01T00:00:00Z',
      },
    ]),
    removeStudioCollaborator: jest.fn(),
  },
}));

describe('MyStudio Remove Collaborator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.setItem('authToken', 'test-token');
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
});
