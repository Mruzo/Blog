import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import MessagePopup from '../components/MessagePopup';
import { useApi } from '../contexts/ApiContext';
import { apiService } from '../services/api';

interface Studio {
  id: number;
  name: string;
  description: string;
  owner?: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
  } | number; // Can be object or just owner ID
  collaborators?: Array<{
    id: number;
    username?: string;
    first_name?: string;
    last_name?: string;
    role?: string; // 'writer', '3d_artist', 'voice_actor', 'sound_engineer', 'cinematographer'
    is_active?: boolean; // Only count active collaborators
    user?: {
      id: number;
      username: string;
      first_name: string;
      last_name: string;
    };
  }>;
  stories_count?: number;
  created_at: string;
  updated_at: string;
  is_public: boolean;
  avatar_url?: string;
}

const Studios: React.FC = () => {
  const { studios: contextStudios, loadStudios, isLoading, currentUser } = useApi();
  const [studios, setStudios] = useState<Studio[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'success' | 'danger' | 'warning' | 'info'>('success');
  const [showMessage, setShowMessage] = useState(false);

  // Helper function to check if current user is a member or owner of the studio
  const isUserMemberOrOwner = (studio: Studio): boolean => {
    if (!currentUser) return false;
    
    // Check if user is the owner
    const ownerId = typeof studio.owner === 'object' ? studio.owner.id : studio.owner;
    if (currentUser.id === ownerId) {
      return true;
    }
    
    // Check if user is in collaborators list
    if (studio.collaborators && Array.isArray(studio.collaborators)) {
      return studio.collaborators.some((collab) => {
        const collabUserId = collab.user?.id || collab.id;
        return collabUserId === currentUser.id;
      });
    }
    
    return false;
  };

  // Helper function to check if user is the owner
  const isUserOwner = (studio: Studio): boolean => {
    if (!currentUser) return false;
    const ownerId = typeof studio.owner === 'object' ? studio.owner.id : studio.owner;
    return currentUser.id === ownerId;
  };

  // Load studios only once on mount
  useEffect(() => {
    const fetchStudios = async () => {
      setLoading(true);
      try {
        console.log('Studios: Loading studios from API...');
        console.log('Studios: Current contextStudios before load:', contextStudios);
        // Load studios from API context, but handle errors gracefully
        await loadStudios().then(() => {
          console.log('Studios: loadStudios completed successfully');
          console.log('Studios: contextStudios after load (will update via separate useEffect):', contextStudios);
        }).catch(err => {
          const status = err?.response?.status;
          const errorMessage = err?.response?.data?.detail || err?.message || 'Unknown error';
          console.error('Studios: Error loading studios:', {
            status,
            errorMessage,
            error: err,
            response: err?.response?.data
          });
          // Don't throw - let data from context be used if available
          // But check if we have studios in context already
          if (contextStudios && Array.isArray(contextStudios) && contextStudios.length > 0) {
            console.log('Studios: Using existing studios from context:', contextStudios.length);
          } else {
            console.warn('Studios: No studios in context, API call failed');
          }
          return null;
        });
      } catch (error) {
        console.error('Studios: Unexpected error fetching studios:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStudios();
    // Only include loadStudios - don't include contextStudios to avoid infinite loop
    // The separate useEffect below will handle updating local state when contextStudios changes
  }, [loadStudios]);

  // Update local studios state when contextStudios changes (from API context)
  // This doesn't trigger API calls - it just syncs local state with context
  useEffect(() => {
    console.log('Studios: contextStudios changed:', {
      contextStudios,
      isArray: Array.isArray(contextStudios),
      length: Array.isArray(contextStudios) ? contextStudios.length : 0
    });
    
    if (Array.isArray(contextStudios)) {
      // contextStudios is an array
      if (contextStudios.length > 0) {
        console.log('Studios: Setting studios from context:', contextStudios.length, 'studios');
        setStudios(contextStudios);
      } else {
        // Empty array means no studios found
        console.log('Studios: contextStudios is empty array');
        setStudios([]);
      }
    } else if (contextStudios === null || contextStudios === undefined) {
      // Only set to empty array if contextStudios is explicitly null/undefined
      // Don't set to empty array if it's just an empty array (still loading)
      console.log('Studios: contextStudios is null/undefined, setting to empty array');
      setStudios([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextStudios]);

  // Clear error messages when data becomes available
  useEffect(() => {
    if (studios && studios.length > 0) {
      // Data is available - clear any error messages
      setShowMessage(false);
      setMessage('');
    } else if (!loading && !isLoading && (!studios || studios.length === 0)) {
      // No data available and not loading - show error
      setMessage('Failed to load studios. Please refresh the page.');
      setMessageType('danger');
      setShowMessage(true);
    }
  }, [studios, loading, isLoading]);

  const handleCloseMessage = () => {
    setShowMessage(false);
  };

  const getRoleIcon = (role: string) => {
    const roleIcons: Record<string, string> = {
      'writer': 'fas fa-pen',
      '3d_artist': 'fas fa-cube',
      'voice_actor': 'fas fa-microphone',
      'sound_engineer': 'fas fa-volume-up',
      'cinematographer': 'fas fa-video'
    };
    return roleIcons[role] || 'fas fa-user';
  };

  const getRoleColor = (role: string) => {
    const roleColors: Record<string, string> = {
      'writer': 'primary',
      '3d_artist': 'success',
      'voice_actor': 'info',
      'sound_engineer': 'warning',
      'cinematographer': 'danger'
    };
    return roleColors[role] || 'secondary';
  };

  // Helper function to get owner display info
  const getOwnerInfo = (studio: Studio) => {
    if (typeof studio.owner === 'object' && studio.owner !== null) {
      return studio.owner;
    }
    // If owner is just a number, we don't have user details
    return {
      id: typeof studio.owner === 'number' ? studio.owner : 0,
      username: 'Unknown',
      first_name: 'Unknown',
      last_name: 'User'
    };
  };

  // Helper function to get collaborator display info
  const getCollaboratorInfo = (collaborator: any) => {
    if (collaborator.user) {
      return {
        id: collaborator.user.id || collaborator.id,
        username: collaborator.user.username || collaborator.username || 'Unknown',
        first_name: collaborator.user.first_name || collaborator.first_name || 'Unknown',
        last_name: collaborator.user.last_name || collaborator.last_name || 'User',
        role: collaborator.role || 'collaborator'
      };
    }
    return {
      id: collaborator.id,
      username: collaborator.username || 'Unknown',
      first_name: collaborator.first_name || 'Unknown',
      last_name: collaborator.last_name || 'User',
      role: collaborator.role || 'collaborator'
    };
  };

  if (loading || isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="container mt-4" style={{ maxWidth: '1200px' }}>
      {/* Header */}
      <div className="text-center mb-2 p-1">
        <p className="subtext-btn-sm text-muted mb-0">
          Discover creative studios where storytellers, 3D artists, voice actors, sound engineers, and cinematographers collaborate to bring stories to life.
        </p>
      </div>

      <MessagePopup
        message={message}
        type={messageType}
        show={showMessage}
        onClose={handleCloseMessage}
        duration={3000}
      />

      {studios.length > 0 ? (
        <div className="row">
          {studios.map((studio) => (
            <div key={studio.id} className="col-lg-4 col-md-6 mb-4">
              <div className="card h-100 border-0 shadow-sm">
                {/* Studio Avatar */}
                <div className="card-img-top bg-light d-flex align-items-center justify-content-center" style={{ height: '150px' }}>
                  {studio.avatar_url ? (
                    <img 
                      src={studio.avatar_url} 
                      alt={studio.name}
                      className="img-fluid rounded"
                      style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <i className="fas fa-building fa-4x text-muted"></i>
                  )}
                </div>

                <div className="card-body d-flex flex-column p-2">
                  {/* Studio Info */}
                  <div className="mb-1 border-bottom">
                    <h5 className="subtext-btn-sm mb-1">{studio.name}</h5>
                    <p className="subtext-btn-sm text-muted mb-1">{studio.description}</p>
                  </div>

                  {/* Team Section */}
                  <div className="mb-0">
                    
                    <div className="ms-4">
                      {/* Owner */}
                      {studio.owner && (() => {
                        const ownerInfo = getOwnerInfo(studio);
                        return (
                          <div className="d-flex align-items-center mb-1">
                            <i className="fas fa-crown text-warning me-2"></i>
                            <span className="subtext-btn-sm fw-bold">&nbsp;{ownerInfo.first_name} {ownerInfo.last_name}</span>
                            {/* <span className="text-muted ms-1">(@{ownerInfo.username})</span> */}
                          </div>
                        );
                      })()}
                      
                      {/* Collaborators */}
                      {studio.collaborators && studio.collaborators.filter(collab => collab.is_active === true).map((collaborator) => {
                        const collaboratorInfo = getCollaboratorInfo(collaborator);
                        return (
                          <div key={collaborator.id || collaboratorInfo.id} className="d-flex align-items-center mb-1">
                            {collaboratorInfo.role && (
                              <span className={`badge bg-${getRoleColor(collaboratorInfo.role)} me-2`}>
                                <i className={`${getRoleIcon(collaboratorInfo.role)} me-1`}></i>
                                {collaboratorInfo.role.replace('_', ' ').toUpperCase()}
                              </span>
                            )}
                            <span className="subtext-btn-sm">{collaboratorInfo.first_name} {collaboratorInfo.last_name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="row text-center mb-3">
                    <div className="col-6">
                      <div className="subtext-btn text-primary">{studio.stories_count || 0}</div>
                      <div className="subtext-btn-sm text-muted">Stories</div>
                    </div>
                    <div className="col-6">
                      <div className="subtext-btn text-success">
                        {(studio.collaborators?.filter(collab => collab.is_active === true).length || 0) + 1}
                      </div>
                      <div className="subtext-btn-sm text-muted">Members</div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-auto">
                    <div className="d-flex gap-2">
                      <Link 
                        to={`/immersivecomics/?studio=${studio.id}`} 
                        className="btn btn-primary subtext-btn-sm flex-fill"
                      >
                        <i className="fas fa-eye me-1"></i> View Stories
                      </Link>
                      {(() => {
                        const isMember = isUserMemberOrOwner(studio);
                        const isOwner = isUserOwner(studio);
                        return (
                          <button 
                            className={`btn subtext-btn-sm ${isMember ? (isOwner ? 'btn-primary' : 'btn-success') : 'btn-outline-secondary'}`}
                            onClick={async () => {
                              if (isOwner) {
                                setMessage('You are the owner of this studio!');
                                setMessageType('info');
                                setShowMessage(true);
                              } else if (isMember) {
                                setMessage('You are already a member of this studio!');
                                setMessageType('info');
                                setShowMessage(true);
                              } else {
                                // Create collaboration request
                                try {
                                  await apiService.createStudioCollaborationRequest(studio.id, {
                                    role: 'writer', // Default role
                                    message: ''
                                  });
                                  setMessage('Collaboration request sent! The studio owner will review it.');
                                  setMessageType('success');
                                  setShowMessage(true);
                                } catch (error: any) {
                                  const errorMessage = error.response?.data?.detail || 'Failed to send collaboration request';
                                  setMessage(errorMessage);
                                  setMessageType('danger');
                                  setShowMessage(true);
                                }
                              }
                            }}
                            disabled={isMember || isOwner}
                            title={isOwner ? 'You are the owner of this studio' : isMember ? 'You are already a member of this studio' : 'Request to collaborate with this studio'}
                          >
                            <i className={`fas ${isOwner ? 'fa-crown' : isMember ? 'fa-check-circle' : 'fa-handshake'} me-1`}></i>
                            {isOwner ? ' Mine' : isMember ? ' Member' : ' Collaborate'}
                          </button>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                <div className="card-footer bg-transparent border-0 pt-0">
                  {/* <div className="text-muted subtext-btn-sm">
                    <div>Created: {new Date(studio.created_at).toLocaleDateString()}</div>
                    <div>Updated: {new Date(studio.updated_at).toLocaleDateString()}</div>
                  </div> */}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-5">
          <div className="card border-0 shadow-sm">
            <div className="card-body py-5">
              <i className="fas fa-building fa-4x text-muted mb-3"></i>
              <h5 className="subtext-btn-sm text-muted mb-3">No studios found</h5>
              <p className="subtext-btn-sm text-muted mb-4">
                Be the first to create a collaborative studio!
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Studios;





