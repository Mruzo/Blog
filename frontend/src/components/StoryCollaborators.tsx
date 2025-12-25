import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { User, collaborationService } from '../services/collaborationService';
import { Story, apiService } from '../services/api';
import MessagePopup from './MessagePopup';

interface StudioCollaborator {
  id: number;
  user: User;
  role: string; // Primary role for backward compatibility
  roles?: string[]; // All roles this user has
  is_story_collaborator: boolean;
  story_roles?: string[]; // Roles this user has on the story
}

const StoryCollaborators: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const storyId = id ? parseInt(id) : 0;

  const [studioCollaborators, setStudioCollaborators] = useState<StudioCollaborator[]>([]);
  // Track selected roles per user: Map<userId, Set<role>>
  const [selectedUserRoles, setSelectedUserRoles] = useState<Map<number, Set<string>>>(new Map());
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
      
      // Set selected roles per user based on who is already a story collaborator
      const selectedRoles = new Map<number, Set<string>>();
      data.forEach((collab: StudioCollaborator) => {
        if (collab.is_story_collaborator && collab.story_roles) {
          selectedRoles.set(collab.user.id, new Set(collab.story_roles));
        } else if (collab.is_story_collaborator) {
          // Fallback: if story_roles not provided, use all their studio roles
          selectedRoles.set(collab.user.id, new Set(collab.roles || [collab.role]));
        }
      });
      setSelectedUserRoles(selectedRoles);
      
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

  // Handle role toggle for a specific user
  const handleToggleRole = (userId: number, role: string) => {
    const newSelectedRoles = new Map(selectedUserRoles);
    const userRoles = newSelectedRoles.get(userId) || new Set<string>();
    
    if (userRoles.has(role)) {
      userRoles.delete(role);
      if (userRoles.size === 0) {
        newSelectedRoles.delete(userId);
      } else {
        newSelectedRoles.set(userId, userRoles);
      }
    } else {
      userRoles.add(role);
      newSelectedRoles.set(userId, userRoles);
    }
    
    setSelectedUserRoles(newSelectedRoles);
  };
  
  // Check if a user has any selected roles
  const hasSelectedRoles = (userId: number): boolean => {
    return selectedUserRoles.has(userId) && (selectedUserRoles.get(userId)?.size || 0) > 0;
  };
  
  // Check if a specific role is selected for a user
  const isRoleSelected = (userId: number, role: string): boolean => {
    return selectedUserRoles.get(userId)?.has(role) || false;
  };

  // Handle save
  const handleSave = async () => {
    if (!storyId) return;
    
    try {
      setSaving(true);
      // Convert Map to array of {user_id, roles} objects
      const userRolesArray = Array.from(selectedUserRoles.entries()).map(([userId, roles]) => ({
        user_id: userId,
        roles: Array.from(roles)
      }));
      
      await collaborationService.bulkAssignStoryCollaborators(storyId, userRolesArray);
      
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
        <div className="col">
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
              <div className="card-body p-0">
                <div className="list-group">
                  {studioCollaborators.map((collab) => {
                    const userRoles = collab.roles || [collab.role];
                    const hasSelected = hasSelectedRoles(collab.user.id);
                    return (
                    <div
                      key={collab.id}
                      className="list-group-item p-1"
                      style={{ 
                        backgroundColor: hasSelected ? '#e7f3ff' : 'transparent',
                        borderLeft: hasSelected ? '4px solid #0d6efd' : '4px solid transparent',
                        borderTop: hasSelected ? '2px solid #0d6efd' : '1px solid rgba(0,0,0,.125)',
                        borderBottom: hasSelected ? '2px solid #0d6efd' : '1px solid rgba(0,0,0,.125)',
                        borderRight: hasSelected ? '2px solid #0d6efd' : '1px solid rgba(0,0,0,.125)',
                        transition: 'all 0.2s ease-in-out'
                      }}
                    >
                      <div className="row g-2">
                        {/* Column 1: Individual ID Information */}
                        <div className="col-5 col-sm-4">
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
                            <div className="flex-grow-1" style={{ minWidth: 0 }}>
                              <div className="subtext-btn-sm fw-bold font-quicksand mb-0" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {collab.user.first_name} {collab.user.last_name}
                              </div>
                              <div className="subtext-btn-sm text-muted font-quicksand" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                @{collab.user.username}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Column 2: Roles */}
                        <div className="col-7 col-sm-8">
                          <div className="d-flex flex-wrap gap-2 align-items-center">
                            {userRoles.map((role: string, idx: number) => {
                              const roleSelected = isRoleSelected(collab.user.id, role);
                              return (
                                <div key={idx} className="d-flex align-items-center gap-1">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                    checked={roleSelected}
                                    onChange={() => handleToggleRole(collab.user.id, role)}
                                    style={{
                                      width: '1rem',
                                      height: '1rem',
                                      cursor: 'pointer',
                                      borderColor: roleSelected ? '#0d6efd' : '#6c757d',
                                      backgroundColor: roleSelected ? '#0d6efd' : '#fff',
                                      margin: 0,
                                      flexShrink: 0
                                    }}
                                    aria-label={`${role} role ${roleSelected ? 'selected' : 'not selected'}`}
                                  />&nbsp;&nbsp;&nbsp;
                                  <span 
                                    className={`badge bg-${getRoleColor(role)} ${roleSelected ? 'opacity-100' : 'opacity-50'}`}
                                    style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}
                                    onClick={() => handleToggleRole(collab.user.id, role)}
                                  >
                                   {role.replace('_', ' ').toUpperCase()}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                    );
                  })}
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
