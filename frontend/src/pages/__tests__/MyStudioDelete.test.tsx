import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import MyStudio from '../MyStudio';
import { ApiProvider } from '../../contexts/ApiContext';

// Mock the API service
jest.mock('../../services/api', () => ({
  apiService: {
    getStories: jest.fn(),
    getMyStudio: jest.fn(),
    deleteStory: jest.fn(),
  },
}));

const mockStories = [
  {
    id: 1,
    title: 'Test Story 1',
    description: 'A test story',
    is_public: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    user: 1,
    moderation_status: 'approved',
  },
  {
    id: 2,
    title: 'Test Story 2',
    description: 'Another test story',
    is_public: true,
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
    user: 1,
    moderation_status: 'approved',
  },
];

const mockStudio = {
  id: 1,
  name: "Test Studio",
  description: "A test studio",
  is_public: false,
  owner: 1,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <ApiProvider>
        {component}
      </ApiProvider>
    </BrowserRouter>
  );
};

describe('MyStudio Delete Functionality', () => {
  beforeEach(() => {
    // Mock window.confirm
    window.confirm = jest.fn(() => true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should show delete button in top right corner of story card', async () => {
    // Mock the API responses
    const { apiService } = require('../../services/api');
    apiService.getStories.mockResolvedValue(mockStories);
    apiService.getMyStudio.mockResolvedValue(mockStudio);

    renderWithProviders(<MyStudio />);

    // Wait for stories to load
    await waitFor(() => {
      expect(screen.getByText('Test Story 1')).toBeInTheDocument();
    });

    // Check if delete button is present (trash icon)
    const deleteButtons = screen.getAllByRole('button', { name: /delete story/i });
    expect(deleteButtons).toHaveLength(2); // One for each story
  });

  it('should show confirmation dialog when delete is clicked', async () => {
    const { apiService } = require('../../services/api');
    apiService.getStories.mockResolvedValue(mockStories);
    apiService.getMyStudio.mockResolvedValue(mockStudio);

    renderWithProviders(<MyStudio />);

    await waitFor(() => {
      expect(screen.getByText('Test Story 1')).toBeInTheDocument();
    });

    // Click delete button directly
    const deleteButtons = screen.getAllByRole('button', { name: /delete story/i });
    fireEvent.click(deleteButtons[0]);

    // Check if confirmation dialog was shown
    expect(window.confirm).toHaveBeenCalledWith(
      'Are you sure you want to delete "Test Story 1"? This action cannot be undone.'
    );
  });

  it('should call deleteStory API when confirmed', async () => {
    const { apiService } = require('../../services/api');
    apiService.getStories.mockResolvedValue(mockStories);
    apiService.getMyStudio.mockResolvedValue(mockStudio);
    apiService.deleteStory.mockResolvedValue(undefined);

    renderWithProviders(<MyStudio />);

    await waitFor(() => {
      expect(screen.getByText('Test Story 1')).toBeInTheDocument();
    });

    // Click delete button directly
    const deleteButtons = screen.getAllByRole('button', { name: /delete story/i });
    fireEvent.click(deleteButtons[0]);

    // Check if API was called
    await waitFor(() => {
      expect(apiService.deleteStory).toHaveBeenCalledWith(1);
    });
  });

  it('should show success message after successful deletion', async () => {
    const { apiService } = require('../../services/api');
    apiService.getStories.mockResolvedValue(mockStories);
    apiService.getMyStudio.mockResolvedValue(mockStudio);
    apiService.deleteStory.mockResolvedValue(undefined);

    renderWithProviders(<MyStudio />);

    await waitFor(() => {
      expect(screen.getByText('Test Story 1')).toBeInTheDocument();
    });

    // Click delete button directly
    const deleteButtons = screen.getAllByRole('button', { name: /delete story/i });
    fireEvent.click(deleteButtons[0]);

    // Check for success message
    await waitFor(() => {
      expect(screen.getByText('Story "Test Story 1" has been deleted successfully.')).toBeInTheDocument();
    });
  });

  it('should not call deleteStory API when cancelled', async () => {
    // Mock window.confirm to return false (cancelled)
    window.confirm = jest.fn(() => false);

    const { apiService } = require('../../services/api');
    apiService.getStories.mockResolvedValue(mockStories);
    apiService.getMyStudio.mockResolvedValue(mockStudio);

    renderWithProviders(<MyStudio />);

    await waitFor(() => {
      expect(screen.getByText('Test Story 1')).toBeInTheDocument();
    });

    // Click delete button directly
    const deleteButtons = screen.getAllByRole('button', { name: /delete story/i });
    fireEvent.click(deleteButtons[0]);

    // Check that API was not called
    expect(apiService.deleteStory).not.toHaveBeenCalled();
  });

  it('should show error message when deletion fails', async () => {
    const { apiService } = require('../../services/api');
    apiService.getStories.mockResolvedValue(mockStories);
    apiService.getMyStudio.mockResolvedValue(mockStudio);
    apiService.deleteStory.mockRejectedValue(new Error('Delete failed'));

    renderWithProviders(<MyStudio />);

    await waitFor(() => {
      expect(screen.getByText('Test Story 1')).toBeInTheDocument();
    });

    // Click delete button directly
    const deleteButtons = screen.getAllByRole('button', { name: /delete story/i });
    fireEvent.click(deleteButtons[0]);

    // Check for error message
    await waitFor(() => {
      expect(screen.getByText('Failed to delete story. Please try again.')).toBeInTheDocument();
    });
  });
});
