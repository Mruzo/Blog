import React, { useState, useEffect } from 'react';
import { collaborationService, User } from '../services/collaborationService';
import { useDialogA11y } from '../hooks/useDialogA11y';

interface UserSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectUser: (user: User, role: string) => void;
  onInviteByEmail: (email: string, role: string) => void;
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
  const [selectedRole, setSelectedRole] = useState<string>('writer');
  const dialogRef = useDialogA11y(isOpen, onClose);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      try {
        console.log('UserSearchModal: Searching for:', searchQuery);
        const results = await collaborationService.searchUsers(searchQuery);
        console.log('UserSearchModal: Search results:', results);
        setSearchResults(results);
      } catch (error: any) {
        console.error('UserSearchModal: Error searching users:', error);
        console.error('UserSearchModal: Error details:', error.response?.data);
        console.error('UserSearchModal: Error status:', error.response?.status);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleUserSelect = (user: User) => {
    onSelectUser(user, selectedRole);
    onClose();
  };

  const handleEmailInvite = () => {
    if (emailAddress.trim()) {
      onInviteByEmail(emailAddress.trim(), selectedRole);
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
    <div
      className="modal fade show d-block"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="modal-dialog modal-lg" 
        style={{ 
          marginTop: '120px',
          marginBottom: '20px',
          marginLeft: 'auto',
          marginRight: 'auto'
        }}
      >
        <div
          className="modal-content"
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="user-search-modal-title"
          tabIndex={-1}
        >
          <div className="modal-header">
            <h5 id="user-search-modal-title" className="modal-title font-gillsans subtext">Invite Collaborator</h5>
            <button
              type="button"
              className="btn btn-sm btn-light border"
              onClick={onClose}
              aria-label="Close"
            >
              <i className="fas fa-times" aria-hidden="true"></i>
            </button>
          </div>
          
          <div className="modal-body font-quicksand p-2">
            {/* Role Selection */}
            <div className="mb-3">
              <label htmlFor="roleSelect" className="form-label">
                Select Role &nbsp;
              </label>
              <select
                className="form-select font-quicksand"
                id="roleSelect"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
              >
                <option value="writer"> Writer</option>
                <option value="3d_artist"> 3D Artist</option>
                <option value="voice_actor"> Voice Actor</option>
                <option value="sound_engineer"> Sound Engineer</option>
                <option value="cinematographer"> Cinematographer</option>
              </select>
            </div>

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
              <div className="mb-3 font-quicksand">
                <h6 className="font-quicksand">Search Results</h6>
                {isSearching ? (
                  <div className="text-center py-3">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Searching...</span>
                    </div>
                    <p className="mt-2 text-muted font-quicksand">Searching for users...</p>
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="list-group" role="listbox" aria-label="User search results">
                    {searchResults.map((user) => (
                      <div
                        key={user.id}
                        role="option"
                        tabIndex={0}
                        aria-selected="false"
                        className="list-group-item list-group-item-action d-flex justify-content-between align-items-center p-2"
                        onClick={() => handleUserSelect(user)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleUserSelect(user);
                          }
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="d-flex align-items-center">
                          {user.avatar ? (
                            <img
                              src={user.avatar}
                              alt=""
                              className="rounded-circle me-3"
                              style={{ width: '40px', height: '40px' }}
                            />
                          ) : (
                            <div
                              className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center me-3"
                              style={{ width: '40px', height: '40px' }}
                              aria-hidden="true"
                            >
                              {user.first_name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="ml-1">
                            <h6 className="mb-0 font-quicksand">{user.first_name} {user.last_name}</h6>
                            <small className="text-muted font-quicksand">@{user.username}</small>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn btn-sm btn-primary font-quicksand"
                          aria-label={`Invite ${user.first_name} ${user.last_name} as ${selectedRole}`}
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
                  <div className="text-center py-3 font-quicksand">
                    <p className="text-muted font-quicksand">No users found for "{searchQuery}"</p>
                    <button
                      className="btn btn-outline-primary font-quicksand"
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
                <div className="mb-3">
                  <label htmlFor="emailRoleSelect" className="form-label">Role</label>
                  <select
                    className="form-select"
                    id="emailRoleSelect"
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                  >
                    <option value="writer"> Writer</option>
                    <option value="3d_artist"> 3D Artist</option>
                    <option value="voice_actor"> Voice Actor</option>
                    <option value="sound_engineer"> Sound Engineer</option>
                    <option value="cinematographer"> Cinematographer</option>
                  </select>
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
