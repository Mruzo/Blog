import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import MessagePopup from '../components/MessagePopup';
// import SmallButton from '../components/SmallButton';
import ScrollAwareLink from '../components/ScrollAwareLink';
import UserSearchModal from '../components/UserSearchModal';
import { useApi } from '../contexts/ApiContext';
import { apiService } from '../services/api';
import { collaborationService, User } from '../services/collaborationService';


const MyStudio: React.FC = () => {
  const { stories, myStudio, loadStories, loadMyStudio, isLoading, logout: logoutFromContext, currentUser } = useApi();
  const navigate = useNavigate();
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'success' | 'danger' | 'warning' | 'info'>('success');
  const [showMessage, setShowMessage] = useState(false);
  const [storyCounts, setStoryCounts] = useState<{[key: number]: {seasons: number, episodes: number}}>({});
  const [isLoadingCounts, setIsLoadingCounts] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  // const [hasMoreStories, setHasMoreStories] = useState(true);
  const [storiesPerPage] = useState(10);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [collaborationRequests, setCollaborationRequests] = useState<any[]>([]);
  const [showRequestsModal, setShowRequestsModal] = useState(false);
  const [isLoadingCollaborators, setIsLoadingCollaborators] = useState(false);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);

  // Load seasons and episodes counts for each story (optimized with pagination)
  const loadStoryCounts = useCallback(async (stories: any[]) => {
    if (stories.length === 0) return;
    
    setIsLoadingCounts(true);
    const counts: {[key: number]: {seasons: number, episodes: number}} = {};
    
    try {
      // Only load counts for visible stories (pagination)
      const startIndex = (currentPage - 1) * storiesPerPage;
      const endIndex = startIndex + storiesPerPage;
      const visibleStories = stories.slice(startIndex, endIndex);
      
      if (visibleStories.length === 0) {
        setStoryCounts(counts);
        return;
      }
      
      // Load all seasons for visible stories in parallel
      const seasonResults = await Promise.all(
        visibleStories.map(async (story) => {
          const storySeasons = await apiService.getSeasons(story.id);
          return { storyId: story.id, seasons: storySeasons };
        })
      );
      
      // Group seasons by story
      const seasonsByStory: {[key: number]: any[]} = {};
      seasonResults.forEach(({ storyId, seasons: storySeasons }) => {
        seasonsByStory[storyId] = storySeasons;
      });
      
      // Load all episodes for all seasons in parallel
      const episodeResults = await Promise.all(
        seasonResults.flatMap(({ seasons: storySeasons }) =>
          storySeasons.map(async (season) => {
            const seasonEpisodes = await apiService.getEpisodes(season.id);
            return { seasonId: season.id, episodes: seasonEpisodes };
          })
        )
      );
      
      // Group episodes by season
      const episodesBySeason: {[key: number]: any[]} = {};
      episodeResults.forEach(({ seasonId, episodes: seasonEpisodes }) => {
        episodesBySeason[seasonId] = seasonEpisodes;
      });
      
      // Calculate counts for visible stories only
      visibleStories.forEach(story => {
        const storySeasons = seasonsByStory[story.id] || [];
        const totalEpisodes = storySeasons.reduce((total, season) => {
          return total + (episodesBySeason[season.id]?.length || 0);
        }, 0);
        
        counts[story.id] = {
          seasons: storySeasons.length,
          episodes: totalEpisodes
        };
      });
      
      setStoryCounts(prev => ({ ...prev, ...counts }));
    } catch (error) {
      console.error('Error loading story counts:', error);
      // Set default counts for visible stories on error
      const startIndex = (currentPage - 1) * storiesPerPage;
      const endIndex = startIndex + storiesPerPage;
      const visibleStories = stories.slice(startIndex, endIndex);
      visibleStories.forEach(story => {
        counts[story.id] = { seasons: 0, episodes: 0 };
      });
      setStoryCounts(prev => ({ ...prev, ...counts }));
    } finally {
      setIsLoadingCounts(false);
    }
  }, [currentPage, storiesPerPage]); // Include pagination dependencies

  // Load data on component mount
  useEffect(() => {
    const fetchMyStudio = async () => {
      try {
        setIsInitialLoading(true);

        const results = await Promise.allSettled([
          loadStories().then((result) => result).catch((err) => {
            const status = err?.response?.status;
            const errorMessage = err?.response?.data?.detail || err?.message || 'Unknown error';
            if (status === 403 || status === 401) {
              console.warn('MyStudio: Auth error loading stories:', status, errorMessage);
              console.warn('MyStudio: Check if token is valid. Current token:', localStorage.getItem('authToken') ? 'exists' : 'missing');
            } else {
              console.error('MyStudio: Error loading stories:', status, errorMessage, err);
            }
            // Don't throw - let data from context be used if available
            return null;
          }),
          loadMyStudio().then((result) => result).catch((err) => {
            const status = err?.response?.status;
            const errorMessage = err?.response?.data?.detail || err?.message || 'Unknown error';
            if (status === 403 || status === 401) {
              console.warn('MyStudio: Auth error loading studio:', status, errorMessage);
            } else {
              console.error('MyStudio: Error loading studio:', status, errorMessage, err);
            }
            // Don't throw - let data from context be used if available
            return null;
          })
        ]);

        results.forEach((result, index) => {
          const name = index === 0 ? 'loadStories' : 'loadMyStudio';
          if (result.status === 'rejected') {
            console.error(`MyStudio: ${name} promise rejected:`, result.reason);
          }
        });
      } catch (error) {
        console.error('Error fetching studio:', error);
      } finally {
        setIsInitialLoading(false);
      }
    };

    fetchMyStudio();
  }, [loadStories, loadMyStudio]); // Only include load functions to avoid infinite loops

  // Clear error messages when data becomes available
  useEffect(() => {
    // If we have stories OR studio data, we're good - clear any error messages
    const hasStories = stories && Array.isArray(stories) && stories.length > 0;
    const hasStudio = !!myStudio;
    
    if (hasStories || hasStudio) {
      // Data is available - clear any error messages
      setShowMessage(false);
      setMessage('');
    } else if (!isInitialLoading && !isLoading) {
      // No data available and not loading - show error
      // But only if we've tried to load and nothing is available
      const token = localStorage.getItem('authToken');
      if (!token) {
        setMessage('Please log in to view your studio.');
        setMessageType('warning');
      } else {
        setMessage('Failed to load studio data. Please refresh the page.');
        setMessageType('danger');
      }
      setShowMessage(true);
    }
    // Note: We don't show error for empty stories array - that's a valid state (user has no stories)
  }, [stories, myStudio, isInitialLoading, isLoading]);

  useEffect(() => {
    // Load counts asynchronously to not block UI (deferred loading)
    if (stories && Array.isArray(stories) && stories.length > 0) {
      // Use setTimeout to defer the counts loading
      const timeoutId = setTimeout(() => {
        loadStoryCounts(stories);
      }, 100);
      
      return () => clearTimeout(timeoutId);
    } else {
      console.warn('MyStudio: Cannot load counts - stories is empty or not an array:', stories);
    }
  }, [stories, loadStoryCounts]); // Include loadStoryCounts in dependencies

  // Check authentication on mount and when currentUser changes
  useEffect(() => {
    // Check if user is authenticated - check token first (immediate check)
    const token = localStorage.getItem('authToken');
    if (!token) {
      // No token, redirect immediately
      const currentPath = window.location.pathname;
      sessionStorage.setItem('redirectAfterLogin', currentPath);
      navigate(`/login/?next=${encodeURIComponent(currentPath)}`, { replace: true });
      return;
    }
    
    // If we have a token but no user yet, wait for user to load
    // Don't redirect immediately - show loading spinner instead
    // This prevents redirect loops on page refresh
  }, [navigate, currentUser]);

  // Calculate pagination
  const totalPages = Math.ceil((stories?.length || 0) / storiesPerPage);
  const startIndex = (currentPage - 1) * storiesPerPage;
  const endIndex = startIndex + storiesPerPage;
  const paginatedStories = stories?.slice(startIndex, endIndex) || [];

  // Pagination handlers
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setStoryCounts({}); // Clear counts for new page
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      handlePageChange(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      handlePageChange(currentPage - 1);
    }
  };


  const handleCloseMessage = () => {
    setShowMessage(false);
  };

  // Check for login success message from sessionStorage
  useEffect(() => {
    const loginSuccess = sessionStorage.getItem('loginSuccess');
    if (loginSuccess === 'true') {
      setMessage('Login successful! Welcome back.');
      setMessageType('success');
      setShowMessage(true);
      // Clear the flag
      sessionStorage.removeItem('loginSuccess');
      sessionStorage.removeItem('loginSuccessRedirect');
    }
  }, []);

  // Helper functions for role display
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

  // Load collaborators
  const loadCollaborators = useCallback(async () => {
    if (!myStudio?.id) return;
    
    setIsLoadingCollaborators(true);
    try {
      const data = await collaborationService.getStudioCollaborators(myStudio.id);
      const collaboratorsData = Array.isArray(data) ? data : ((data as any)?.results || []);
      setCollaborators(collaboratorsData);
    } catch (error: any) {
      console.error('Error loading collaborators:', error);
      console.error('Error details:', error.response?.data);
      console.error('Error status:', error.response?.status);
      setCollaborators([]);
    } finally {
      setIsLoadingCollaborators(false);
    }
  }, [myStudio?.id]);

  // Load collaboration requests
  const loadCollaborationRequests = useCallback(async () => {
    if (!myStudio?.id) return;
    
    setIsLoadingRequests(true);
    try {
      const data = await apiService.getStudioCollaborationRequests(myStudio.id);
      // API returns {results: [...]} or just an array
      const requests = Array.isArray(data) ? data : ((data as any)?.results || []);
      setCollaborationRequests(requests);
    } catch (error: any) {
      console.error('Error loading collaboration requests:', error);
      console.error('Error details:', error.response?.data);
      console.error('Error status:', error.response?.status);
      // If it's a 403, user might not be the owner - that's expected
      if (error.response?.status === 403) {
        // Non-owners cannot list requests; expected.
      }
      setCollaborationRequests([]);
    } finally {
      setIsLoadingRequests(false);
    }
  }, [myStudio?.id]);

  // Load collaborators and requests when studio is available
  useEffect(() => {
    if (myStudio?.id) {
      loadCollaborators();
      loadCollaborationRequests();
    }
  }, [myStudio?.id, loadCollaborators, loadCollaborationRequests]);

  // Calculate unique team members count (not total role assignments)
  const uniqueTeamMembersCount = useMemo(() => {
    const activeCollaborators = collaborators.filter((collab: any) => 
      collab.is_active === true || collab.is_active === undefined
    );
    const uniqueUserIds = new Set(
      activeCollaborators.map((collab: any) => {
        const user = collab.user || collab;
        return user?.id;
      }).filter((id: any) => id !== undefined)
    );
    return uniqueUserIds.size;
  }, [collaborators]);

  // Poll for new collaboration requests periodically (every 10 seconds)
  // This ensures the desktop user sees new requests without needing to refresh
  useEffect(() => {
    if (!myStudio?.id) return;

    // Initial load is handled by the useEffect above
    // This effect only sets up polling
    const pollInterval = setInterval(() => {
      loadCollaborationRequests();
    }, 10000); // Poll every 10 seconds for better responsiveness

    return () => {
      clearInterval(pollInterval);
    };
  }, [myStudio?.id, loadCollaborationRequests]);

  // Handle accepting a request
  const handleAcceptRequest = async (requestId: number) => {
    
    if (!myStudio?.id) {
      console.error('No studio ID available');
      setMessage('Studio not found');
      setMessageType('danger');
      setShowMessage(true);
      return;
    }
    
    try {
      const request = collaborationRequests.find((r: any) => r.id === requestId);

      if (request) {
        const requesterId = request.requester?.id || request.requester;

        const isAlreadyCollaborator = collaborators.some((collab: any) => {
          const collabUserId = collab.user?.id || collab.user || collab.id;
          return collabUserId === requesterId && (collab.is_active === true || collab.is_active === undefined);
        });

        if (isAlreadyCollaborator) {
          setMessage('This user is already a member of your team');
          setMessageType('info');
          setShowMessage(true);
          // Still reload to refresh the list
          await loadCollaborationRequests();
          return;
        }
      }

      await apiService.acceptStudioCollaborationRequest(myStudio.id, requestId);

      setMessage('Collaboration request accepted');
      setMessageType('success');
      setShowMessage(true);

      await Promise.all([loadCollaborators(), loadCollaborationRequests()]);
    } catch (error: any) {
      console.error('Error accepting request:', error);
      console.error('Error response:', error.response);
      
      const errorMessage = error.response?.data?.detail || 'Failed to accept request';
      
      // Check if the error indicates the user is already a collaborator
      if (errorMessage.toLowerCase().includes('already') || 
          errorMessage.toLowerCase().includes('collaborator')) {
        setMessage('This user is already a member of your team');
        setMessageType('info');
      } else {
        setMessage(errorMessage);
        setMessageType('danger');
      }
      setShowMessage(true);
    }
  };

  // Handle declining a request
  const handleDeclineRequest = async (requestId: number) => {
    if (!myStudio?.id) return;
    
    try {
      await apiService.declineStudioCollaborationRequest(myStudio.id, requestId);
      setMessage('Collaboration request declined');
      setMessageType('info');
      setShowMessage(true);
      // Reload requests
      await loadCollaborationRequests();
    } catch (error: any) {
      setMessage(error.response?.data?.detail || 'Failed to decline request');
      setMessageType('danger');
      setShowMessage(true);
    }
  };

  // Show loading spinner during initial load or while waiting for user to load
  const token = localStorage.getItem('authToken');
  if (isInitialLoading || isLoading || (token && !currentUser)) {
    return (
      <div className="product-landing">
        <section className="product-landing__section">
          <div className="product-landing__container store-page__loadingWrap">
            <LoadingSpinner message="Loading studio…" />
          </div>
        </section>
      </div>
    );
  }

  // If no token and no user after loading, redirect to login
  if (!token && !currentUser && !isLoading && !isInitialLoading) {
    const currentPath = window.location.pathname;
    sessionStorage.setItem('redirectAfterLogin', currentPath);
    navigate(`/login/?next=${encodeURIComponent(currentPath)}`, { replace: true });
    return (
      <div className="product-landing">
        <section className="product-landing__section">
          <div className="product-landing__container store-page__loadingWrap">
            <LoadingSpinner message="Redirecting to login…" />
          </div>
        </section>
      </div>
    );
  }


  const handleUserSelect = async (user: User, role: string) => {
    if (!myStudio) return;
    
    try {
      await collaborationService.inviteStudioUser(myStudio.id, {
        user_id: user.id,
        role: role
      });
      
      setMessage(`Successfully invited @${user.username} to your studio`);
      setMessageType('success');
      setShowMessage(true);
      
      // Close the modal
      setShowInviteModal(false);
      
      // Reload collaborators list to show the new collaborator
      await loadCollaborators();
      // Also reload studio data
      await loadMyStudio();
    } catch (error: any) {
      const errorMessage = error?.response?.data?.detail || error?.message || 'Failed to invite user';
      setMessage(errorMessage);
      setMessageType('danger');
      setShowMessage(true);
    }
  };

  const handleEmailInvite = async (email: string, role: string) => {
    if (!myStudio) return;
    
    try {
      await collaborationService.inviteStudioByEmail(myStudio.id, {
        email: email,
        role: role
      });
      
      setMessage(`Invitation sent to ${email}`);
      setMessageType('success');
      setShowMessage(true);
      
      // Close the modal
      setShowInviteModal(false);
      
      // Reload collaborators list to show the new collaborator (if user exists and was added)
      await loadCollaborators();
      // Also reload studio data
      await loadMyStudio();
    } catch (error: any) {
      const errorMessage = error?.response?.data?.detail || error?.message || 'Failed to send invitation';
      setMessage(errorMessage);
      setMessageType('danger');
      setShowMessage(true);
    }
  };

  const handleLogout = async () => {
    // Ask for confirmation before logging out
    const confirmed = window.confirm('Are you sure you want to log out?');
    if (!confirmed) {
      return;
    }

    try {
      // Call logout from context - this will clear user state and token
      await logoutFromContext();
      
      // Show success message
      setMessage('Logout successful! Redirecting...');
      setMessageType('success');
      setShowMessage(true);
      
      // Store logout success in sessionStorage to show on home page
      sessionStorage.setItem('logoutSuccess', 'true');
      
      // Small delay to show success message before redirect
      setTimeout(() => {
        // Redirect to home page and replace history to prevent back navigation
        navigate('/', { replace: true });
      }, 500);
    } catch (error: any) {
      // Even if logout API fails, user state is cleared anyway
      console.error('Logout error:', error);
      
      // Still show success message and redirect
      setMessage('Logout successful! Redirecting...');
      setMessageType('success');
      setShowMessage(true);
      sessionStorage.setItem('logoutSuccess', 'true');
      
      setTimeout(() => {
    navigate('/', { replace: true });
      }, 500);
    }
  };
  return (
    <div className="product-landing">
      <MessagePopup
        message={message}
        type={messageType}
        show={showMessage}
        onClose={handleCloseMessage}
        duration={3000}
      />
      
      <UserSearchModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onSelectUser={handleUserSelect}
        onInviteByEmail={handleEmailInvite}
      />

      <section className="product-landing__section product-landing__hero">
        <div className="product-landing__container">
          <p className="product-landing__eyebrow">Dashboard</p>
          <h1 className="product-landing__h1">My studio</h1>
          <p className="product-landing__lead">
            Manage your studio profile, team, and stories in one place.
          </p>
        </div>
      </section>

      <section className="product-landing__section">
        <div className="product-landing__container">
          <div className="my-studio__dashboard">
        <div>
          <div className="my-studio__panel">
            <div className="my-studio__panelHead">
              <h2 className="my-studio__panelTitle">
                <i className="fas fa-clapperboard" aria-hidden />
                <span className="my-studio__panelTitleText">{myStudio?.name || 'My Studio'}</span>
              </h2>
              <div className="my-studio__panelHeadActions">
                {myStudio && (
                  <Link
                    to={`/immersivecomics/studio/${myStudio.id}/edit/`}
                    className="stories-landing__btnPrimary text-decoration-none d-inline-flex align-items-center"
                    title="Edit studio"
                  >
                    <i className="fas fa-edit me-2" aria-hidden />
                    Edit
                  </Link>
                )}
                {currentUser && (
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="product-landing__ctaGhost"
                    title="Log out"
                  >
                    <i className="fas fa-sign-out-alt me-2" aria-hidden />
                    Log out
                  </button>
                )}
              </div>
            </div>
            <div className="my-studio__panelBody">
              <p className="my-studio__studioDesc">
                {myStudio?.description || 'A collaborative space for immersive 3D storytelling.'}
              </p>

              <div className="my-studio__ownerRow">
                {currentUser?.avatar ? (
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.username || 'Profile'}
                    className="my-studio__ownerAvatar"
                  />
                ) : (
                  <div className="my-studio__ownerAvatarPlaceholder bg-secondary text-white">
                    {(currentUser?.username || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="my-studio__ownerMeta">
                  <div className="my-studio__ownerHandle">@{currentUser?.username || 'user'}</div>
                  <div className="my-studio__ownerName">
                    {[currentUser?.first_name, currentUser?.last_name].filter(Boolean).join(' ') || '—'}
                  </div>
                  <div className="my-studio__ownerLabel">Owner</div>
                </div>
              </div>

              <div className="my-studio__statGrid">
                <div>
                  <div className="my-studio__statNum">{stories?.length || 0}</div>
                  <div className="my-studio__statLabel">Stories</div>
                </div>
                <div>
                  <div className="my-studio__statNum">
                    {isLoadingCounts ? (
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden />
                    ) : (
                      stories ? stories.reduce((total, story) => total + (storyCounts[story.id]?.seasons || 0), 0) : 0
                    )}
                  </div>
                  <div className="my-studio__statLabel">Seasons</div>
                </div>
                <div>
                  <div className="my-studio__statNum">
                    {isLoadingCounts ? (
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden />
                    ) : (
                      stories ? stories.reduce((total, story) => total + (storyCounts[story.id]?.episodes || 0), 0) : 0
                    )}
                  </div>
                  <div className="my-studio__statLabel">Episodes</div>
                </div>
                <div>
                  <div className="my-studio__statNum">{uniqueTeamMembersCount}</div>
                  <div className="my-studio__statLabel">Team</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="my-studio__dashboardTeamCol">
          <div className="my-studio__panel my-studio__panel--team">
            <div className="my-studio__panelHead">
              <h2 className="my-studio__panelTitle">
                <i className="fas fa-users" aria-hidden />
                <span className="my-studio__panelTitleText">My team</span>
              </h2>
              <div className="my-studio__panelHeadActions">
                <button
                  type="button"
                  className={`product-landing__ctaGhost position-relative ${collaborationRequests.length > 0 ? 'border-warning' : ''}`}
                  onClick={async () => {
                    await loadCollaborationRequests();
                    setTimeout(() => {
                      if (collaborationRequests.length > 0) {
                        setShowRequestsModal(true);
                      }
                    }, 100);
                  }}
                  title={collaborationRequests.length > 0 ? `View ${collaborationRequests.length} collaboration request${collaborationRequests.length > 1 ? 's' : ''}` : 'No pending collaboration requests'}
                  disabled={collaborationRequests.length === 0 && !isLoadingRequests}
                >
                  <i className="fas fa-bell me-2" aria-hidden />
                  Requests
                  {collaborationRequests.length > 0 && (
                    <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                      {collaborationRequests.length}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  className="stories-landing__btnPrimary"
                  onClick={() => setShowInviteModal(true)}
                  title="Invite collaborator"
                >
                  <i className="fas fa-plus me-2" aria-hidden />
                  Invite
                </button>
              </div>
            </div>
            <div className="my-studio__panelBody">
              {isLoadingCollaborators ? (
                <div className="text-center">
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                </div>
              ) : (
                <div className="my-studio__teamGrid">
                  <div className="my-studio__teamMember">
                    <div className="my-studio__teamMemberRole">
                      <span className="my-studio__teamPillOwner">
                        <i className="fas fa-crown text-warning" aria-hidden />
                        Owner
                      </span>
                    </div>
                    <div className="my-studio__teamMemberHandle">
                      {(() => {
                        if (!currentUser || !myStudio) {
                          return currentUser?.username || 'You';
                        }
                        const ownerId = typeof myStudio.owner === 'object' ? myStudio.owner.id : myStudio.owner;
                        const isOwner = Number(currentUser.id) === Number(ownerId);
                        return isOwner ? 'Me' : `@${currentUser.username || 'user'}`;
                      })()}
                    </div>
                  </div>

                  {(() => {
                    const activeCollaborators = collaborators.filter(
                      (collab: any) => collab.is_active === true || collab.is_active === undefined
                    );

                    return activeCollaborators.length > 0
                      ? activeCollaborators.map((collaborator: any) => {
                          const user = collaborator.user || collaborator;
                          const userName = user?.username || 'Unknown';
                          const userUsername = user?.username || 'unknown';
                          const role = collaborator.role || 'writer';
                          const ownerId =
                            myStudio && (typeof myStudio.owner === 'object' ? myStudio.owner.id : myStudio.owner);
                          const isOwner =
                            myStudio && currentUser && Number(currentUser.id) === Number(ownerId);
                          const isCollaboratorOwner = myStudio && Number(user?.id) === Number(ownerId);

                          return (
                            <div
                              key={collaborator.id || collaborator.user?.id || userUsername}
                              className="my-studio__teamMember position-relative"
                            >
                              <div className="my-studio__teamMemberRole">
                                <span className={`badge bg-${getRoleColor(role)}`}>
                                  {role.replace('_', ' ').toUpperCase()}
                                </span>
                              </div>
                              <div className="my-studio__teamMemberHandle">@{userUsername}</div>
                            {isOwner && !isCollaboratorOwner && myStudio && (
                              <button
                                className="btn btn-link text-muted p-0 border-0 my-studio__teamMemberAction"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (window.confirm(`Are you sure you want to remove ${userName} from your studio team?`)) {
                                    try {
                                      await collaborationService.removeStudioCollaborator(myStudio.id, collaborator.id);
                                      setMessage(`${userName} has been removed from your studio team.`);
                                      setMessageType('success');
                                      setShowMessage(true);
                                      await loadCollaborators();
                                    } catch (error: any) {
                                      const errorMessage = error?.response?.data?.detail || error?.message || 'Failed to remove collaborator';
                                      setMessage(errorMessage);
                                      setMessageType('danger');
                                      setShowMessage(true);
                                    }
                                  }
                                }}
                                title={`Remove ${userName} from studio`}
                                style={{ 
                                  fontSize: '0.7rem',
                                  opacity: 0.6,
                                  transition: 'opacity 0.2s ease, color 0.2s ease',
                                  lineHeight: 1,
                                  minWidth: 'auto',
                                  padding: '2px 4px'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.opacity = '1';
                                  e.currentTarget.style.color = '#dc3545';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.opacity = '0.6';
                                  e.currentTarget.style.color = '';
                                }}
                              >
                                <i className="fas fa-times-circle" aria-hidden />
                              </button>
                            )}
                            </div>
                          );
                        })
                      : null;
                  })()}

                  {(() => {
                    const activeCollaborators = collaborators.filter(
                      (collab: any) => collab.is_active === true || collab.is_active === undefined
                    );
                    return (
                      activeCollaborators.length === 0 && (
                        <p className="my-studio__teamEmpty">No collaborators yet.</p>
                      )
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
          </div>
        </div>
      </section>

      <section className="product-landing__section">
        <div className="product-landing__container">
          <div className="my-studio__sectionHead">
            <h2 className="product-landing__h2 mb-0">My stories</h2>
            <div className="my-studio__sectionHeadActions">
              <ScrollAwareLink
                to="/immersivecomics/story/create/"
                className="stories-landing__btnPrimary text-decoration-none d-inline-flex align-items-center"
              >
                <i className="fas fa-plus me-2" aria-hidden />
                Create
              </ScrollAwareLink>
              <ScrollAwareLink
                to="/immersivecomics/import/"
                className="product-landing__ctaGhost text-decoration-none d-inline-flex align-items-center"
              >
                <i className="fas fa-download me-2" aria-hidden />
                Import
              </ScrollAwareLink>
            </div>
          </div>

          {stories && Array.isArray(stories) && stories.length > 0 && paginatedStories && paginatedStories.length > 0 ? (
            <>
              <div className="my-studio__storyGrid">
                {paginatedStories.map((story) => (
                <article key={story.id} className="my-studio__storyCard">
                    {story.comic_image && typeof story.comic_image === 'string' && (
                      <div className="my-studio__storyCover">
                        <img src={story.comic_image} alt={story.title || 'Story cover'} />
                      </div>
                    )}

                    <div className="my-studio__storyBody">
                        <div className="d-flex justify-content-between align-items-center border-bottom">
                          <h5 className="subtext-btn-xs mb-0">{story.title || 'Untitled Story'}</h5>
                          <div className="text-muted subtext-btn-sm">
                            {(() => {
                              const createdDate = new Date(story.created_at);
                              const updatedDate = new Date(story.updated_at);
                              const isUpdated = updatedDate > createdDate;
                              return isUpdated 
                                ? `Updated: ${updatedDate.toLocaleDateString()}`
                                : `Created: ${createdDate.toLocaleDateString()}`;
                            })()}
                          </div>
                        </div>
                      
                      <p className="subtext-btn-sm text-muted mb-1 border-bottom">
                        {story.description}
                      </p>
                      
                      {/* Story Collaborators - TODO: Add collaborators to API */}
                      {/* <div className="mb-3">
                        <div className="subtext-btn-sm fw-bold mb-2">Collaborators:</div>
                        <div className="d-flex flex-wrap gap-1">
                          {story.collaborators?.map((collaborator) => (
                            <span key={collaborator.id} className={`badge bg-${getRoleColor(collaborator.role)}`}>
                              <i className={`${getRoleIcon(collaborator.role)} me-1`}></i>
                              {collaborator.first_name}
                            </span>
                          ))}
                        </div>
                      </div> */}
                      
                       <div className="text-muted subtext-btn-sm d-flex justify-content-between align-items-center mb-0 border-bottom pb-2">
                         <div>
                           <span className="me-2">
                             
                           Seasons: {isLoadingCounts ? (
                             <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                           ) : (
                             storyCounts[story.id]?.seasons || 0
                             )}
                           </span>
                           <span>
                             &nbsp;|
                             Episodes: {isLoadingCounts ? (
                             <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                           ) : (
                             storyCounts[story.id]?.episodes || 0
                           )}
                           </span>
                         </div>
                         <div className="d-flex gap-2">
                           <span className={`badge ${story.is_public ? 'bg-success' : 'bg-secondary'}`}>
                             {story.is_public ? 'Public' : 'Private'}
                           </span>
                           <span className="badge bg-success">
                             approved
                           </span>
                         </div>
                       </div>
                    </div>
                    
                    <div className="my-studio__storyFooter">
                      <p className="stories-landing__meta mb-0" aria-label="Story views">
                        <i className="fas fa-eye me-1" aria-hidden />
                        <span className="stories-landing__metaNum">{story.total_views || 0}</span> views
                      </p>
                      <ScrollAwareLink
                        to={`/immersivecomics/story/${story.id}/manage/`}
                        className="stories-landing__btnPrimary text-decoration-none d-inline-flex align-items-center"
                      >
                        <i className="fas fa-sliders-h me-2" aria-hidden />
                        Manage
                      </ScrollAwareLink>
                    </div>
                </article>
              ))}
              </div>
              {totalPages > 1 && (
                <nav className="my-studio__pagination" aria-label="Stories pagination">
                  <ul className="pagination mb-0">
                    <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                      <button
                        type="button"
                        className="page-link"
                        onClick={handlePrevPage}
                        disabled={currentPage === 1}
                      >
                        <i className="fas fa-chevron-left" aria-hidden /> Previous
                      </button>
                    </li>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <li key={page} className={`page-item ${currentPage === page ? 'active' : ''}`}>
                        <button type="button" className="page-link" onClick={() => handlePageChange(page)}>
                          {page}
                        </button>
                      </li>
                    ))}
                    <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                      <button
                        type="button"
                        className="page-link"
                        onClick={handleNextPage}
                        disabled={currentPage === totalPages}
                      >
                        Next <i className="fas fa-chevron-right" aria-hidden />
                      </button>
                    </li>
                  </ul>
                </nav>
              )}
            </>
          ) : (
            <div className="my-studio__empty">
              <div className="stories-landing__emptyIcon" aria-hidden>
                <i className="fas fa-book-open" />
              </div>
              <h3 className="product-landing__h2" style={{ fontSize: '1.25rem' }}>
                No stories yet
              </h3>
              <p className="product-landing__body" style={{ marginTop: '0.5rem' }}>
                Start creating your first collaborative story.
              </p>
              <ScrollAwareLink
                to="/immersivecomics/story/create/"
                className="stories-landing__btnPrimary mt-3 d-inline-flex text-decoration-none align-items-center"
              >
                <i className="fas fa-plus me-2" aria-hidden />
                Create your first story
              </ScrollAwareLink>
            </div>
          )}
        </div>
      </section>

      {/* Collaboration Requests Modal */}
      {showRequestsModal && (
        <div
          className="my-studio__modal modal show d-block"
          tabIndex={-1}
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <div className="modal-dialog modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header p-2">
                <h5 className="modal-title font-gillsans subtext">Collaboration Requests</h5>
                <button
                  type="button"
                  className="btn btn-sm btn-light border"
                  onClick={() => setShowRequestsModal(false)}
                  aria-label="Close"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <div className="modal-body font-quicksand p-2">
                {isLoadingRequests ? (
                  <div className="text-center">
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                  </div>
                ) : collaborationRequests.length > 0 ? (
                  <>
                    <p className="subtext-btn-sm text-muted mb-1">
                      {collaborationRequests.length} pending request{collaborationRequests.length > 1 ? 's' : ''} 
                    </p>
                    {collaborationRequests.map((request) => {
                      const requester = request.requester || request;
                      // Ensure requester has required fields
                      if (!requester) {
                        console.error('Request missing requester:', request);
                        return null;
                      }
                      const requesterName = requester.username || 'Unknown';
                      const requesterLastName = requester.last_name || '';
                      const requesterUsername = requester.username || 'unknown';
                      return (
                      <div 
                        key={request.id} 
                        className="border-bottom pb-0 mb-2"
                      >
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <div className="d-flex align-items-center gap-2">
                            <div className="fw-bold subtext-btn-sm">
                              @{requesterUsername}
                            </div>
                          </div>
                          <div className="text-muted subtext-btn-sm">
                            {new Date(request.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="d-flex justify-content-between align-items-center mt-1">
                          <span className={`badge bg-${getRoleColor(request.role)}`}>
                            {/* <i className={`${getRoleIcon(request.role)} me-1`}></i> */}
                            {request.role.replace('_', ' ').toUpperCase()}
                          </span>
                          <div className="d-flex gap-2">
                            <button
                              type="button"
                              className="btn btn-sm btn-success"
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                handleAcceptRequest(request.id);
                              }}
                            >
                              <i className="fas fa-check me-1"></i>Accept
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-danger"
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                handleDeclineRequest(request.id);
                              }}
                            >
                              <i className="fas fa-times me-1"></i>Decline
                            </button>
                          </div>
                        </div>
                        {request.message && (
                          <div className="mb-2 subtext-btn-sm">
                            <strong>Message:</strong> {request.message}
                          </div>
                        )}
                      </div>
                      );
                    })}
                  </>
                ) : (
                  <div className="text-center text-muted subtext-btn-sm">No pending requests</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyStudio;
