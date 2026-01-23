import React, { useState } from 'react';
import { User } from '../services/collaborationService';

interface CollaboratorInviteFormProps {
  selectedUser: User;
  onInvite: (role: 'editor' | 'viewer' | 'admin', message?: string) => void;
  onCancel: () => void;
}

const CollaboratorInviteForm: React.FC<CollaboratorInviteFormProps> = ({
  selectedUser,
  onInvite,
  onCancel
}) => {
  const [role, setRole] = useState<'editor' | 'viewer' | 'admin'>('editor');
  const [message, setMessage] = useState('');
  const [isInviting, setIsInviting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsInviting(true);
    try {
      await onInvite(role, message.trim() || undefined);
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h5 className="mb-0">Invite Collaborator</h5>
      </div>
      <div className="card-body">
        {/* Selected User Info */}
        <div className="d-flex align-items-center mb-4">
          {selectedUser.avatar ? (
            <img
              src={selectedUser.avatar}
              alt={selectedUser.username}
              className="rounded-circle me-3"
              style={{ width: '50px', height: '50px' }}
            />
          ) : (
            <div
              className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center me-3"
              style={{ width: '50px', height: '50px' }}
            >
              {selectedUser.first_name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h6 className="mb-0">{selectedUser.first_name} {selectedUser.last_name}</h6>
            <small className="text-muted">@{selectedUser.username}</small>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Role Selection */}
          <div className="mb-3">
            <label className="form-label">Collaborator Role</label>
            <div className="row">
              <div className="col-md-4">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="role"
                    id="roleViewer"
                    value="viewer"
                    checked={role === 'viewer'}
                    onChange={(e) => setRole(e.target.value as 'viewer')}
                  />
                  <label className="form-check-label" htmlFor="roleViewer">
                    <strong>Viewer</strong>
                    <br />
                    <small className="text-muted">Can view and comment on stories</small>
                  </label>
                </div>
              </div>
              <div className="col-md-4">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="role"
                    id="roleEditor"
                    value="editor"
                    checked={role === 'editor'}
                    onChange={(e) => setRole(e.target.value as 'editor')}
                  />
                  <label className="form-check-label" htmlFor="roleEditor">
                    <strong>Editor</strong>
                    <br />
                    <small className="text-muted">Can edit stories and manage content</small>
                  </label>
                </div>
              </div>
              <div className="col-md-4">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="role"
                    id="roleAdmin"
                    value="admin"
                    checked={role === 'admin'}
                    onChange={(e) => setRole(e.target.value as 'admin')}
                  />
                  <label className="form-check-label" htmlFor="roleAdmin">
                    <strong>Admin</strong>
                    <br />
                    <small className="text-muted">Full access including user management</small>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Optional Message */}
          <div className="mb-4">
            <label htmlFor="inviteMessage" className="form-label">
              Personal Message (Optional)
            </label>
            <textarea
              className="form-control"
              id="inviteMessage"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a personal message to your invitation..."
              maxLength={500}
            />
            <div className="form-text">
              {message.length}/500 characters
            </div>
          </div>

          {/* Action Buttons */}
          <div className="d-flex gap-2">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isInviting}
            >
              {isInviting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Sending Invitation...
                </>
              ) : (
                <>
                  <i className="fas fa-paper-plane me-2"></i>
                  Send Invitation
                </>
              )}
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={onCancel}
              disabled={isInviting}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CollaboratorInviteForm;
