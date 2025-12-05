import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { User, collaborationService } from '../services/collaborationService';
import { Story, apiService } from '../services/api';
import MessagePopup from './MessagePopup';

interface StudioCollaborator {
  id: number;
  user: User;
  role: string;
  is_story_collaborator: boolean;
}

const StoryCollaborators: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const storyId = id ? parseInt(id) : 0;

  const [studioCollaborators, setStudioCollaborators] = useState<StudioCollaborator[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<number>>(new Set());
  const [story, setStory] = useState<Story | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'success' | 'danger' | 'warning' | 'info'>('success');
  const [showMessage, setShowMessage] = useState(false);

  // Check if current user is the story owner
  const isOwner = story && currentUser ? story.user === currentUser.id : false;

  // Load studio collaborators for the story
  const loadStudioCollaborators = async () => {
    if (!storyId) return;
    try {
      setLoading(true);
      const data = await collaborationService.getStudioCollaboratorsForStory(storyId);
      setStudioCollaborators(data);
      
      // Set selected user IDs based on who is already a story collaborator
      const selected = new Set<number>();
      data.forEach((collab: StudioCollaborator) => {
        if (collab.is_story_collaborator) {
          selected.add(collab.user.id);
        }
      });
      setSelectedUserIds(selected);
      
      setError(null);
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || 'Failed to load studio collaborators';
      setError(errorMsg);
      console.error('Error loading studio collaborators:', err);
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
    }
  };

  useEffect(() => {
    if (storyId) {
      loadStory();
      loadCurrentUser();
      loadStudioCollaborators();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyId]);

  // Handle checkbox toggle
  const handleToggleCollaborator = (userId: number) => {
    const newSelected = new Set(selectedUserIds);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUserIds(newSelected);
  };

  // Handle save
  const handleSave = async () => {
    if (!storyId) return;
    
    try {
      setSaving(true);
      const userIdsArray = Array.from(selectedUserIds);
      await collaborationService.bulkAssignStoryCollaborators(storyId, userIdsArray);
      
      // Reload to get updated state
      await loadStudioCollaborators();
      
      setMessage('Collaborators updated successfully');
      setMessageType('success');
      setShowMessage(true);
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || 'Failed to update collaborators';
      setMessage(errorMsg);
      setMessageType('danger');
      setShowMessage(true);
      console.error('Error saving collaborators:', err);
    } finally {
      setSaving(false);
    }
  };

  // Get role color for badge
  const getRoleColor = (role: string): string => {
    const roleColors: { [key: string]: string } = {
      'writer': 'primary',
      '3d_artist': 'success',
      'voice_actor': 'info',
      'sound_engineer': 'warning',
      'cinematographer': 'danger',
    };
    return roleColors[role] || 'secondary';
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-2 subtext-btn-sm">Loading collaborators...</p>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="alert alert-info" role="alert">
        <i className="fas fa-info-circle me-2"></i>
        Only the story owner can manage collaborators.
      </div>
    );
  }

  return (
    <div className="container-fluid p-0">
      <div className="row">
        <div className="col-md-4">
          <div className="d-flex justify-content-between align-items-center mb-1">
            <h3 className="subtext-btn mb-0 font-gillsans">Story Collaborators</h3>
            <button
              className="btn btn-primary subtext-btn-sm"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Saving...
                </>
              ) : (
                <>
                  <i className="fas fa-save me-2"></i>
                  &nbsp;Save
                </>
              )}
            </button>
          </div>

          <MessagePopup
            message={message}
            type={messageType}
            show={showMessage}
            onClose={() => setShowMessage(false)}
            duration={3000}
          />

          {error && (
            <div className="alert alert-danger" role="alert">
              <i className="fas fa-exclamation-triangle me-2"></i>
              {error}
            </div>
          )}

          {studioCollaborators.length === 0 ? (
            <div className="alert alert-info" role="alert">
              <i className="fas fa-info-circle me-2"></i>
              No studio collaborators available. Add collaborators to your studio first.
            </div>
          ) : (
            <div className="card">
              <div className="card-header">
                <h5 className="mb-0 subtext-btn-sm font-quicksand">
                  Select Collaborators for This Story
                </h5>
                
              </div>
              <div className="card-body p-1">
                <div className="list-group">
                  {studioCollaborators.map((collab) => (
                    <div
                      key={collab.id}
                      className={`list-group-item d-flex align-items-center p-1 ${
                        selectedUserIds.has(collab.user.id) ? 'active' : ''
                      }`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleToggleCollaborator(collab.user.id)}
                    >
                      <div className="form-check me-3 d-flex align-items-center">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={selectedUserIds.has(collab.user.id)}
                          onChange={() => handleToggleCollaborator(collab.user.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <div className="flex-grow-1">
                        <div className="d-flex align-items-center">
                          <div className="me-2">
                            {collab.user.avatar ? (
                              <img
                                src={collab.user.avatar}
                                alt={collab.user.username}
                                className="rounded-circle"
                                style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                              />
                            ) : (
                              <div
                                className="rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center"
                                style={{ width: '40px', height: '40px', fontSize: '1rem' }}
                              >
                                {(collab.user.first_name || collab.user.username || 'U').charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="flex-grow-1">
                            <div className="subtext-btn-sm fw-bold font-quicksand">
                              {collab.user.first_name} {collab.user.last_name}
                            </div>
                            <div className="subtext-btn-sm text-muted font-quicksand">
                              @{collab.user.username}
                            </div>
                          </div>
                          <span className={`badge bg-${getRoleColor(collab.role)} ms-2`}>
                            {collab.role.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StoryCollaborators;
