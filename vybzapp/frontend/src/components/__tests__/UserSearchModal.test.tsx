import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import UserSearchModal from '../UserSearchModal';
import { collaborationService } from '../../services/collaborationService';

jest.mock('../../services/collaborationService');

const mockCollaborationService = collaborationService as jest.Mocked<typeof collaborationService>;

const mockUsers = [
  { id: 1, username: 'user1', email: 'user1@example.com', first_name: 'User', last_name: 'One' },
  { id: 2, username: 'user2', email: 'user2@example.com', first_name: 'User', last_name: 'Two' },
];

const ROLE_VALUES = [
  'writer',
  'screenwriter',
  'director',
  '3d_artist',
  'voice_actor',
  'sound_engineer',
  'cinematographer',
];

describe('UserSearchModal', () => {
  const onSelectUser = jest.fn();
  const onInviteByEmail = jest.fn();
  const onClose = jest.fn();

  const openModal = () =>
    render(
      <UserSearchModal
        isOpen
        onClose={onClose}
        onSelectUser={onSelectUser}
        onInviteByEmail={onInviteByEmail}
      />,
    );

  beforeEach(() => {
    jest.clearAllMocks();
    mockCollaborationService.searchUsers = jest.fn().mockResolvedValue(mockUsers);
  });

  it('lists studio roles and defaults to writer', () => {
    openModal();
    const roleSelect = screen.getByLabelText('Select Role') as HTMLSelectElement;
    expect(roleSelect.value).toBe('writer');
    expect(Array.from(roleSelect.options).map((option) => option.value)).toEqual(ROLE_VALUES);
    fireEvent.change(roleSelect, { target: { value: '3d_artist' } });
    expect(roleSelect.value).toBe('3d_artist');
  });

  it('passes the selected role when inviting a user', async () => {
    openModal();
    fireEvent.change(screen.getByLabelText('Select Role'), { target: { value: 'voice_actor' } });
    fireEvent.change(screen.getByPlaceholderText(/Search by username/i), { target: { value: 'user' } });

    expect(await screen.findByText('User One')).toBeInTheDocument();
    const inviteButton = screen.getByRole('button', { name: /Invite User One as voice_actor/i });
    expect(inviteButton).toHaveClass('stories-landing__btnPrimary');
    fireEvent.click(inviteButton);
    expect(onSelectUser).toHaveBeenCalledWith(mockUsers[0], 'voice_actor');
  });

  it('keeps the selected role for email invite', async () => {
    openModal();
    fireEvent.change(screen.getByLabelText('Select Role'), { target: { value: 'sound_engineer' } });
    fireEvent.change(screen.getByPlaceholderText(/Search by username/i), {
      target: { value: 'new@example.com' },
    });
    fireEvent.click(await screen.findByText('Invite by email instead'));

    const emailRoleSelect = (await screen.findByLabelText('Role')) as HTMLSelectElement;
    expect(emailRoleSelect.value).toBe('sound_engineer');
    fireEvent.change(screen.getByPlaceholderText('user@example.com'), {
      target: { value: 'new@example.com' },
    });
    const sendButton = screen.getByRole('button', { name: /Send Email Invitation/i });
    expect(sendButton).toHaveClass('stories-landing__btnPrimary');
    fireEvent.click(sendButton);
    expect(onInviteByEmail).toHaveBeenCalledWith('new@example.com', 'sound_engineer');
  });

  it('preserves role when switching between search and email', async () => {
    openModal();
    fireEvent.change(screen.getByLabelText('Select Role'), { target: { value: 'cinematographer' } });
    fireEvent.change(screen.getByPlaceholderText(/Search by username/i), { target: { value: 'test' } });
    fireEvent.click(await screen.findByText('Invite by email instead'));
    expect((await screen.findByLabelText('Role') as HTMLSelectElement).value).toBe('cinematographer');

    fireEvent.click(screen.getByText('Back to Search'));
    await waitFor(() => {
      expect((screen.getByLabelText('Select Role') as HTMLSelectElement).value).toBe('cinematographer');
    });
  });
});
