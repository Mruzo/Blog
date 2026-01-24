import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import Comic3DViewer from '../components/Comic3DViewer';
import MetaTags from '../components/MetaTags';
import BackButton from '../components/BackButton';
import { apiService } from '../services/api';
import { collaborationService } from '../services/collaborationService';
import { Story } from '../services/api';

interface Studio {
  id: number;
  name: string;
  description: string;
  owner?: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
  } | number;
  collaborators?: Array<{
    id: number;
    username?: string;
    first_name?: string;
    last_name?: string;
    role?: string;
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
  user: number;
  user_username?: string;
  characters?: Character[];
}

const StudioDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const studioId = id ? parseInt(id) : 0;

  const [studio, setStudio] = useState<Studio | null>(null);
  const [stories, setStories] = useState<Comic[]>([]);
  const [storyData, setStoryData] = useState<Map<number, {seasons: any[], episodes: any[], dialogues: any[], collaborators: any[]}>>(new Map());
  const [loading, setLoading] = useState(true);
  const [isLoadingStoryData, setIsLoadingStoryData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Load current user
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (token) {
          const user = await apiService.getCurrentUser();
          console.log('StudioDetail: Current user loaded:', user);
          setCurrentUser(user);
        }
      } catch (err) {
        // User not authenticated or failed to load
        console.log('StudioDetail: User not authenticated or failed to load user:', err);
      }
    };

    loadCurrentUser();
  }, []);

  // Load studio data
  useEffect(() => {
    const loadStudio = async () => {
      if (!studioId) return;
      
      try {
        setLoading(true);
        const studioData = await apiService.getStudio(studioId);
        setStudio(studioData);
      } catch (err: any) {
        console.error('Error loading studio:', err);
        setError('Failed to load studio');
      } finally {
        setLoading(false);
      }
    };

    loadStudio();
  }, [studioId]);

  // Load published stories for this studio (stories owned by studio owner or with studio collaborators)
  useEffect(() => {
    const loadStudioStories = async () => {
      if (!studio || !studio.owner) return;

      try {
        // Get owner ID
        const ownerId = typeof studio.owner === 'object' ? studio.owner.id : studio.owner;

        // Get all published stories
        const allStories = await apiService.getPublicStories();
        
        // Filter stories where:
        // 1. Story owner matches studio owner, OR
        // 2. Story has collaborators that belong to this studio
        const studioStories = allStories.filter((story: Story) => {
          // Check if story owner matches studio owner
          if (story.user === ownerId) {
            return true;
          }
          
          // TODO: Check if any studio collaborators are story collaborators
          // This would require checking the story's collaborators against the studio's collaborators
          // For now, we'll filter by owner only
          return false;
        });

        // Convert to Comic format
        const comicsData = await Promise.all(
          studioStories.map(async (story) => {
            let characters: any[] = [];
            
            // Try to load characters, but handle auth errors gracefully
            // Characters endpoint requires auth, so for public stories it may fail
            try {
              characters = await apiService.getCharacters(story.id);
            } catch (error: any) {
              // If 403/401, it's expected for public stories when not authenticated
              if (error?.response?.status === 403 || error?.response?.status === 401) {
                if (process.env.NODE_ENV === 'development') {
                  console.log(`[StudioDetail] Characters not available for public story ${story.id} (auth required)`);
                }
              } else {
                // Other errors are unexpected
                console.error(`[StudioDetail] Failed to load characters for story ${story.id}:`, error);
              }
            }
            
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
              characters: characters || []
            };
          })
        );

        setStories(comicsData);
      } catch (err) {
        console.error('Error loading studio stories:', err);
      }
    };

    loadStudioStories();
  }, [studio]);

  // Load seasons, episodes, and dialogues for each story
  useEffect(() => {
    const loadStoryData = async () => {
      if (!stories || stories.length === 0) {
        setIsLoadingStoryData(false);
        return;
      }

      setIsLoadingStoryData(true);
      const newStoryData = new Map<number, {seasons: any[], episodes: any[], dialogues: any[], collaborators: any[]}>();
      
      const results = await Promise.allSettled(
        stories.map(async (story) => {
          try {
            // Load seasons - may require auth, handle gracefully
            let seasonsData: any[] = [];
            try {
              seasonsData = await apiService.getSeasons(story.id);
            } catch (error: any) {
              // If 403/401, it's expected for public stories when not authenticated
              if (error?.response?.status === 403 || error?.response?.status === 401) {
                if (process.env.NODE_ENV === 'development') {
                  console.log(`[StudioDetail] Seasons not available for public story ${story.id} (auth required)`);
                }
              } else {
                console.error(`[StudioDetail] Failed to load seasons for story ${story.id}:`, error);
              }
              // Continue with empty seasons - story will still display
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
            
            // Load episodes for all seasons in parallel - may require auth
            let allEpisodes: any[] = [];
            try {
              const episodePromises = seasonsData.map(season => apiService.getEpisodes(season.id));
              const episodeResults = await Promise.all(episodePromises);
              allEpisodes = episodeResults.flat();
            } catch (error: any) {
              // If 403/401, it's expected for public stories when not authenticated
              if (error?.response?.status === 403 || error?.response?.status === 401) {
                if (process.env.NODE_ENV === 'development') {
                  console.log(`[StudioDetail] Episodes not available for public story ${story.id} (auth required)`);
                }
              } else {
                console.error(`[StudioDetail] Failed to load episodes for story ${story.id}:`, error);
              }
              // Continue with empty episodes
            }
            
            // Load dialogues for all episodes in parallel - may require auth
            let allDialogues: any[] = [];
            try {
              const dialoguePromises = allEpisodes.map(episode => apiService.getDialogues(episode.id));
              const dialogueResults = await Promise.all(dialoguePromises);
              allDialogues = dialogueResults.flat();
            } catch (error: any) {
              // If 403/401, it's expected for public stories when not authenticated
              if (error?.response?.status === 403 || error?.response?.status === 401) {
                if (process.env.NODE_ENV === 'development') {
                  console.log(`[StudioDetail] Dialogues not available for public story ${story.id} (auth required)`);
                }
              } else {
                console.error(`[StudioDetail] Failed to load dialogues for story ${story.id}:`, error);
              }
              // Continue with empty dialogues
            }
            
            let collaboratorsData: any[] = [];
            try {
              const allCollaborators = await collaborationService.getCollaborators(story.id);
              const isAuthenticated = !!localStorage.getItem('authToken');
              collaboratorsData = (allCollaborators || []).filter((collab: any) => {
                if (collab.user && collab.user.username) {
                  return true;
                }
                if (isAuthenticated) {
                  if (collab.invitee_user?.username || collab.invitee_email) {
                    return true;
                  }
                } else {
                  if (collab.status === 'accepted') {
                    if (collab.invitee_user?.username || collab.invitee_email) {
                      return true;
                    }
                  }
                }
                return false;
              });
            } catch (collabError: any) {
              // If 403/401, it's expected for public stories when not authenticated
              if (collabError.response?.status === 403 || collabError.response?.status === 401) {
                if (process.env.NODE_ENV === 'development') {
                  console.log(`[StudioDetail] Collaborators not available for public story ${story.id} (auth required)`);
                }
              } else {
                console.error(`[StudioDetail] Failed to load collaborators for story ${story.id}:`, collabError);
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
          } catch (error: any) {
            // Catch any other unexpected errors
            if (error?.response?.status !== 403 && error?.response?.status !== 401) {
              console.error(`[StudioDetail] Failed to load data for story ${story.id}:`, error);
            }
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
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          newStoryData.set(result.value.storyId, result.value.data);
        } else {
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

  // Get owner info - memoize to prevent dependency issues
  const ownerInfo = useMemo(() => {
    if (!studio) return null;
    return typeof studio.owner === 'object' && studio.owner !== null
      ? studio.owner
      : { id: typeof studio.owner === 'number' ? studio.owner : 0, username: 'Unknown' };
  }, [studio]);

  // Debug: Log comparison values
  useEffect(() => {
    if (currentUser && ownerInfo) {
      console.log('StudioDetail: Current user:', currentUser);
      console.log('StudioDetail: Owner info:', ownerInfo);
      console.log('StudioDetail: Current user ID:', currentUser.id, typeof currentUser.id);
      console.log('StudioDetail: Owner info ID:', ownerInfo.id, typeof ownerInfo.id);
      console.log('StudioDetail: IDs match (strict)?', currentUser.id === ownerInfo.id);
      console.log('StudioDetail: IDs match (coerce)?', Number(currentUser.id) === Number(ownerInfo.id));
    }
  }, [currentUser, ownerInfo]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error || !studio) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger" role="alert">
          <i className="fas fa-exclamation-triangle me-2"></i>
          {error || 'Studio not found'}
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-4" style={{ maxWidth: '1200px' }}>
      <MetaTags
        title={`${studio.name} - Studio Stories - JustVybz`}
        description={studio.description || `Browse published stories from ${studio.name}`}
        keywords={`${studio.name}, studio, 3D comics, published stories, interactive narratives`}
        image={studio.avatar_url}
      />

      {/* Back Button */}
      <div className="mb-3">
        <BackButton to="/immersivecomics/studios/" />
      </div>

      {/* Studio Header */}
      <div className="card border-0 shadow-sm mb-4 position-relative">
        {/* Gear Icon - Show if current user is the studio owner */}
        {currentUser && ownerInfo && (Number(currentUser.id) === Number(ownerInfo.id)) && (
          <Link
            to="/immersivecomics/my-studio/"
            className="position-absolute"
            style={{ top: '1rem', right: '1rem', zIndex: 10 }}
            title="My Studio"
          >
            <button
              className="btn btn-outline-secondary btn-sm"
              style={{ borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <i className="fas fa-cog"></i>
            </button>
          </Link>
        )}
        <div className="card-body p-4">
          <div className="row align-items-center">
            <div className="col-md-2 text-center mb-3 mb-md-0">
              {studio.avatar_url ? (
                <img 
                  src={studio.avatar_url} 
                  alt={studio.name}
                  className="img-fluid rounded-circle"
                  style={{ width: '100px', height: '100px', objectFit: 'cover' }}
                />
              ) : (
                <div 
                  className="rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center mx-auto"
                  style={{ width: '100px', height: '100px' }}
                >
                  <i className="fas fa-building fa-3x"></i>
                </div>
              )}
            </div>
            <div className="col-md-10">
              <h1 className="subtext-btn mb-2">{studio.name}</h1>
              <p className="subtext-btn-sm text-muted mb-3">{studio.description}</p>
              <div className="d-flex flex-wrap gap-3 align-items-center">
                <div>
                  <i className="fas fa-crown text-warning me-2"></i>
                  <span className="subtext-btn-sm">
                    <strong>Owner:</strong> @{ownerInfo?.username || 'Unknown'}
                  </span>
                </div>
                {studio.collaborators && studio.collaborators.length > 0 && (
                  <div>
                    <i className="fas fa-users text-info me-2"></i>
                    <span className="subtext-btn-sm">
                      <strong>Team:</strong> {studio.collaborators.length} members
                    </span>
                  </div>
                )}
                <div>
                  <i className="fas fa-book-open text-primary me-2"></i>
                  <span className="subtext-btn-sm">
                    <strong>Stories:</strong> {stories.length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stories Section */}
      <div className="mb-4">
        <h2 className="subtext-btn mb-3">Published Stories</h2>
        
        {isLoadingStoryData ? (
          <LoadingSpinner />
        ) : stories.length === 0 ? (
          <div className="text-center py-5">
            <div className="card border-0 shadow-sm">
              <div className="card-body py-5">
                <i className="fas fa-book-open fa-4x text-muted mb-3"></i>
                <h5 className="subtext-btn-sm text-muted mb-3">No published stories yet</h5>
                <p className="subtext-btn-sm text-muted">
                  This studio hasn't published any stories yet.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="row">
            {stories.map((comic) => (
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
                      <h5 className="subtext-btn-sm mb-1">
                        {comic.title}
                        {storyData.has(comic.id) && (() => {
                          const storySeasons = storyData.get(comic.id)?.seasons || [];
                          const storyEpisodes = storyData.get(comic.id)?.episodes || [];
                          const firstEpisode = storyEpisodes[0];
                          if (firstEpisode && storySeasons.length > 0) {
                            const season = storySeasons.find((s: any) => s.id === firstEpisode.season);
                            if (season) {
                              return <span className="text-muted"> - Season {season.season_number}</span>;
                            }
                          }
                          if (storySeasons.length > 0) {
                            return <span className="text-muted"> - Season {storySeasons[0].season_number}</span>;
                          }
                          return null;
                        })()}
                      </h5>
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
                    
                    {/* Collaborators Section */}
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
                                  {(() => {
                                    // Group collaborators by user (since one user can have multiple roles)
                                    const collaboratorsByUser = new Map();
                                    collaborators.forEach((collaborator: any) => {
                                      const userId = collaborator.user?.id || collaborator.invitee_user?.id;
                                      const userEmail = collaborator.invitee_email;
                                      const key = userId || userEmail;
                                      if (!key) return;
                                      
                                      if (!collaboratorsByUser.has(key)) {
                                        collaboratorsByUser.set(key, {
                                          user: collaborator.user || collaborator.invitee_user,
                                          email: collaborator.invitee_email,
                                          roles: []
                                        });
                                      }
                                      if (collaborator.role) {
                                        collaboratorsByUser.get(key).roles.push(collaborator.role);
                                      }
                                    });
                                    
                                    return Array.from(collaboratorsByUser.values()).map((collab: any) => {
                                      let displayName: string;
                                      if (collab.user) {
                                        displayName = `@${collab.user.username}`;
                                      } else {
                                        displayName = collab.email || 'Unknown';
                                      }
                                      const key = collab.user?.id || collab.email;
                                      return (
                                        <span key={key} className="badge bg-primary subtext-btn-sm me-1">
                                          {displayName} {collab.roles.length > 1 && `(${collab.roles.length} roles)`}
                                        </span>
                                      );
                                    });
                                  })()}
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
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudioDetail;

