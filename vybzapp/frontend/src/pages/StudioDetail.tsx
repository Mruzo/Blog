import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import Comic3DViewer from '../components/Comic3DViewer';
import MetaTags from '../components/MetaTags';
import BackButton from '../components/BackButton';
import MessagePopup from '../components/MessagePopup';
import { apiService, type Studio } from '../services/api';
import { collaborationService } from '../services/collaborationService';
import { filterPublicStoriesForStudio } from '../utils/studioScope';

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
  total_views?: number;
  created_at: string;
  updated_at: string;
  user: number;
  studio?: number | null;
  user_username?: string;
  characters?: Character[];
}

type StudioStoryData = {
  seasons: any[];
  episodes: any[];
  dialogues: any[];
  collaborators: any[];
  comments: any[];
};

const StudioDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const studioId = id ? parseInt(id) : 0;

  const [studio, setStudio] = useState<Studio | null>(null);
  const [stories, setStories] = useState<Comic[]>([]);
  const [storyData, setStoryData] = useState<Map<number, StudioStoryData>>(new Map());
  const [loading, setLoading] = useState(true);
  const [isLoadingStoryData, setIsLoadingStoryData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'success' | 'danger' | 'warning' | 'info'>('success');
  const [showMessage, setShowMessage] = useState(false);

  const isOwner = useMemo(() => {
    if (!studio || !currentUser) return false;
    const ownerId = typeof studio.owner === 'object' ? studio.owner.id : studio.owner;
    return Number(currentUser.id) === Number(ownerId);
  }, [studio, currentUser]);

  const isMember = useMemo(() => {
    if (!studio || !currentUser) return false;
    if (isOwner) return true;
    const uid = Number(currentUser.id);
    const collabs = studio.collaborators || [];
    return collabs.some((c: any) => {
      if (c?.is_active === false) return false;
      const idFromNested = c?.user?.id;
      const idFromFlat = c?.id;
      const candidate = idFromNested ?? idFromFlat;
      return candidate != null && Number(candidate) === uid;
    });
  }, [studio, currentUser, isOwner]);

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
        const allStories = await apiService.getPublicStories();
        
        // Approved public stories owned by the studio owner or an active studio collaborator
        const studioStories = filterPublicStoriesForStudio(allStories, studio);

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
              moderation_status: story.moderation_status,
              created_at: story.created_at,
              updated_at: story.updated_at,
              user: story.user,
              studio: story.studio,
              user_username: story.user_username || 'Unknown',
              total_views: story.total_views || 0,
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
      const newStoryData = new Map<number, StudioStoryData>();
      
      const results = await Promise.allSettled(
        stories.map(async (story) => {
          try {
            // Load seasons - may require auth, handle gracefully
            let seasonsData: any[] = [];
            try {
              seasonsData = await apiService.getSeasons(story.id, { catalogue: true });
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
                  collaborators: [],
                  comments: []
                }
              };
            }
            
            // Load episodes for all seasons in parallel - may require auth
            let allEpisodes: any[] = [];
            try {
              const episodePromises = seasonsData.map(season =>
                apiService.getEpisodes(season.id, { catalogue: true })
              );
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
            
            let allComments: any[] = [];
            try {
              const commentPromises = seasonsData.map(season => apiService.getSeasonComments(season.id));
              const commentResults = await Promise.all(commentPromises);
              allComments = commentResults.flat();
            } catch (commentError: any) {
              if (commentError?.response?.status !== 403 && commentError?.response?.status !== 401) {
                console.error(`[StudioDetail] Failed to load comments for story ${story.id}:`, commentError);
              }
              allComments = [];
            }

            return {
              storyId: story.id,
              data: {
                seasons: seasonsData,
                episodes: allEpisodes,
                dialogues: allDialogues,
                collaborators: collaboratorsData,
                comments: allComments
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
                collaborators: [],
                comments: []
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
              collaborators: [],
              comments: []
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

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error || !studio) {
    return (
      <div className="product-landing stories-landing studio-detail">
        <div className="product-landing__container product-landing__section">
          <div className="store-page__error" role="alert">
            <i className="fas fa-exclamation-triangle" aria-hidden />
            <span>{error || 'Studio not found'}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="product-landing stories-landing studio-detail">
      <MetaTags
        title={`${studio.name} - Studio Stories - JustVybz`}
        description={studio.description || `Browse published stories from ${studio.name}`}
        keywords={`${studio.name}, studio, 3D comics, published stories, interactive narratives`}
        image={studio.avatar_url}
      />

      <MessagePopup
        message={message}
        type={messageType}
        show={showMessage}
        onClose={() => setShowMessage(false)}
        duration={3000}
      />

      <section className="product-landing__section">
        <div className="product-landing__container">
          <div className="studio-detail__backRow">
            <BackButton to="/immersivecomics/studios/" />
          </div>
        </div>
      </section>

      <section className="product-landing__section product-landing__hero">
        <div className="product-landing__container">
          <div className="studio-detail__heroCard">
            {currentUser && ownerInfo && Number(currentUser.id) === Number(ownerInfo.id) && (
              <Link
                to="/immersivecomics/my-studio/"
                className="studio-detail__gearLink"
                title="My Studio"
                aria-label="My Studio settings"
              >
                <i className="fas fa-cog" aria-hidden />
              </Link>
            )}

            <div className="studio-detail__heroGrid">
              <div>
                {studio.avatar_url ? (
                  <img src={studio.avatar_url} alt={studio.name} className="studio-detail__avatar" />
                ) : (
                  <div className="studio-detail__avatarPlaceholder" aria-hidden>
                    <i className="fas fa-building" />
                  </div>
                )}
              </div>
              <div className="studio-detail__heroContent">
                <p className="product-landing__eyebrow">Studio</p>
                <h1 className="product-landing__h1">{studio.name}</h1>
                {studio.description ? (
                  <p className="product-landing__lead" style={{ maxWidth: '52ch', marginTop: '0.65rem' }}>
                    {studio.description}
                  </p>
                ) : null}

                <div className="studio-detail__metaRow">
                  <span>
                    <strong>Owner</strong> @{ownerInfo?.username || 'Unknown'}
                  </span>
                  {studio.collaborators && studio.collaborators.length > 0 ? (
                    <span>
                      <strong>Team</strong> {studio.collaborators.length} members
                    </span>
                  ) : null}
                  <span>
                    <strong>Stories</strong> {stories.length}
                  </span>
                  <span>
                    <strong>Views</strong> {(studio.total_episode_views ?? 0).toLocaleString()}
                  </span>
                  <span>
                    <strong>Comments</strong> {(studio.total_comments ?? 0).toLocaleString()}
                  </span>
                </div>

                {currentUser ? (
                  <div className="studio-detail__actions">
                    <Link
                      to={`/immersivecomics/?studio=${studio.id}`}
                      className="stories-landing__btnPrimary"
                      title="View this studio's published stories in the catalog"
                    >
                      <i className="fas fa-eye me-2" aria-hidden />
                      View stories
                    </Link>
                    <button
                      type="button"
                      className="product-landing__ctaGhost"
                      style={isMember ? { opacity: 0.55, cursor: 'not-allowed' } : undefined}
                      disabled={isMember}
                      title={
                        isOwner
                          ? 'You are the owner of this studio'
                          : isMember
                            ? 'You are already a member of this studio'
                            : 'Request to collaborate with this studio'
                      }
                      onClick={async () => {
                        if (isOwner) {
                          setMessage('You are the owner of this studio!');
                          setMessageType('info');
                          setShowMessage(true);
                          return;
                        }
                        if (isMember) {
                          setMessage('You are already a member of this studio!');
                          setMessageType('info');
                          setShowMessage(true);
                          return;
                        }
                        try {
                          await apiService.createStudioCollaborationRequest(studio.id, {
                            role: 'writer',
                            message: '',
                          });
                          setMessage('Collaboration request sent! The studio owner will review it.');
                          setMessageType('success');
                          setShowMessage(true);
                        } catch (e: any) {
                          const errorMessage =
                            e?.response?.data?.detail || e?.message || 'Failed to send collaboration request';
                          setMessage(errorMessage);
                          setMessageType('danger');
                          setShowMessage(true);
                        }
                      }}
                    >
                      <i
                        className={`fas ${isOwner ? 'fa-crown' : isMember ? 'fa-check-circle' : 'fa-handshake'} me-2`}
                        aria-hidden
                      />
                      {isOwner ? 'Mine' : isMember ? 'Member' : 'Collaborate'}
                    </button>
                  </div>
                ) : (
                  <div className="studio-detail__actions">
                    <Link to="/login/" className="stories-landing__textLink">
                      <i className="fas fa-sign-in-alt me-1" aria-hidden />
                      Log in to collaborate
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="product-landing__section">
        <div className="product-landing__container">
          <h2 className="product-landing__h2 studio-detail__storiesHeading">Published stories</h2>
          <p className="product-landing__body studio-detail__storiesLead">
            Stories published by this studio's owner and collaborators.
          </p>

          {isLoadingStoryData ? (
            <div className="store-page__loadingWrap" aria-busy="true">
              <LoadingSpinner />
            </div>
          ) : stories.length === 0 ? (
            <div className="stories-landing__empty">
              <div className="stories-landing__emptyIcon" aria-hidden>
                <i className="fas fa-book-open" />
              </div>
              <h3 className="product-landing__h2" style={{ fontSize: '1.25rem' }}>
                No published stories yet
              </h3>
              <p className="product-landing__body" style={{ marginTop: '0.5rem' }}>
                This studio has not published any stories yet.
              </p>
            </div>
          ) : (
            <div
              className={
                stories.length === 1
                  ? 'stories-landing__grid stories-landing__grid--single'
                  : 'stories-landing__grid'
              }
            >
              {stories.map((comic) => (
                <article key={comic.id} className="stories-landing__card">
                  <div className="stories-landing__cardBody">
                    <div className="stories-landing__cardMeta">
                      <span>
                        <i className="fas fa-user me-1" aria-hidden />
                        <strong>{comic.user_username || 'Unknown'}</strong>
                      </span>
                      <span aria-hidden>·</span>
                      <span>
                        {comic.updated_at !== comic.created_at ? (
                          <>Updated {new Date(comic.updated_at).toLocaleDateString()}</>
                        ) : (
                          <>Posted {new Date(comic.created_at).toLocaleDateString()}</>
                        )}
                      </span>
                    </div>

                    <h3 className="stories-landing__cardTitle">
                      {comic.title}
                      {storyData.has(comic.id) &&
                        (() => {
                          const storySeasons = storyData.get(comic.id)?.seasons || [];
                          const storyEpisodes = storyData.get(comic.id)?.episodes || [];
                          const firstEpisode = storyEpisodes[0];
                          if (firstEpisode && storySeasons.length > 0) {
                            const season = storySeasons.find((s: any) => s.id === firstEpisode.season);
                            if (season) {
                              return (
                                <span className="stories-landing__cardTitleSuffix">
                                  {' '}
                                  · Season {season.season_number}
                                </span>
                              );
                            }
                          }
                          if (storySeasons.length > 0) {
                            return (
                              <span className="stories-landing__cardTitleSuffix">
                                {' '}
                                · Season {storySeasons[0].season_number}
                              </span>
                            );
                          }
                          return null;
                        })()}
                    </h3>

                    {comic.description ? (
                      <p className="studio-detail__storyDesc">{comic.description}</p>
                    ) : null}
                  </div>

                  {storyData.has(comic.id) && (
                    <div className="stories-landing__engagementStrip" aria-label="Story engagement stats">
                      <p className="stories-landing__meta mb-0" aria-label="Total story views">
                        <span className="stories-landing__metaStrong">
                          {(
                            comic.total_views ??
                            storyData.get(comic.id)!.episodes.reduce(
                              (total: number, episode: any) => total + (episode.view_count || 0),
                              0
                            )
                          ).toLocaleString()}
                        </span>{' '}
                        views
                      </p>
                      <p className="stories-landing__meta mb-0" aria-label="Total story comments">
                        <span className="stories-landing__metaStrong">
                          {(storyData.get(comic.id)?.comments.length || 0).toLocaleString()}
                        </span>{' '}
                        {(storyData.get(comic.id)?.comments.length || 0) === 1 ? 'comment' : 'comments'}
                      </p>
                    </div>
                  )}

                  {storyData.has(comic.id) && (
                    <div className="stories-landing__viewerWrap">
                      <Comic3DViewer
                        episodes={storyData.get(comic.id)?.episodes || []}
                        dialogues={storyData.get(comic.id)?.dialogues || []}
                        seasons={storyData.get(comic.id)?.seasons || []}
                        storyId={comic.id}
                        readOnly={true}
                      />
                    </div>
                  )}

                  {storyData.has(comic.id) && (
                    <div className="stories-landing__cardFooter">
                    <div className="stories-landing__subsection">
                      <div className="stories-landing__subsectionLabel">
                        Collaborators ({storyData.get(comic.id)?.collaborators?.length || 0})
                      </div>
                      {(() => {
                        const collaborators = storyData.get(comic.id)?.collaborators || [];
                        if (collaborators.length === 0) {
                          return <p className="stories-landing__chipMuted mb-0">No collaborators listed.</p>;
                        }
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
                              roles: [],
                            });
                          }
                          if (collaborator.role) {
                            collaboratorsByUser.get(key).roles.push(collaborator.role);
                          }
                        });

                        return (
                          <div className="stories-landing__chips">
                            {Array.from(collaboratorsByUser.values()).map((collab: any) => {
                              let displayName: string;
                              if (collab.user) {
                                displayName = `@${collab.user.username}`;
                              } else {
                                displayName = collab.email || 'Unknown';
                              }
                              const key = collab.user?.id || collab.email;
                              return (
                                <span key={key} className="stories-landing__chip">
                                  {displayName}
                                  {collab.roles.length > 1 && ` · ${collab.roles.length} roles`}
                                </span>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default StudioDetail;

