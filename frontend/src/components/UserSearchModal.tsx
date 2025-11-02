import React, { useState, useEffect, useCallback } from 'react';
import { collaborationService, User } from '../services/collaborationService';

interface UserSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectUser: (user: User) => void;
  onInviteByEmail: (email: string) => void;
}

const UserSearchModal: React.FC<UserSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectUser,
  onInviteByEmail
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showEmailInvite, setShowEmailInvite] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await collaborationService.searchUsers(searchQuery);
        setSearchResults(results);
      } catch (error) {
        console.error('Error searching users:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleUserSelect = (user: User) => {
    onSelectUser(user);
    onClose();
  };

  const handleEmailInvite = () => {
    if (emailAddress.trim()) {
      onInviteByEmail(emailAddress.trim());
      onClose();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      if (searchResults.length > 0) {
        handleUserSelect(searchResults[0]);
      } else {
        setShowEmailInvite(true);
        setEmailAddress(searchQuery);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Invite Collaborator</h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              aria-label="Close"
            ></button>
          </div>
          
          <div className="modal-body">
            {/* Search Input */}
            <div className="mb-3">
              <label htmlFor="userSearch" className="form-label">
                Search for users or enter email address
              </label>
              <div className="input-group">
                <input
                  type="text"
                  className="form-control"
                  id="userSearch"
                  placeholder="Search by username, name, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  autoFocus
                />
                {isSearching && (
                  <span className="input-group-text">
                    <div className="spinner-border spinner-border-sm" role="status">
                      <span className="visually-hidden">Searching...</span>
                    </div>
                  </span>
                )}
              </div>
            </div>

            {/* Search Results */}
            {searchQuery && !showEmailInvite && (
              <div className="mb-3">
                <h6>Search Results</h6>
                {isSearching ? (
                  <div className="text-center py-3">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Searching...</span>
                    </div>
                    <p className="mt-2 text-muted">Searching for users...</p>
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="list-group">
                    {searchResults.map((user) => (
                      <div
                        key={user.id}
                        className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                        onClick={() => handleUserSelect(user)}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="d-flex align-items-center">
                          {user.avatar ? (
                            <img
                              src={user.avatar}
                              alt={user.username}
                              className="rounded-circle me-3"
                              style={{ width: '40px', height: '40px' }}
                            />
                          ) : (
                            <div
                              className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center me-3"
                              style={{ width: '40px', height: '40px' }}
                            >
                              {user.first_name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <h6 className="mb-0">{user.first_name} {user.last_name}</h6>
                            <small className="text-muted">@{user.username}</small>
                          </div>
                        </div>
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUserSelect(user);
                          }}
                        >
                          Invite
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-3">
                    <p className="text-muted">No users found for "{searchQuery}"</p>
                    <button
                      className="btn btn-outline-primary"
                      onClick={() => {
                        setShowEmailInvite(true);
                        setEmailAddress(searchQuery);
                      }}
                    >
                      Invite by email instead
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Email Invite Form */}
            {showEmailInvite && (
              <div className="mb-3">
                <h6>Send Email Invitation</h6>
                <div className="alert alert-info">
                  <i className="fas fa-info-circle me-2"></i>
                  This will send an email invitation to join your studio as a collaborator.
                </div>
                <div className="mb-3">
                  <label htmlFor="emailAddress" className="form-label">Email Address</label>
                  <input
                    type="email"
                    className="form-control"
                    id="emailAddress"
                    value={emailAddress}
                    onChange={(e) => setEmailAddress(e.target.value)}
                    placeholder="user@example.com"
                  />
                </div>
                <div className="d-flex gap-2">
                  <button
                    className="btn btn-primary"
                    onClick={handleEmailInvite}
                    disabled={!emailAddress.trim()}
                  >
                    <i className="fas fa-envelope me-2"></i>
                    Send Email Invitation
                  </button>
                  <button
                    className="btn btn-outline-secondary"
                    onClick={() => {
                      setShowEmailInvite(false);
                      setEmailAddress('');
                    }}
                  >
                    Back to Search
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserSearchModal;
