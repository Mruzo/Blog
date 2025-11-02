import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { CollaborationInvite, User, collaborationService } from '../services/collaborationService';
import { Story, apiService } from '../services/api';
import UserSearchModal from './UserSearchModal';
import CollaboratorInviteForm from './CollaboratorInviteForm';
import CollaboratorsList from './CollaboratorsList';
import NotificationToast from './NotificationToast';

const StoryCollaborators: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const storyId = id ? parseInt(id) : 0;

  const [collaborators, setCollaborators] = useState<CollaborationInvite[]>([]);
  const [story, setStory] = useState<Story | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
  } | null>(null);

  // Check if current user is the story owner
  const isOwner = story && currentUser ? story.user === currentUser.id : false;

  // Load collaborators
  const loadCollaborators = async () => {
    try {
      setLoading(true);
      const data = await collaborationService.getCollaborators(storyId);
      setCollaborators(data);
      setError(null);
    } catch (err) {
      setError('Failed to load collaborators');
      console.error('Error loading collaborators:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load story data to check ownership
  const loadStory = async () => {
    if (!storyId) return;
    try {
      const storyData = await apiService.getStory(storyId);
      setStory(storyData);
    } catch (err) {
      console.error('Error loading story:', err);
    }
  };

  // Load current user to check ownership
  const loadCurrentUser = async () => {
    try {
      const userData = await apiService.getCurrentUser();
      setCurrentUser(userData);
    } catch (err) {
      console.error('Error loading current user:', err);
      // If getting current user fails, try to get user ID from token
      // This is a fallback - the API should provide this
    }
  };

  useEffect(() => {
    if (storyId) {
      loadStory();
      loadCurrentUser();
      loadCollaborators();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyId]);

  // Handle user selection from search
  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
    setShowUserSearch(false);
  };

  // Handle email invitation
  const handleEmailInvite = (email: string) => {
    // For now, we'll show an alert. In a real implementation,
    // you'd want to show a form to select role and message
    alert(`Email invitation to ${email} would be sent here. This requires backend implementation.`);
    setShowUserSearch(false);
  };

  // Handle invitation submission
  const handleInvite = async (role: 'editor' | 'viewer' | 'admin', message?: string) => {
    if (!selectedUser) return;

    try {
      await collaborationService.inviteExistingUser(storyId, {
        user_id: selectedUser.id,
        role,
        message
      });
      
      // Reload collaborators
      await loadCollaborators();
      setSelectedUser(null);
      setNotification({
        message: `Invitation sent to ${selectedUser.first_name} ${selectedUser.last_name}`,
        type: 'success'
      });
    } catch (err) {
      setNotification({
        message: 'Failed to send invitation',
        type: 'error'
      });
      console.error('Error sending invitation:', err);
    }
  };

  // Handle role update
  const handleUpdateRole = async (inviteId: number, role: 'editor' | 'viewer' | 'admin') => {
    try {
      await collaborationService.updateCollaboratorRole(storyId, inviteId, role);
      await loadCollaborators();
      setNotification({
        message: 'Collaborator role updated successfully',
        type: 'success'
      });
    } catch (err) {
      setNotification({
        message: 'Failed to update role',
        type: 'error'
      });
      console.error('Error updating role:', err);
    }
  };

  // Handle collaborator removal
  const handleRemoveCollaborator = async (inviteId: number) => {
    if (!window.confirm('Are you sure you want to remove this collaborator?')) {
      return;
    }

    try {
      await collaborationService.removeCollaborator(storyId, inviteId);
      await loadCollaborators();
      setNotification({
        message: 'Collaborator removed successfully',
        type: 'success'
      });
    } catch (err) {
      setNotification({
        message: 'Failed to remove collaborator',
        type: 'error'
      });
      console.error('Error removing collaborator:', err);
    }
  };

  // Handle accepting collaborator (for story owners)
  const handleAcceptCollaborator = async (inviteId: number) => {
    try {
      await collaborationService.acceptInvitation(inviteId);
      await loadCollaborators();
      setNotification({
        message: 'Collaborator accepted successfully',
        type: 'success'
      });
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Failed to accept collaborator';
      setNotification({
        message: errorMessage,
        type: 'error'
      });
      console.error('Error accepting collaborator:', err);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-2">Loading collaborators...</p>
      </div>
    );
  }

  return (
    <div className="container-fluid p-0">
      <div className="row">
        <div className="col-12 border-left">
          <div className="d-flex justify-content-between align-items-center mb-1">
            <h3 className="subtext-btn mb-0">Collaborators</h3>
            <button
              className="btn btn-primary subtext-btn-sm"
              onClick={() => setShowUserSearch(true)}
            >
              <i className="fas fa-user-plus me-2"> &nbsp;</i>
              Invite Collaborator
            </button>
          </div>

          {error && (
            <div className="alert alert-danger" role="alert">
              <i className="fas fa-exclamation-triangle me-2"></i>
              {error}
            </div>
          )}

          {/* Invite Form */}
          {selectedUser && (
            <div className="mb-4">
              <CollaboratorInviteForm
                selectedUser={selectedUser}
                onInvite={handleInvite}
                onCancel={() => setSelectedUser(null)}
              />
            </div>
          )}

          {/* Collaborators List */}
          <div className="card">
            {/* <div className="card-header">
              <h5 className="mb-0 subtext-btn-sm">Current Collaborators</h5>
            </div> */}
            <div className="card-body p-1">
              <CollaboratorsList
                collaborators={collaborators}
                onUpdateRole={handleUpdateRole}
                onRemoveCollaborator={handleRemoveCollaborator}
                onAcceptCollaborator={handleAcceptCollaborator}
                canManage={true} // In a real app, check user permissions
                isOwner={isOwner}
              />
            </div>
          </div>
        </div>
      </div>

      {/* User Search Modal */}
      <UserSearchModal
        isOpen={showUserSearch}
        onClose={() => setShowUserSearch(false)}
        onSelectUser={handleUserSelect}
        onInviteByEmail={handleEmailInvite}
      />

      {/* Notification Toast */}
      {notification && (
        <NotificationToast
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
    </div>
  );
};

export default StoryCollaborators;
