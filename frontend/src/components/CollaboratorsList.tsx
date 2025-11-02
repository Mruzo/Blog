import React, { useState } from 'react';
import { CollaborationInvite } from '../services/collaborationService';

interface CollaboratorsListProps {
  collaborators: CollaborationInvite[];
  onUpdateRole: (inviteId: number, role: 'editor' | 'viewer' | 'admin') => void;
  onRemoveCollaborator: (inviteId: number) => void;
  onAcceptCollaborator?: (inviteId: number) => void;
  canManage: boolean;
  isOwner?: boolean;
}

const CollaboratorsList: React.FC<CollaboratorsListProps> = ({
  collaborators,
  onUpdateRole,
  onRemoveCollaborator,
  onAcceptCollaborator,
  canManage,
  isOwner = false
}) => {
  const [editingRole, setEditingRole] = useState<number | null>(null);
  const [updating, setUpdating] = useState<number | null>(null);
  const [accepting, setAccepting] = useState<number | null>(null);

  const handleRoleUpdate = async (inviteId: number, newRole: 'editor' | 'viewer' | 'admin') => {
    setUpdating(inviteId);
    try {
      await onUpdateRole(inviteId, newRole);
      setEditingRole(null);
    } catch (error) {
      console.error('Error updating role:', error);
    } finally {
      setUpdating(null);
    }
  };

  const handleAcceptCollaborator = async (inviteId: number) => {
    if (!onAcceptCollaborator) return;
    
    setAccepting(inviteId);
    try {
      await onAcceptCollaborator(inviteId);
    } catch (error) {
      console.error('Error accepting collaborator:', error);
    } finally {
      setAccepting(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      pending: 'bg-warning text-dark',
      accepted: 'bg-success',
      declined: 'bg-danger',
      expired: 'bg-secondary'
    };

    return (
      <span className={`badge ${statusClasses[status as keyof typeof statusClasses] || 'bg-secondary'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getRoleBadge = (role: string) => {
    const roleClasses = {
      admin: 'bg-danger',
      editor: 'bg-primary',
      viewer: 'bg-info'
    };

    return (
      <span className={`badge ${roleClasses[role as keyof typeof roleClasses] || 'bg-secondary'}`}>
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (collaborators.length === 0) {
    return (
      <div className="text-center py-4">
        <i className="fas fa-users fa-3x text-muted mb-3"></i>
        <h5 className="subtext-btn text-muted mb-2">No collaborators yet</h5>
        <p className="subtext-btn-sm text-muted">Invite users to collaborate on this story.</p>
      </div>
    );
  }

  return (
    <div className="list-group">
      {collaborators.map((collaborator) => (
        <div key={collaborator.id} className="list-group-item border-0 p-0">
          <div className="d-flex justify-content-between align-items-start">
            <div className="d-flex align-items-center">
              {/* User Avatar */}
              <div className="me-4" style={{ minWidth: '40px' }}>
                {collaborator.invitee_user?.avatar ? (
                  <img
                    src={collaborator.invitee_user.avatar}
                    alt={collaborator.invitee_user.username}
                    className="rounded-circle"
                    style={{ width: '40px', height: '40px' }}
                  />
                ) : (
                  <div
                    className="rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center mr-1"
                    style={{ width: '40px', height: '40px' }}
                  >
                    {collaborator.invitee_user ? 
                      collaborator.invitee_user.first_name.charAt(0).toUpperCase() :
                      collaborator.invitee_email.charAt(0).toUpperCase()
                    }
                  </div>
                )}
              </div>

              {/* User Info */}
              <div>
                <h6 className="subtext-btn mb-1">
                  {collaborator.invitee_user ? 
                    `${collaborator.invitee_user.first_name} ${collaborator.invitee_user.last_name}` :
                    collaborator.invitee_email
                  }
                </h6>
                <p className="subtext-btn-sm mb-1 text-muted">
                  {collaborator.invitee_user ? 
                    `@${collaborator.invitee_user.username}` :
                    collaborator.invitee_email
                  }
                </p>
                <div className="d-flex gap-2 align-items-center">
                  {getRoleBadge(collaborator.role)}
                  {getStatusBadge(collaborator.status)}
                  <small className="text-muted">
                    Invited {formatDate(collaborator.created_at)}
                  </small>
                </div>
                {collaborator.message && (
                  <p className="subtext-btn-sm mt-2 mb-0 text-muted">
                    <em>"{collaborator.message}"</em>
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="d-flex gap-2">
              {/* Accept button - show for pending invitations when user is owner */}
              {isOwner && canManage && collaborator.status === 'pending' && onAcceptCollaborator && (
                <button
                  className="btn btn-sm btn-success"
                  onClick={() => handleAcceptCollaborator(collaborator.id)}
                  disabled={accepting === collaborator.id}
                >
                  {accepting === collaborator.id ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                      Accepting...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-check me-1"></i>
                      Accept
                    </>
                  )}
                </button>
              )}
              
              {/* Actions dropdown - show for accepted collaborators */}
              {canManage && collaborator.status === 'accepted' && (
                <div className="dropdown">
                  <button
                    className="btn btn-sm btn-outline-secondary dropdown-toggle"
                    type="button"
                    data-bs-toggle="dropdown"
                    aria-expanded="false"
                  >
                    Actions
                  </button>
                  <ul className="dropdown-menu">
                    <li>
                      <button
                        className="dropdown-item"
                        onClick={() => setEditingRole(collaborator.id)}
                      >
                        <i className="fas fa-edit me-2"></i>
                        Change Role
                      </button>
                    </li>
                    <li>
                      <button
                        className="dropdown-item text-danger"
                        onClick={() => onRemoveCollaborator(collaborator.id)}
                      >
                        <i className="fas fa-user-times me-2"></i>
                        Remove
                      </button>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Role Edit Form */}
          {editingRole === collaborator.id && (
            <div className="mt-3 p-3 bg-light rounded">
              <h6 className="subtext-btn-sm">Change Role</h6>
              <div className="row">
                <div className="col-md-4">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="radio"
                      name={`role-${collaborator.id}`}
                      id={`viewer-${collaborator.id}`}
                      value="viewer"
                      checked={collaborator.role === 'viewer'}
                      onChange={(e) => handleRoleUpdate(collaborator.id, e.target.value as 'viewer')}
                      disabled={updating === collaborator.id}
                    />
                    <label className="form-check-label" htmlFor={`viewer-${collaborator.id}`}>
                      Viewer
                    </label>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="radio"
                      name={`role-${collaborator.id}`}
                      id={`editor-${collaborator.id}`}
                      value="editor"
                      checked={collaborator.role === 'editor'}
                      onChange={(e) => handleRoleUpdate(collaborator.id, e.target.value as 'editor')}
                      disabled={updating === collaborator.id}
                    />
                    <label className="form-check-label" htmlFor={`editor-${collaborator.id}`}>
                      Editor
                    </label>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="radio"
                      name={`role-${collaborator.id}`}
                      id={`admin-${collaborator.id}`}
                      value="admin"
                      checked={collaborator.role === 'admin'}
                      onChange={(e) => handleRoleUpdate(collaborator.id, e.target.value as 'admin')}
                      disabled={updating === collaborator.id}
                    />
                    <label className="form-check-label" htmlFor={`admin-${collaborator.id}`}>
                      Admin
                    </label>
                  </div>
                </div>
              </div>
              <div className="mt-2">
                <button
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => setEditingRole(null)}
                  disabled={updating === collaborator.id}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default CollaboratorsList;
