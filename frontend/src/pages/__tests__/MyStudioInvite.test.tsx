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

const mockSearchResults = [
  {
    id: 2,
    username: 'otheruser',
    email: 'other@example.com',
    first_name: 'Other',
    last_name: 'User'
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

describe('MyStudio Invite Functionality', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup default mocks
    localStorage.setItem('authToken', 'test-token');
    
    mockApiService.getCurrentUser = jest.fn().mockResolvedValue(mockUser);
    mockApiService.getMyStudio = jest.fn().mockResolvedValue(mockStudio);
    mockApiService.getStories = jest.fn().mockResolvedValue([]);
    mockCollaborationService.searchUsers = jest.fn().mockResolvedValue(mockSearchResults);
    mockCollaborationService.inviteStudioUser = jest.fn().mockResolvedValue({
      id: 1,
      studio: mockStudio,
      user: mockSearchResults[0],
      role: 'writer',
      joined_at: '2024-01-01T00:00:00Z',
      is_active: true
    });
    mockCollaborationService.inviteStudioByEmail = jest.fn().mockResolvedValue({
      id: 1,
      studio: mockStudio,
      user: null,
      role: 'writer',
      joined_at: '2024-01-01T00:00:00Z',
      is_active: true
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should display the invite button in the Team card header', async () => {
    renderMyStudio();
    
    await waitFor(() => {
      expect(screen.getByTitle('Invite collaborator')).toBeInTheDocument();
    });
  });

  it('should open the UserSearchModal when the + button is clicked', async () => {
    renderMyStudio();
    
    await waitFor(() => {
      expect(screen.getByTitle('Invite collaborator')).toBeInTheDocument();
    });

    const inviteButton = screen.getByTitle('Invite collaborator');
    fireEvent.click(inviteButton);

    await waitFor(() => {
      expect(screen.getByText('Invite Collaborator')).toBeInTheDocument();
    });
  });

  it('should search for users when typing in the search input', async () => {
    renderMyStudio();
    
    await waitFor(() => {
      expect(screen.getByTitle('Invite collaborator')).toBeInTheDocument();
    });

    const inviteButton = screen.getByTitle('Invite collaborator');
    fireEvent.click(inviteButton);

    await waitFor(() => {
      expect(screen.getByText('Invite Collaborator')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search by username, name, or email/i);
    fireEvent.change(searchInput, { target: { value: 'other' } });

    await waitFor(() => {
      expect(mockCollaborationService.searchUsers).toHaveBeenCalledWith('other');
    }, { timeout: 1000 });
  });

  it('should invite a user when selecting from search results', async () => {
    renderMyStudio();
    
    await waitFor(() => {
      expect(screen.getByTitle('Invite collaborator')).toBeInTheDocument();
    });

    const inviteButton = screen.getByTitle('Invite collaborator');
    fireEvent.click(inviteButton);

    await waitFor(() => {
      expect(screen.getByText('Invite Collaborator')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search by username, name, or email/i);
    fireEvent.change(searchInput, { target: { value: 'other' } });

    await waitFor(() => {
      expect(screen.getByText('Other User')).toBeInTheDocument();
    });

    const inviteUserButton = screen.getByText('Invite');
    fireEvent.click(inviteUserButton);

    await waitFor(() => {
      expect(mockCollaborationService.inviteStudioUser).toHaveBeenCalledWith(
        mockStudio.id,
        {
          user_id: mockSearchResults[0].id,
          role: 'writer'
        }
      );
    });
  });

  it('should invite by email when entering an email address', async () => {
    renderMyStudio();
    
    await waitFor(() => {
      expect(screen.getByTitle('Invite collaborator')).toBeInTheDocument();
    });

    const inviteButton = screen.getByTitle('Invite collaborator');
    fireEvent.click(inviteButton);

    await waitFor(() => {
      expect(screen.getByText('Invite Collaborator')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search by username, name, or email/i);
    fireEvent.change(searchInput, { target: { value: 'newuser@example.com' } });

    // Wait for search to complete (should return no results)
    await waitFor(() => {
      // Check if "Invite by email instead" button appears or email form is shown
      const emailInviteButton = screen.queryByText(/Invite by email/i);
      if (emailInviteButton) {
        fireEvent.click(emailInviteButton);
      }
    }, { timeout: 2000 });

    // Try to find and click the email invite button or fill email form
    await waitFor(() => {
      const emailInput = screen.queryByPlaceholderText(/user@example.com/i);
      if (emailInput) {
        fireEvent.change(emailInput, { target: { value: 'newuser@example.com' } });
        const sendButton = screen.getByText(/Send Email Invitation/i);
        fireEvent.click(sendButton);
      }
    }, { timeout: 2000 });

    await waitFor(() => {
      expect(mockCollaborationService.inviteStudioByEmail).toHaveBeenCalledWith(
        mockStudio.id,
        {
          email: 'newuser@example.com',
          role: 'writer'
        }
      );
    }, { timeout: 3000 });
  });

  it('should display success message after successful invite', async () => {
    renderMyStudio();
    
    await waitFor(() => {
      expect(screen.getByTitle('Invite collaborator')).toBeInTheDocument();
    });

    const inviteButton = screen.getByTitle('Invite collaborator');
    fireEvent.click(inviteButton);

    await waitFor(() => {
      expect(screen.getByText('Invite Collaborator')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search by username, name, or email/i);
    fireEvent.change(searchInput, { target: { value: 'other' } });

    await waitFor(() => {
      expect(screen.getByText('Other User')).toBeInTheDocument();
    });

    const inviteUserButton = screen.getByText('Invite');
    fireEvent.click(inviteUserButton);

    await waitFor(() => {
      expect(screen.getByText(/Successfully invited/i)).toBeInTheDocument();
    });
  });

  it('should display error message when invite fails', async () => {
    mockCollaborationService.inviteStudioUser = jest.fn().mockRejectedValue({
      response: {
        data: {
          detail: 'User is already a collaborator'
        }
      }
    });

    renderMyStudio();
    
    await waitFor(() => {
      expect(screen.getByTitle('Invite collaborator')).toBeInTheDocument();
    });

    const inviteButton = screen.getByTitle('Invite collaborator');
    fireEvent.click(inviteButton);

    await waitFor(() => {
      expect(screen.getByText('Invite Collaborator')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search by username, name, or email/i);
    fireEvent.change(searchInput, { target: { value: 'other' } });

    await waitFor(() => {
      expect(screen.getByText('Other User')).toBeInTheDocument();
    });

    const inviteUserButton = screen.getByText('Invite');
    fireEvent.click(inviteUserButton);

    await waitFor(() => {
      expect(screen.getByText('User is already a collaborator')).toBeInTheDocument();
    });
  });
});



