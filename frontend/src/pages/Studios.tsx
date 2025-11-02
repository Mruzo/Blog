import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import MessagePopup from '../components/MessagePopup';

interface Studio {
  id: number;
  name: string;
  description: string;
  owner: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
  };
  collaborators: Array<{
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    role: string; // 'writer', '3d_artist', 'voice_actor', 'sound_engineer', 'cinematographer'
  }>;
  stories_count: number;
  created_at: string;
  updated_at: string;
  is_public: boolean;
  avatar_url?: string;
}

const Studios: React.FC = () => {
  const [studios, setStudios] = useState<Studio[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'success' | 'danger' | 'warning' | 'info'>('success');
  const [showMessage, setShowMessage] = useState(false);

  useEffect(() => {
    const fetchStudios = async () => {
      setLoading(true);
      try {
        // This will be replaced with actual API call
        const mockStudios: Studio[] = [
          {
            id: 1,
            name: "Epic Adventures Studio",
            description: "Creating immersive 3D comic adventures with cutting-edge technology and collaborative storytelling.",
            owner: {
              id: 1,
              username: "john_doe",
              first_name: "John",
              last_name: "Doe"
            },
            collaborators: [
              { id: 2, username: "jane_smith", first_name: "Jane", last_name: "Smith", role: "3d_artist" },
              { id: 3, username: "mike_wilson", first_name: "Mike", last_name: "Wilson", role: "voice_actor" }
            ],
            stories_count: 5,
            created_at: "2024-01-15T00:00:00Z",
            updated_at: "2024-01-20T00:00:00Z",
            is_public: true,
            avatar_url: "/v2/studio-avatar-1.jpg"
          },
          {
            id: 2,
            name: "Digital Dreams Collective",
            description: "A collaborative space for experimental 3D storytelling and innovative narrative techniques.",
            owner: {
              id: 4,
              username: "sarah_jones",
              first_name: "Sarah",
              last_name: "Jones"
            },
            collaborators: [
              { id: 5, username: "alex_brown", first_name: "Alex", last_name: "Brown", role: "writer" },
              { id: 6, username: "lisa_garcia", first_name: "Lisa", last_name: "Garcia", role: "sound_engineer" },
              { id: 7, username: "tom_davis", first_name: "Tom", last_name: "Davis", role: "cinematographer" }
            ],
            stories_count: 3,
            created_at: "2024-01-10T00:00:00Z",
            updated_at: "2024-01-18T00:00:00Z",
            is_public: true,
            avatar_url: "/v2/studio-avatar-2.jpg"
          },
          {
            id: 3,
            name: "Narrative Nexus",
            description: "Where writers and 3D artists come together to create compelling visual stories.",
            owner: {
              id: 8,
              username: "emma_wilson",
              first_name: "Emma",
              last_name: "Wilson"
            },
            collaborators: [
              { id: 9, username: "david_lee", first_name: "David", last_name: "Lee", role: "3d_artist" },
              { id: 10, username: "anna_taylor", first_name: "Anna", last_name: "Taylor", role: "voice_actor" }
            ],
            stories_count: 7,
            created_at: "2024-01-05T00:00:00Z",
            updated_at: "2024-01-22T00:00:00Z",
            is_public: true,
            avatar_url: "/v2/studio-avatar-3.jpg"
          }
        ];
        
        setStudios(mockStudios);
      } catch (error) {
        console.error('Error fetching studios:', error);
        setMessage('Failed to load studios.');
        setMessageType('danger');
        setShowMessage(true);
      } finally {
        setLoading(false);
      }
    };

    fetchStudios();
  }, []);

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

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="container mt-4" style={{ maxWidth: '1200px' }}>
      {/* Header */}
      <div className="text-center mb-5">
        <h1 className="subtext-btn mb-3">Collaborative Studios</h1>
        <p className="subtext-btn-sm text-muted mb-4">
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
                <div className="card-img-top bg-light d-flex align-items-center justify-content-center" style={{ height: '200px' }}>
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

                <div className="card-body d-flex flex-column">
                  {/* Studio Info */}
                  <div className="mb-3">
                    <h5 className="subtext-btn-sm mb-2">{studio.name}</h5>
                    <p className="subtext-btn-sm text-muted mb-3">{studio.description}</p>
                  </div>

                  {/* Owner */}
                  <div className="mb-3">
                    <div className="d-flex align-items-center mb-2">
                      <i className="fas fa-crown text-warning me-2"></i>
                      <span className="subtext-btn-sm fw-bold">Owner:</span>
                    </div>
                    <div className="ms-4">
                      <span className="subtext-btn-sm">{studio.owner.first_name} {studio.owner.last_name}</span>
                      <span className="text-muted"> (@{studio.owner.username})</span>
                    </div>
                  </div>

                  {/* Collaborators */}
                  <div className="mb-3">
                    <div className="d-flex align-items-center mb-2">
                      <i className="fas fa-users text-info me-2"></i>
                      <span className="subtext-btn-sm fw-bold">Team ({studio.collaborators.length}):</span>
                    </div>
                    <div className="ms-4">
                      {studio.collaborators.map((collaborator) => (
                        <div key={collaborator.id} className="d-flex align-items-center mb-1">
                          <span className={`badge bg-${getRoleColor(collaborator.role)} me-2`}>
                            <i className={`${getRoleIcon(collaborator.role)} me-1`}></i>
                            {collaborator.role.replace('_', ' ').toUpperCase()}
                          </span>
                          <span className="subtext-btn-sm">{collaborator.first_name} {collaborator.last_name}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="row text-center mb-3">
                    <div className="col-6">
                      <div className="subtext-btn text-primary">{studio.stories_count}</div>
                      <div className="subtext-btn-sm text-muted">Stories</div>
                    </div>
                    <div className="col-6">
                      <div className="subtext-btn text-success">{studio.collaborators.length + 1}</div>
                      <div className="subtext-btn-sm text-muted">Members</div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-auto">
                    <div className="d-flex gap-2">
                      <Link 
                        to={`/studios/${studio.id}/`} 
                        className="btn btn-primary subtext-btn-sm flex-fill"
                      >
                        <i className="fas fa-eye me-1"></i>View Studio
                      </Link>
                      <button 
                        className="btn btn-outline-secondary subtext-btn-sm"
                        onClick={() => {
                          setMessage('Studio collaboration request sent!');
                          setMessageType('success');
                          setShowMessage(true);
                        }}
                      >
                        <i className="fas fa-handshake me-1"></i>Collaborate
                      </button>
                    </div>
                  </div>
                </div>

                <div className="card-footer bg-transparent border-0 pt-0">
                  <div className="text-muted subtext-btn-sm">
                    <div>Created: {new Date(studio.created_at).toLocaleDateString()}</div>
                    <div>Updated: {new Date(studio.updated_at).toLocaleDateString()}</div>
                  </div>
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





