import { api } from './api';

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  avatar?: string;
}

export interface CollaborationInvite {
  id: number;
  inviter: User;
  invitee_email: string;
  invitee_user?: User;
  story: {
    id: number;
    title: string;
  };
  role: 'editor' | 'viewer' | 'admin';
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  created_at: string;
  expires_at: string;
  message?: string;
}

export interface InviteUserRequest {
  email: string;
  role: 'editor' | 'viewer' | 'admin';
  message?: string;
}

export interface InviteExistingUserRequest {
  user_id: number;
  role: 'editor' | 'viewer' | 'admin';
  message?: string;
}

class CollaborationService {
  // Search for existing users
  async searchUsers(query: string): Promise<User[]> {
    try {
      const response = await api.get(`/users/search/?q=${encodeURIComponent(query)}`);
      return response.data.results || response.data;
    } catch (error) {
      console.error('Error searching users:', error);
      throw error;
    }
  }

  // Get user by ID
  async getUserById(userId: number): Promise<User> {
    try {
      const response = await api.get(`/users/${userId}/`);
      return response.data;
    } catch (error) {
      console.error('Error fetching user:', error);
      throw error;
    }
  }

  // Send invitation to existing user
  async inviteExistingUser(storyId: number, inviteData: InviteExistingUserRequest): Promise<CollaborationInvite> {
    try {
      const response = await api.post(`/stories/${storyId}/collaborators/invite-user/`, inviteData);
      return response.data;
    } catch (error) {
      console.error('Error inviting existing user:', error);
      throw error;
    }
  }

  // Send email invitation to external user
  async inviteByEmail(storyId: number, inviteData: InviteUserRequest): Promise<CollaborationInvite> {
    try {
      const response = await api.post(`/stories/${storyId}/collaborators/invite-email/`, inviteData);
      return response.data;
    } catch (error) {
      console.error('Error sending email invitation:', error);
      throw error;
    }
  }

  // Get all collaborators for a story
  async getCollaborators(storyId: number): Promise<CollaborationInvite[]> {
    try {
      const response = await api.get(`/stories/${storyId}/collaborators/`);
      return response.data.results || response.data;
    } catch (error) {
      console.error('Error fetching collaborators:', error);
      throw error;
    }
  }

  // Update collaborator role
  async updateCollaboratorRole(storyId: number, inviteId: number, role: 'editor' | 'viewer' | 'admin'): Promise<CollaborationInvite> {
    try {
      const response = await api.patch(`/stories/${storyId}/collaborators/${inviteId}/`, { role });
      return response.data;
    } catch (error) {
      console.error('Error updating collaborator role:', error);
      throw error;
    }
  }

  // Remove collaborator
  async removeCollaborator(storyId: number, inviteId: number): Promise<void> {
    try {
      await api.delete(`/stories/${storyId}/collaborators/${inviteId}/`);
    } catch (error) {
      console.error('Error removing collaborator:', error);
      throw error;
    }
  }

  // Accept invitation (for invitees)
  async acceptInvitation(inviteId: number): Promise<CollaborationInvite> {
    try {
      const response = await api.post(`/collaborators/${inviteId}/accept/`);
      return response.data;
    } catch (error) {
      console.error('Error accepting invitation:', error);
      throw error;
    }
  }

  // Decline invitation (for invitees)
  async declineInvitation(inviteId: number): Promise<CollaborationInvite> {
    try {
      const response = await api.post(`/collaborators/${inviteId}/decline/`);
      return response.data;
    } catch (error) {
      console.error('Error declining invitation:', error);
      throw error;
    }
  }

  // Get pending invitations for current user
  async getPendingInvitations(): Promise<CollaborationInvite[]> {
    try {
      const response = await api.get('/collaborators/pending/');
      return response.data.results || response.data;
    } catch (error) {
      console.error('Error fetching pending invitations:', error);
      throw error;
    }
  }
}

export const collaborationService = new CollaborationService();
