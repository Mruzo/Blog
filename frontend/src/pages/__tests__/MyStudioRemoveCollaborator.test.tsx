import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import MyStudio from '../MyStudio';
import { ApiProvider } from '../../contexts/ApiContext';
import { collaborationService } from '../../services/collaborationService';
import { apiService } from '../../services/api';

// Mock the services
jest.mock('../../services/collaborationService');
jest.mock('../../services/api');

// Mock window.confirm
const mockConfirm = jest.fn();
window.confirm = mockConfirm;

const mockCollaborationService = collaborationService as jest.Mocked<typeof collaborationService>;
const mockApiService = apiService as jest.Mocked<typeof apiService>;

// Mock user data
const mockUser = {
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  is_active: true,
  is_email_verified: false
};

const mockStudio = {
  id: 1,
  name: 'Test Studio',
  description: 'A test studio',
  is_public: false,
  owner: {
    id: 1,
    username: 'testuser',
    first_name: 'Test',
    last_name: 'User'
  },
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
};

const mockCollaborators = [
  {
    id: 1,
    user: {
      id: 2,
      username: 'collaborator1',
      first_name: 'Collaborator',
      last_name: 'One'
    },
    role: 'writer',
    is_active: true,
    joined_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 2,
    user: {
      id: 3,
      username: 'collaborator2',
      first_name: 'Collaborator',
      last_name: 'Two'
    },
    role: '3d_artist',
    is_active: true,
    joined_at: '2024-01-01T00:00:00Z'
  }
];

const renderMyStudio = () => {
  return render(
    <BrowserRouter>
      <ApiProvider>
        <MyStudio />
      </ApiProvider>
    </BrowserRouter>
  );
};

describe('MyStudio Remove Collaborator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConfirm.mockReturnValue(true); // Default to confirming
    localStorage.setItem('authToken', 'test-token');
    
    mockApiService.getCurrentUser = jest.fn().mockResolvedValue(mockUser);
    mockApiService.getMyStudio = jest.fn().mockResolvedValue(mockStudio);
    mockApiService.getStories = jest.fn().mockResolvedValue([]);
    mockCollaborationService.getStudioCollaborators = jest.fn().mockResolvedValue({ results: mockCollaborators });
    mockCollaborationService.removeStudioCollaborator = jest.fn().mockResolvedValue(undefined);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should display remove button for each collaborator when user is owner', async () => {
    renderMyStudio();
    
    await waitFor(() => {
      expect(screen.getByText('Collaborator One')).toBeInTheDocument();
    });

    // Check that remove buttons are present (using title attribute)
    const removeButtons = screen.getAllByTitle(/Remove .* from studio/);
    expect(removeButtons.length).toBeGreaterThan(0);
  });

  it('should show confirmation dialog before removing collaborator', async () => {
    renderMyStudio();
    
    await waitFor(() => {
      expect(screen.getByText('Collaborator One')).toBeInTheDocument();
    });

    const removeButton = screen.getByTitle('Remove Collaborator One from studio');
    fireEvent.click(removeButton);

    expect(mockConfirm).toHaveBeenCalledWith(
      'Are you sure you want to remove Collaborator One from your studio team?'
    );
  });

  it('should remove collaborator when confirmed', async () => {
    renderMyStudio();
    
    await waitFor(() => {
      expect(screen.getByText('Collaborator One')).toBeInTheDocument();
    });

    const removeButton = screen.getByTitle('Remove Collaborator One from studio');
    fireEvent.click(removeButton);

    await waitFor(() => {
      expect(mockCollaborationService.removeStudioCollaborator).toHaveBeenCalledWith(
        mockStudio.id,
        mockCollaborators[0].id
      );
    });
  });

  it('should not remove collaborator when cancelled', async () => {
    mockConfirm.mockReturnValue(false);
    
    renderMyStudio();
    
    await waitFor(() => {
      expect(screen.getByText('Collaborator One')).toBeInTheDocument();
    });

    const removeButton = screen.getByTitle('Remove Collaborator One from studio');
    fireEvent.click(removeButton);

    await waitFor(() => {
      expect(mockConfirm).toHaveBeenCalled();
    });

    expect(mockCollaborationService.removeStudioCollaborator).not.toHaveBeenCalled();
  });

  it('should refresh collaborators list after successful removal', async () => {
    renderMyStudio();
    
    await waitFor(() => {
      expect(screen.getByText('Collaborator One')).toBeInTheDocument();
    });

    const removeButton = screen.getByTitle('Remove Collaborator One from studio');
    fireEvent.click(removeButton);

    await waitFor(() => {
      expect(mockCollaborationService.removeStudioCollaborator).toHaveBeenCalled();
    });

    // Should reload collaborators
    await waitFor(() => {
      expect(mockCollaborationService.getStudioCollaborators).toHaveBeenCalledTimes(2);
    });
  });

  it('should show success message after successful removal', async () => {
    renderMyStudio();
    
    await waitFor(() => {
      expect(screen.getByText('Collaborator One')).toBeInTheDocument();
    });

    const removeButton = screen.getByTitle('Remove Collaborator One from studio');
    fireEvent.click(removeButton);

    await waitFor(() => {
      expect(screen.getByText(/has been removed from your studio team/i)).toBeInTheDocument();
    });
  });

  it('should show error message when removal fails', async () => {
    const errorMessage = 'Failed to remove collaborator';
    mockCollaborationService.removeStudioCollaborator.mockRejectedValue({
      response: { data: { detail: errorMessage } }
    });
    
    renderMyStudio();
    
    await waitFor(() => {
      expect(screen.getByText('Collaborator One')).toBeInTheDocument();
    });

    const removeButton = screen.getByTitle('Remove Collaborator One from studio');
    fireEvent.click(removeButton);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('should not show remove button for the owner', async () => {
    // Create a collaborator list where one is the owner
    const ownerCollaborators = [
      {
        id: 1,
        user: {
          id: 1, // Same as owner
          username: 'testuser',
          first_name: 'Test',
          last_name: 'User'
        },
        role: 'writer',
        is_active: true,
        joined_at: '2024-01-01T00:00:00Z'
      }
    ];
    
    mockCollaborationService.getStudioCollaborators = jest.fn().mockResolvedValue({ 
      results: ownerCollaborators 
    });
    
    renderMyStudio();
    
    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument();
    });

    // Should not have remove button for owner
    const removeButtons = screen.queryAllByTitle(/Remove .* from studio/);
    expect(removeButtons.length).toBe(0);
  });

  it('should handle removal error gracefully', async () => {
    mockCollaborationService.removeStudioCollaborator.mockRejectedValue(
      new Error('Network error')
    );
    
    renderMyStudio();
    
    await waitFor(() => {
      expect(screen.getByText('Collaborator One')).toBeInTheDocument();
    });

    const removeButton = screen.getByTitle('Remove Collaborator One from studio');
    fireEvent.click(removeButton);

    await waitFor(() => {
      expect(screen.getByText(/Failed to remove collaborator/i)).toBeInTheDocument();
    });
  });
});




