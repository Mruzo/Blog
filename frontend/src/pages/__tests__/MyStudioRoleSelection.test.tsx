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

const mockCollaborators = [
  {
    id: 1,
    user: {
      id: 2,
      username: 'collaborator',
      first_name: 'Collaborator',
      last_name: 'User'
    },
    role: 'writer',
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

describe('MyStudio Role Selection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.setItem('authToken', 'test-token');
    
    mockApiService.getCurrentUser = jest.fn().mockResolvedValue(mockUser);
    mockApiService.getMyStudio = jest.fn().mockResolvedValue(mockStudio);
    mockApiService.getStories = jest.fn().mockResolvedValue([]);
    mockCollaborationService.searchUsers = jest.fn().mockResolvedValue(mockSearchResults);
    mockCollaborationService.getStudioCollaborators = jest.fn().mockResolvedValue({ results: mockCollaborators });
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

  it('should allow selecting role when inviting user', async () => {
    renderMyStudio();
    
    await waitFor(() => {
      expect(screen.getByTitle('Invite collaborator')).toBeInTheDocument();
    });

    const inviteButton = screen.getByTitle('Invite collaborator');
    fireEvent.click(inviteButton);

    await waitFor(() => {
      expect(screen.getByText('Invite Collaborator')).toBeInTheDocument();
    });

    // Check that role selector is present
    const roleSelect = screen.getByLabelText('Select Role');
    expect(roleSelect).toBeInTheDocument();
    expect(roleSelect).toHaveValue('writer');
  });

  it('should send selected role when inviting user', async () => {
    renderMyStudio();
    
    await waitFor(() => {
      expect(screen.getByTitle('Invite collaborator')).toBeInTheDocument();
    });

    const inviteButton = screen.getByTitle('Invite collaborator');
    fireEvent.click(inviteButton);

    await waitFor(() => {
      expect(screen.getByLabelText('Select Role')).toBeInTheDocument();
    });

    // Change role to 3d_artist
    const roleSelect = screen.getByLabelText('Select Role');
    fireEvent.change(roleSelect, { target: { value: '3d_artist' } });
    expect(roleSelect).toHaveValue('3d_artist');

    // Search for user
    const searchInput = screen.getByPlaceholderText(/Search by username/i);
    fireEvent.change(searchInput, { target: { value: 'other' } });

    await waitFor(() => {
      expect(mockCollaborationService.searchUsers).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByText('Other User')).toBeInTheDocument();
    });

    // Click invite button
    const userInviteButton = screen.getByText('Invite');
    fireEvent.click(userInviteButton);

    await waitFor(() => {
      expect(mockCollaborationService.inviteStudioUser).toHaveBeenCalledWith(
        mockStudio.id,
        {
          user_id: mockSearchResults[0].id,
          role: '3d_artist'
        }
      );
    });
  });

  it('should send selected role when inviting by email', async () => {
    renderMyStudio();
    
    await waitFor(() => {
      expect(screen.getByTitle('Invite collaborator')).toBeInTheDocument();
    });

    const inviteButton = screen.getByTitle('Invite collaborator');
    fireEvent.click(inviteButton);

    await waitFor(() => {
      expect(screen.getByLabelText('Select Role')).toBeInTheDocument();
    });

    // Change role to voice_actor
    const roleSelect = screen.getByLabelText('Select Role');
    fireEvent.change(roleSelect, { target: { value: 'voice_actor' } });

    // Enter email
    const searchInput = screen.getByPlaceholderText(/Search by username/i);
    fireEvent.change(searchInput, { target: { value: 'newuser@example.com' } });

    // Wait for "Invite by email instead" button
    await waitFor(() => {
      const emailButton = screen.getByText('Invite by email instead');
      fireEvent.click(emailButton);
    });

    await waitFor(() => {
      expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
    });

    // Check that role selector is also in email form
    const emailRoleSelect = screen.getByLabelText('Role');
    expect(emailRoleSelect).toBeInTheDocument();
    expect(emailRoleSelect).toHaveValue('voice_actor');

    // Send email invitation
    const emailInput = screen.getByPlaceholderText('user@example.com');
    fireEvent.change(emailInput, { target: { value: 'newuser@example.com' } });

    const sendButton = screen.getByText('Send Email Invitation');
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(mockCollaborationService.inviteStudioByEmail).toHaveBeenCalledWith(
        mockStudio.id,
        {
          email: 'newuser@example.com',
          role: 'voice_actor'
        }
      );
    });
  });

  it('should have all role options available', async () => {
    renderMyStudio();
    
    await waitFor(() => {
      expect(screen.getByTitle('Invite collaborator')).toBeInTheDocument();
    });

    const inviteButton = screen.getByTitle('Invite collaborator');
    fireEvent.click(inviteButton);

    await waitFor(() => {
      expect(screen.getByLabelText('Select Role')).toBeInTheDocument();
    });

    const roleSelect = screen.getByLabelText('Select Role') as HTMLSelectElement;
    const options = Array.from(roleSelect.options).map(opt => opt.value);
    
    expect(options).toContain('writer');
    expect(options).toContain('3d_artist');
    expect(options).toContain('voice_actor');
    expect(options).toContain('sound_engineer');
    expect(options).toContain('cinematographer');
  });
});







