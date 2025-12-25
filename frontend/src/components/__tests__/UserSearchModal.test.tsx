import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import UserSearchModal from '../UserSearchModal';
import { collaborationService } from '../../services/collaborationService';

jest.mock('../../services/collaborationService');

const mockCollaborationService = collaborationService as jest.Mocked<typeof collaborationService>;

const mockUsers = [
  {
    id: 1,
    username: 'user1',
    email: 'user1@example.com',
    first_name: 'User',
    last_name: 'One'
  },
  {
    id: 2,
    username: 'user2',
    email: 'user2@example.com',
    first_name: 'User',
    last_name: 'Two'
  }
];

describe('UserSearchModal Role Selection', () => {
  const mockOnSelectUser = jest.fn();
  const mockOnInviteByEmail = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockCollaborationService.searchUsers = jest.fn().mockResolvedValue(mockUsers);
  });

  it('should display role selector', () => {
    render(
      <UserSearchModal
        isOpen={true}
        onClose={mockOnClose}
        onSelectUser={mockOnSelectUser}
        onInviteByEmail={mockOnInviteByEmail}
      />
    );

    expect(screen.getByLabelText('Select Role')).toBeInTheDocument();
  });

  it('should default to writer role', () => {
    render(
      <UserSearchModal
        isOpen={true}
        onClose={mockOnClose}
        onSelectUser={mockOnSelectUser}
        onInviteByEmail={mockOnInviteByEmail}
      />
    );

    const roleSelect = screen.getByLabelText('Select Role') as HTMLSelectElement;
    expect(roleSelect.value).toBe('writer');
  });

  it('should allow changing role', () => {
    render(
      <UserSearchModal
        isOpen={true}
        onClose={mockOnClose}
        onSelectUser={mockOnSelectUser}
        onInviteByEmail={mockOnInviteByEmail}
      />
    );

    const roleSelect = screen.getByLabelText('Select Role') as HTMLSelectElement;
    fireEvent.change(roleSelect, { target: { value: '3d_artist' } });
    expect(roleSelect.value).toBe('3d_artist');
  });

  it('should pass selected role when selecting user', async () => {
    render(
      <UserSearchModal
        isOpen={true}
        onClose={mockOnClose}
        onSelectUser={mockOnSelectUser}
        onInviteByEmail={mockOnInviteByEmail}
      />
    );

    // Change role
    const roleSelect = screen.getByLabelText('Select Role');
    fireEvent.change(roleSelect, { target: { value: 'voice_actor' } });

    // Search for user
    const searchInput = screen.getByPlaceholderText(/Search by username/i);
    fireEvent.change(searchInput, { target: { value: 'user' } });

    await waitFor(() => {
      expect(mockCollaborationService.searchUsers).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByText('User One')).toBeInTheDocument();
    });

    // Click invite
    const inviteButton = screen.getByText('Invite');
    fireEvent.click(inviteButton);

    expect(mockOnSelectUser).toHaveBeenCalledWith(mockUsers[0], 'voice_actor');
  });

  it('should pass selected role when inviting by email', async () => {
    render(
      <UserSearchModal
        isOpen={true}
        onClose={mockOnClose}
        onSelectUser={mockOnSelectUser}
        onInviteByEmail={mockOnInviteByEmail}
      />
    );

    // Change role
    const roleSelect = screen.getByLabelText('Select Role');
    fireEvent.change(roleSelect, { target: { value: 'sound_engineer' } });

    // Enter email
    const searchInput = screen.getByPlaceholderText(/Search by username/i);
    fireEvent.change(searchInput, { target: { value: 'new@example.com' } });

    // Wait for "Invite by email instead" button
    await waitFor(() => {
      const emailButton = screen.getByText('Invite by email instead');
      fireEvent.click(emailButton);
    });

    await waitFor(() => {
      expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
    });

    // Check role is preserved in email form
    const emailRoleSelect = screen.getByLabelText('Role') as HTMLSelectElement;
    expect(emailRoleSelect.value).toBe('sound_engineer');

    // Enter email and send
    const emailInput = screen.getByPlaceholderText('user@example.com');
    fireEvent.change(emailInput, { target: { value: 'new@example.com' } });

    const sendButton = screen.getByText('Send Email Invitation');
    fireEvent.click(sendButton);

    expect(mockOnInviteByEmail).toHaveBeenCalledWith('new@example.com', 'sound_engineer');
  });

  it('should have all role options', () => {
    render(
      <UserSearchModal
        isOpen={true}
        onClose={mockOnClose}
        onSelectUser={mockOnSelectUser}
        onInviteByEmail={mockOnInviteByEmail}
      />
    );

    const roleSelect = screen.getByLabelText('Select Role') as HTMLSelectElement;
    const options = Array.from(roleSelect.options).map(opt => opt.value);
    
    expect(options).toContain('writer');
    expect(options).toContain('3d_artist');
    expect(options).toContain('voice_actor');
    expect(options).toContain('sound_engineer');
    expect(options).toContain('cinematographer');
  });

  it('should maintain role selection when switching between search and email', async () => {
    render(
      <UserSearchModal
        isOpen={true}
        onClose={mockOnClose}
        onSelectUser={mockOnSelectUser}
        onInviteByEmail={mockOnInviteByEmail}
      />
    );

    // Change role
    const roleSelect = screen.getByLabelText('Select Role');
    fireEvent.change(roleSelect, { target: { value: 'cinematographer' } });

    // Switch to email form
    const searchInput = screen.getByPlaceholderText(/Search by username/i);
    fireEvent.change(searchInput, { target: { value: 'test' } });

    await waitFor(() => {
      const emailButton = screen.getByText('Invite by email instead');
      fireEvent.click(emailButton);
    });

    await waitFor(() => {
      const emailRoleSelect = screen.getByLabelText('Role') as HTMLSelectElement;
      expect(emailRoleSelect.value).toBe('cinematographer');
    });

    // Switch back
    const backButton = screen.getByText('Back to Search');
    fireEvent.click(backButton);

    await waitFor(() => {
      const mainRoleSelect = screen.getByLabelText('Select Role') as HTMLSelectElement;
      expect(mainRoleSelect.value).toBe('cinematographer');
    });
  });
});







