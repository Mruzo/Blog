import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import Comic3DViewer from '../components/Comic3DViewer';
import { useApi } from '../contexts/ApiContext';
import apiService from '../services/api';
import { collaborationService } from '../services/collaborationService';

interface Character {
  id: number;
  name: string;
  bio: string;
  personality: string;
  love_interest: string;
  user: number;
  created_at: string;
  updated_at: string;
}

interface Comic {
  id: number;
  title: string;
  description: string;
  comic_image: string | File | null;
  is_public: boolean;
  moderation_status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
  user: number; // User ID
  user_username?: string; // Username of the owner
  characters?: Character[]; // Characters associated with this story
}

const Stories: React.FC = () => {
  const { stories, loadPublicStories, isLoading, error } = useApi();
  const [comics, setComics] = useState<Comic[]>([]);
  const [storyData, setStoryData] = useState<Map<number, {seasons: any[], episodes: any[], dialogues: any[], collaborators: any[]}>>(new Map());
  const [isLoadingStoryData, setIsLoadingStoryData] = useState(false);

  // Check if user is authenticated
  const isAuthenticated = () => {
    const token = localStorage.getItem('authToken');
    return !!token;
  };

  // Handle create story button click
  const handleCreateStoryClick = (e: React.MouseEvent) => {
    if (!isAuthenticated()) {
      e.preventDefault();
      // Store the intended destination in sessionStorage for post-login redirect
      sessionStorage.setItem('redirectAfterLogin', '/immersivecomics/story/create/');
      // Redirect to login with return URL (Django supports 'next' parameter)
      window.location.href = `/login/?next=${encodeURIComponent('/immersivecomics/story/create/')}`;
    }
    // If authenticated, let the Link component handle navigation normally
  };

  useEffect(() => {
    const fetchComics = async () => {
      try {
        await loadPublicStories();
      } catch (err) {
        console.error('Failed to load public stories:', err);
      }
    };

    fetchComics();
  }, [loadPublicStories]);

  // Update comics when stories change
  useEffect(() => {
    if (stories && Array.isArray(stories)) {
      // Convert stories to comics format for display (all stories from API are already public)
      const loadComicsWithCharacters = async () => {
        const comicsData = await Promise.all(
          stories.map(async (story) => {
            try {
              // Load characters for each story
              const characters = await apiService.getCharacters(story.id);
              
              return {
                id: story.id,
                title: story.title,
                description: story.description,
                comic_image: story.comic_image || null,
                is_public: story.is_public,
                moderation_status: 'approved' as const, // Published stories are considered approved
                created_at: story.created_at,
                updated_at: story.updated_at,
                user: story.user,
                user_username: story.user_username || 'Unknown',
                characters: characters || []
              };
            } catch (error) {
              console.error(`Failed to load characters for story ${story.id}:`, error);
              return {
                id: story.id,
                title: story.title,
                description: story.description,
                comic_image: story.comic_image || null,
                is_public: story.is_public,
                moderation_status: 'approved' as const,
                created_at: story.created_at,
                updated_at: story.updated_at,
                user: story.user,
                user_username: story.user_username || 'Unknown',
                characters: []
              };
            }
          })
        );
        setComics(comicsData);
      };
      
      loadComicsWithCharacters();
    } else {
      // If stories is not an array, set empty array
      setComics([]);
    }
  }, [stories]);

  // Load seasons, episodes, and dialogues for each story (deferred to improve initial load)
  useEffect(() => {
    const loadStoryData = async () => {
      if (!stories || !Array.isArray(stories)) {
        setIsLoadingStoryData(false);
        return;
      }

      setIsLoadingStoryData(true);
      const newStoryData = new Map<number, {seasons: any[], episodes: any[], dialogues: any[], collaborators: any[]}>();
      
      // Use Promise.allSettled to handle individual failures gracefully
      const results = await Promise.allSettled(
        stories.map(async (story) => {
          try {
            // Load seasons
            const seasonsData = await apiService.getSeasons(story.id);
            
            // Load episodes for all seasons in parallel
            const episodePromises = seasonsData.map(season => apiService.getEpisodes(season.id));
            const episodeResults = await Promise.all(episodePromises);
            const allEpisodes = episodeResults.flat();
            
            // Load dialogues for all episodes in parallel
            const dialoguePromises = allEpisodes.map(episode => apiService.getDialogues(episode.id));
            const dialogueResults = await Promise.all(dialoguePromises);
            const allDialogues = dialogueResults.flat();
            
            // Load collaborators for this story
            let collaboratorsData: any[] = [];
            try {
              // Try to load collaborators - might fail if story is private and user is not authenticated
              // This is okay, we'll just show no collaborators
              const allCollaborators = await collaborationService.getCollaborators(story.id);
              
              // Filter collaborators - for public stories, show only active/accepted
              // StoryCollaborator objects: always active (have user field directly)
              // CollaborationInvite objects: show all if authenticated (like My Studio), or only accepted if not authenticated
              const isAuthenticated = !!localStorage.getItem('authToken');
              collaboratorsData = (allCollaborators || []).filter((collab: any) => {
                // StoryCollaborator: has user field (nested with username) - always show active ones
                if (collab.user && collab.user.username) {
                  return true;
                }
                // CollaborationInvite: show based on authentication status
                if (isAuthenticated) {
                  // If authenticated, show ALL invites (like My Studio does) - pending, accepted, etc.
                  if (collab.invitee_user?.username || collab.invitee_email) {
                    return true;
                  }
                } else {
                  // If not authenticated, only show accepted invites
                  if (collab.status === 'accepted') {
                    if (collab.invitee_user?.username || collab.invitee_email) {
                      return true;
                    }
                  }
                }
                return false;
              });
            } catch (collabError: any) {
              // If 401 or 403, it means we can't access collaborators (private story or not authenticated)
              // For public stories, this shouldn't happen, but we'll handle it gracefully
              if (collabError.response?.status !== 401 && collabError.response?.status !== 403) {
                console.error(`Failed to load collaborators for story ${story.id}:`, collabError);
              }
              collaboratorsData = [];
            }
            
            return {
              storyId: story.id,
              data: {
                seasons: seasonsData,
                episodes: allEpisodes,
                dialogues: allDialogues,
                collaborators: collaboratorsData
              }
            };
          } catch (error) {
            console.error(`Failed to load data for story ${story.id}:`, error);
            return {
              storyId: story.id,
              data: {
                seasons: [],
                episodes: [],
                dialogues: [],
                collaborators: []
              }
            };
          }
        })
      );
      
      // Process results
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          newStoryData.set(result.value.storyId, result.value.data);
        } else {
          // Fallback for rejected promises
          const story = stories[index];
          if (story) {
                  newStoryData.set(story.id, {
                    seasons: [],
                    episodes: [],
                    dialogues: [],
                    collaborators: []
                  });
          }
        }
      });
      
      setStoryData(newStoryData);
      setIsLoadingStoryData(false);
    };
    
    loadStoryData();
  }, [stories]);

  if (isLoading || isLoadingStoryData) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger" role="alert">
          <i className="fas fa-exclamation-triangle me-2"></i>
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-4" style={{ maxWidth: '1200px' }}>
      {/* <PageHeader
        title="Published Stories"
        description="Browse all published 3D comic stories"
        actions={
          <SmallButton to="/immersivecomics/story/create/">
            <i className="fas fa-plus me-1"></i>Create New Story
          </SmallButton>
        }
      /> */}

      {comics.length === 0 ? (
        <div className="text-center py-5">
          <div className="card border-0 shadow-sm">
            <div className="card-body py-5">
              <i className="fas fa-book-open fa-4x text-muted mb-3"></i>
              <h5 className="subtext-btn-sm text-muted mb-3">No published stories yet</h5>
              <p className="subtext-btn-sm text-muted mb-4">
                No published stories are available. Create and publish your first 3D comic story.
              </p>
              <Link 
                to="/immersivecomics/story/create/" 
                className="btn btn-primary subtext-btn-sm"
              >
                <i className="fas fa-plus me-1"></i>Create Your First Story
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="row">
          {comics.map((comic) => (
            <div key={comic.id} className="col-lg-4 col-md-6 mb-4">
              <div className="card h-100 border-0 shadow-sm">
                {/* Card Header with Username and Date */}
                <div className="card-header bg-transparent border-0 p-1">
                  <div className="d-flex justify-content-between align-items-center mb-2 border-bottom">
                    <div className="subtext-btn-xs text-dark font-weight-bold">
                      <i className="fas fa-user me-1"></i> {comic.user_username || 'Unknown'}
                    </div>
                    <div className="subtext-btn-xs text-muted">
                      {comic.updated_at !== comic.created_at ? (
                        <>Edited: {new Date(comic.updated_at).toLocaleDateString()}</>
                      ) : (
                        <>Created: {new Date(comic.created_at).toLocaleDateString()}</>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="card-body p-1">
                  <div className="d-flex justify-content-between align-items-start mb-0">
                    <h5 className="subtext-btn-sm mb-1">{comic.title}</h5>
                    <div className="dropdown">
                      {/* <button 
                        className="btn btn-sm btn-outline-secondary" 
                        type="button" 
                        data-bs-toggle="dropdown"
                      >
                        <i className="fas fa-ellipsis-v"></i>
                      </button> */}
                      <ul className="dropdown-menu">
                        <li>
                          <Link className="dropdown-item" to={`/immersivecomics/story/${comic.id}/edit/`}>
                            <i className="fas fa-edit me-2"></i>Edit
                          </Link>
                        </li>
                        <li>
                          <Link className="dropdown-item" to={`/immersivecomics/story/${comic.id}/manage/`}>
                            <i className="fas fa-cog me-2"></i>Manage
                          </Link>
                        </li>
                      </ul>
                    </div>
                  </div>
                  
                  <p className="subtext-btn-sm text-muted mb-3">
                    {comic.description}
                  </p>
                  
                  {/* 3D Comic Viewer - Read-only mode */}
                  {storyData.has(comic.id) && (
                    <div className="mb-3">
                      <Comic3DViewer
                        episodes={storyData.get(comic.id)?.episodes || []}
                        dialogues={storyData.get(comic.id)?.dialogues || []}
                        seasons={storyData.get(comic.id)?.seasons || []}
                        storyId={comic.id}
                        readOnly={true}
                      />
                    </div>
                  )}
                  
                  {/* Collaborators Section - Below 3D Viewer */}
                  {storyData.has(comic.id) && (
                    <div className="mb-3">
                      <div className="card border-0 shadow-sm">
                        <div className="card-header bg-transparent border-bottom p-2">
                          <h6 className="subtext-btn-sm mb-0">
                            <i className="fas fa-users me-2"></i>
                            Collaborators ({storyData.get(comic.id)?.collaborators?.length || 0})
                          </h6>
                        </div>
                        <div className="card-body p-2">
                          {(() => {
                            const collaborators = storyData.get(comic.id)?.collaborators || [];
                            return collaborators.length > 0 ? (
                              <div className="d-flex flex-wrap gap-2">
                                {collaborators.map((collaborator: any) => {
                                  // Handle both StoryCollaborator (user field) and CollaborationInvite (invitee_user field)
                                  // Match the display logic from CollaboratorsList component
                                  let displayName: string;
                                  if (collaborator.user) {
                                    // StoryCollaborator: has user field directly
                                    displayName = `@${collaborator.user.username}`;
                                  } else if (collaborator.invitee_user) {
                                    // CollaborationInvite with user: show @username
                                    displayName = `@${collaborator.invitee_user.username}`;
                                  } else {
                                    // CollaborationInvite without user: show email
                                    displayName = collaborator.invitee_email || 'Unknown';
                                  }
                                  const key = collaborator.id || `${collaborator.user?.id || collaborator.invitee_user?.id || collaborator.invitee_email}-${collaborator.role || 'collaborator'}`;
                                  return (
                                    <span key={key} className="badge bg-primary subtext-btn-sm">
                                      {displayName}
                                    </span>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="text-muted subtext-btn-sm">
                                No collaborators for this story.
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Hide badges for visitors */}
                  {/* <div className="d-flex gap-2 mb-3">
                    <span className={`badge ${comic.is_public ? 'bg-success' : 'bg-secondary'}`}>
                      {comic.is_public ? 'Public' : 'Private'}
                    </span>
                    <span className={`badge ${
                      comic.moderation_status === 'approved' ? 'bg-success' : 
                      comic.moderation_status === 'pending' ? 'bg-warning' : 'bg-danger'
                    }`}>
                      {comic.moderation_status}
                    </span>
                  </div> */}
                  
                  {/* Hide duplicate date info - already shown in header */}
                  {/* <div className="text-muted subtext-btn-sm">
                    <div>Created: {new Date(comic.created_at).toLocaleDateString()}</div>
                    <div>Updated: {new Date(comic.updated_at).toLocaleDateString()}</div>
                  </div> */}
                </div>
                
                {/* Hide Manage and Edit buttons for visitors - only show 3D viewer */}
                {/* <div className="card-footer bg-transparent border-0 pt-0">
                  <div className="d-flex gap-2">
                    <Link 
                      to={`/immersivecomics/story/${comic.id}/manage/`}
                      className="btn btn-outline-primary btn-sm subtext-btn-sm flex-fill"
                    >
                      <i className="fas fa-cog me-1"></i>Manage
                    </Link>
                    <Link 
                      to={`/immersivecomics/story/${comic.id}/edit/`}
                      className="btn btn-outline-secondary btn-sm subtext-btn-sm flex-fill"
                    >
                      <i className="fas fa-edit me-1"></i>Edit
                    </Link>
                  </div>
                </div> */}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Floating Action Button */}
      <Link 
        to={isAuthenticated() ? "/immersivecomics/story/create/" : "#"}
        className="btn btn-primary rounded-circle position-fixed"
        style={{ 
          bottom: '20px', 
          right: '20px', 
          width: '60px', 
          height: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}
        onClick={handleCreateStoryClick}
      >
        <i className="fas fa-plus fa-lg"></i>
      </Link>
    </div>
  );
};

export default Stories;