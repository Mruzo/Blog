import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ApiProvider } from '../contexts/ApiContext';
import MyStudio from '../pages/MyStudio';

// Mock the API service to return specific data
jest.mock('../services/api', () => ({
  apiService: {
    getStories: jest.fn().mockResolvedValue([
      {
        id: 1,
        title: 'Published Story',
        description: 'A published story',
        is_public: true,
        moderation_status: 'approved',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        user: 1
      },
      {
        id: 2,
        title: 'Draft Story',
        description: 'A draft story',
        is_public: false,
        moderation_status: 'approved',
        created_at: '2024-01-02T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
        user: 1
      }
    ]),
    getMyStudio: jest.fn().mockResolvedValue({
      id: 1,
      name: 'Test Studio',
      description: 'A test studio',
      owner: { id: 1, username: 'testuser' },
      collaborators: [],
      stories_count: 2,
      collaborators_count: 1,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      is_public: true
    })
  }
}));

// Helper to render with context
const renderWithContext = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <ApiProvider>
        {component}
      </ApiProvider>
    </BrowserRouter>
  );
};

describe('MyStudio Debug Test', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should display both published and draft stories', async () => {
    renderWithContext(<MyStudio />);

    // Wait for the component to render
    await waitFor(() => {
      expect(screen.getByText('My Studio')).toBeInTheDocument();
    });

    // Check that both stories are displayed
    expect(screen.getByText('Published Story')).toBeInTheDocument();
    expect(screen.getByText('Draft Story')).toBeInTheDocument();
  });

  it('should show correct story count', async () => {
    renderWithContext(<MyStudio />);

    // Wait for the component to render
    await waitFor(() => {
      expect(screen.getByText('My Studio')).toBeInTheDocument();
    });

    // Check that the story count is correct
    expect(screen.getByText('2')).toBeInTheDocument(); // Stories count
  });
});


