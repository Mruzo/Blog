import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import BackButton from '../components/BackButton';
import LoadingSpinner from '../components/LoadingSpinner';
import MessagePopup from '../components/MessagePopup';
import Comic3DViewer from '../components/Comic3DViewer';
import StoryCollaborators from '../components/StoryCollaborators';
import { useApi } from '../contexts/ApiContext';
import { FeedbackContext } from '../contexts/FeedbackContext';
import { Story, Episode, Dialogue, Season, getDialogueApprovalRequired } from '../services/api';
import { apiService } from '../services/api';
import '../components/Comic3DViewer.css';

function pendingRequestLabel(
  request: NonNullable<Story['pending_edit_requests']>[number],
): string {
  const who = request.requester_name || request.requester_username || 'A teammate';
  const line = request.line_order != null ? `line ${request.line_order}` : 'a line';
  const verb = request.action === 'delete' ? 'wants to delete' : 'wants to change';
  if (request.episode_title) {
    return `${who} ${verb} ${line} in ${request.episode_title}`;
  }
  return `${who} ${verb} ${line}`;
}

const StoryManage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const feedbackContext = useContext(FeedbackContext);
  const { 
    seasons, 
    loadSeasons, 
    loadCharacters, 
    loadStory,
    updateDialogue,
    deleteStory,
    currentUser
  } = useApi();
  const [story, setStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [allEpisodes, setAllEpisodes] = useState<Episode[]>([]);
  const [allDialogues, setAllDialogues] = useState<Dialogue[]>([]);
  const [activeSeasonId, setActiveSeasonId] = useState<number | null>(null);
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'success' | 'danger' | 'warning' | 'info'>('success');
  const [showMessage, setShowMessage] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);

  // Function to handle season selection and update active season
  const handleSeasonSelect = useCallback((season: Season) => {
    setActiveSeasonId(season.id);
  }, []);

  // Set feedback context when story is loaded
  useEffect(() => {
    if (feedbackContext && story) {
      feedbackContext.setContext({
        storyId: story.id,
        storyTitle: story.title,
        page: 'Story Management'
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story]);

  // Function to handle episode selection and update active season
  const handleEpisodeSelect = useCallback((episode: Episode) => {
    // Find the season for this episode
    const season = seasons.find(s => s.id === episode.season);
    if (season) {
      setActiveSeasonId(season.id);
    }
  }, [seasons]);

  // Function to get 3D model file type from season
  const getModelFileType = (season: Season): string => {
    if (season.model_gltf) {
      return 'GLB';
    } else if (season.resolved_model_gltf) {
      return 'Shared GLB';
    } else if (season.model_usdz) {
      return 'USDZ';
    } else if (season.resolved_model_usdz) {
      return 'Shared USDZ';
    }
    return 'None';
  };

  // Function to load all episodes and dialogues for the story (optimized)
  const loadAllEpisodesAndDialogues = useCallback(async (storyId: number, seasonsData: Season[]) => {
    try {
      // Load all episodes for all seasons in parallel
      const episodeResults = await Promise.all(
        seasonsData.map(async (season) => {
          try {
            const seasonEpisodes = await apiService.getEpisodes(season.id);
            return { seasonId: season.id, episodes: seasonEpisodes };
          } catch (error) {
            console.error(`Error loading episodes for season ${season.id}:`, error);
            return { seasonId: season.id, episodes: [] };
          }
        })
      );
      
      // Flatten all episodes
      const allRealEpisodes = episodeResults.flatMap(result => result.episodes);
      
      // Load all dialogues for all episodes in parallel
      const dialogueResults = await Promise.all(
        allRealEpisodes.map(async (episode) => {
          try {
            const episodeDialogues = await apiService.getDialogues(episode.id);
            return { episodeId: episode.id, dialogues: episodeDialogues };
          } catch (error) {
            console.error(`Error loading dialogues for episode ${episode.id}:`, error);
            return { episodeId: episode.id, dialogues: [] };
          }
        })
      );
      
      // Flatten all dialogues
      const allDialoguesData = dialogueResults.flatMap(result => result.dialogues);
      
      // Use only real episodes (no virtual episodes - align with Django structure)
      const allEpisodesData = allRealEpisodes;
      
      // Update local state with combined data
      setAllEpisodes(allEpisodesData);
      setAllDialogues(allDialoguesData);
      
    } catch (error) {
      console.error('Error loading episodes and dialogues:', error);
    }
  }, []); // Empty dependency array to prevent infinite loops

  // Backend story GET is the access gate: owner, story collaborator, or studio teammate.
  useEffect(() => {
    const checkAuthorization = async () => {
      if (!id || !currentUser) {
        const token = localStorage.getItem('authToken');
        if (!token) {
          navigate('/login/?next=' + encodeURIComponent(window.location.pathname));
          return;
        }
        return;
      }
      
      setIsCheckingAuth(true);
      const storyId = Number(id);
      
      try {
        const storyData = await loadStory(storyId);
        
        if (!storyData) {
          setError('Story not found.');
          setIsAuthorized(false);
          setIsCheckingAuth(false);
          return;
        }

        setIsAuthorized(true);
        setStory(storyData);
        setIsCheckingAuth(false);
      } catch (err: any) {
        console.error('StoryManage: Error checking authorization:', err);
        if (err.response?.status === 403 || err.response?.status === 404) {
          setError('You do not have permission to access this story, or the story does not exist.');
          setIsAuthorized(false);
          setTimeout(() => {
            navigate('/immersivecomics/my-studio/');
          }, 2000);
        } else {
          setError('Failed to load story data.');
        }
        setIsCheckingAuth(false);
      }
    };

    checkAuthorization();
  }, [id, currentUser, loadStory, navigate]);

  // Load story data once authorized
  useEffect(() => {
    const fetchData = async () => {
      if (!id || !isAuthorized || !story) {
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        const storyId = Number(id);
        await Promise.all([
          loadSeasons(storyId),
          loadCharacters(storyId)
        ]);
        
        setLoading(false);
      } catch (err) {
        console.error('StoryManage: Error loading story data:', err);
        setError('Failed to load story data.');
        setLoading(false);
      }
    };

    fetchData();
  }, [id, isAuthorized, story, loadSeasons, loadCharacters]);

  // Separate effect to load episodes and dialogues when seasons are available
  useEffect(() => {
    if (story && seasons.length > 0) {
      loadAllEpisodesAndDialogues(Number(id), seasons);
    }
  }, [story, seasons, id, loadAllEpisodesAndDialogues]);

  // Set initial active season when episodes load
  useEffect(() => {
    if (allEpisodes.length > 0 && !activeSeasonId) {
      // Set the first episode's season as active
      const firstEpisode = allEpisodes[0];
      const firstSeason = seasons.find(s => s.id === firstEpisode.season);
      if (firstSeason) {
        setActiveSeasonId(firstSeason.id);
      }
    }
  }, [allEpisodes, seasons, activeSeasonId]);

  // Show loading while checking authorization
  if (isCheckingAuth || loading) {
    return (
      <div className="product-landing">
        <section className="product-landing__section">
          <div className="product-landing__container store-page__loadingWrap" style={{ maxWidth: '1200px' }}>
            <LoadingSpinner
              message={isCheckingAuth ? 'Checking access permissions…' : 'Loading story…'}
            />
          </div>
        </section>
      </div>
    );
  }

  if (error || !isAuthorized) {
    return (
      <div className="product-landing">
        <section className="product-landing__section">
          <div className="product-landing__container" style={{ maxWidth: '720px' }}>
            <div className="store-page__error" role="alert">
              <i className="fas fa-lock store-page__errorIcon" aria-hidden />
              <div>
                <strong className="d-block mb-1">Access denied</strong>
                <span>{error || 'You do not have permission to access this story.'}</span>
                <p className="mb-0 mt-2" style={{ opacity: 0.9 }}>
                  Only the story owner and collaborators can open this page.
                </p>
              </div>
            </div>
            <div className="store-page__ctaRow mt-3">
              <button
                type="button"
                className="stories-landing__btnPrimary"
                onClick={() => navigate('/immersivecomics/my-studio/')}
              >
                <i className="fas fa-arrow-left me-2" aria-hidden />
                Back to My studio
              </button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (!story) {
    return (
      <div className="product-landing">
        <section className="product-landing__section">
          <div className="product-landing__container" style={{ maxWidth: '720px' }}>
            <div className="store-page__error" role="alert">
              <i className="fas fa-info-circle store-page__errorIcon" aria-hidden />
              <span>Story not found or still loading…</span>
            </div>
            <div className="store-page__ctaRow mt-3">
              <BackButton to="/immersivecomics/my-studio/" variant="primary" />
              <button type="button" className="product-landing__ctaGhost" onClick={() => window.location.reload()}>
                <i className="fas fa-sync-alt me-2" aria-hidden />
                Retry
              </button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  // Handle delete story
  const handleDeleteStory = async () => {
    if (!story || !id) return;
    
    const confirmed = window.confirm(
      `Are you sure you want to delete "${story.title || 'Untitled Story'}"? This action cannot be undone.`
    );
    
    if (!confirmed) {
      return;
    }

    try {
      await deleteStory(Number(id));
      setMessage(`Story "${story.title || 'Untitled Story'}" has been deleted successfully.`);
      setMessageType('success');
      setShowMessage(true);
      // Navigate back to my-studio after a short delay
      setTimeout(() => {
        navigate('/immersivecomics/my-studio/');
      }, 1500);
    } catch (error: any) {
      console.error('Delete story error:', error);
      setMessage('Failed to delete story. Please try again.');
      setMessageType('danger');
      setShowMessage(true);
    }
  };

  const pendingEditRequests = story.pending_edit_requests ?? [];
  const pendingApprovalCount = story.pending_approvals || pendingEditRequests.length;

  return (
    <div className="product-landing">
      <MessagePopup
        message={message}
        type={messageType}
        show={showMessage}
        onClose={() => setShowMessage(false)}
        duration={3000}
      />

      <section className="product-landing__section product-landing__hero">
        <div className="product-landing__container" style={{ maxWidth: '1200px' }}>
          <div className="d-flex flex-wrap justify-content-between align-items-start gap-3">
            <div style={{ minWidth: 0, flex: '1 1 auto' }}>
              <p className="product-landing__eyebrow">Story</p>
              <h1 className="product-landing__h1 mb-0">Manage story</h1>
              <p className="product-landing__lead mb-0 mt-2">
                {story?.title?.trim() || 'Untitled story'} — seasons, preview, and team.
              </p>
            </div>
            <div className="my-studio__panelHeadActions">
              <Link
                to={`/immersivecomics/story/${id}/edit/`}
                className="stories-landing__btnPrimary text-decoration-none d-inline-flex align-items-center"
              >
                <i className="fas fa-edit me-2" aria-hidden />
                Edit
              </Link>
              <BackButton to="/immersivecomics/my-studio/" />
            </div>
          </div>
        </div>
      </section>

      <section className="product-landing__section">
        <div className="product-landing__container px-2 px-md-3 pb-4" style={{ maxWidth: '1200px' }}>
      {pendingEditRequests.length > 0 ? (
        <aside className="story-manage__approvals" aria-label="Pending line approvals">
          <p className="story-manage__approvalsTitle">
            {pendingApprovalCount === 1
              ? '1 change is waiting for your approval'
              : `${pendingApprovalCount} changes are waiting for your approval`}
          </p>
          <ul className="story-manage__approvalsList">
            {pendingEditRequests.map((request) => (
              <li key={request.id}>
                {request.season_id ? (
                  <Link to={`/immersivecomics/season/${request.season_id}/episodes/`}>
                    {pendingRequestLabel(request)}
                  </Link>
                ) : (
                  <span>{pendingRequestLabel(request)}</span>
                )}
              </li>
            ))}
          </ul>
        </aside>
      ) : null}
      <div className="story-manage__layout mb-4">
        <div className="my-studio__panel">
            <div className="my-studio__panelHead">
              <h2 className="my-studio__panelTitle">
                <i className="fas fa-book-open" aria-hidden />
                <span className="my-studio__panelTitleText">Story details</span>
              </h2>
              <div className="my-studio__panelHeadActions">
                <button
                  type="button"
                  className="product-landing__ctaGhost story-manage__ghostDanger"
                  title="Delete story"
                  onClick={handleDeleteStory}
                >
                  <i className="fas fa-trash-alt me-2" aria-hidden />
                  Delete
                </button>
              </div>
            </div>
            <div className="my-studio__panelBody">
              {story?.comic_image && typeof story.comic_image === 'string' && (
                <div className="mb-3">
                  <img
                    src={story.comic_image}
                    alt={story.title || 'Story cover'}
                    className="story-manage__coverImg"
                  />
                </div>
              )}

              <p className="product-landing__body" style={{ fontSize: '0.9rem', marginBottom: '0.85rem' }}>
                {story?.description?.trim() || 'No description provided.'}
              </p>
              <div className="d-flex flex-wrap gap-2 mb-3 align-items-center">
                <span className={`stories-landing__chip ${story?.is_public ? 'stories-landing__chip--success' : ''}`}>
                  {story?.is_public ? 'Public' : 'Private'}
                </span>
              </div>
              <div className="story-manage__meta">
                <div>Created {story?.created_at ? new Date(story.created_at).toLocaleDateString() : '—'}</div>
                <div>Updated {story?.updated_at ? new Date(story.updated_at).toLocaleDateString() : '—'}</div>
              </div>
            </div>
          </div>

        <div className="d-flex flex-column gap-3">
          <div className="my-studio__panel">
            <div className="my-studio__panelHead">
              <h2 className="my-studio__panelTitle">
                <i className="fas fa-chart-bar" aria-hidden />
                <span className="my-studio__panelTitleText">Quick stats</span>
              </h2>
            </div>
            <div className="my-studio__panelBody">
              <div className="story-manage__statGrid">
                <div>
                  <div className="story-manage__statNum">{seasons.length}</div>
                  <div className="story-manage__statLabel">
                    {seasons.length === 1 ? 'Season' : 'Seasons'}
                  </div>
                </div>
                <div>
                  <div className="story-manage__statNum">{allEpisodes.length}</div>
                  <div className="story-manage__statLabel">
                    {allEpisodes.length === 1 ? 'Episode' : 'Episodes'}
                  </div>
                </div>
                <div>
                  <div className="story-manage__statNum">{story?.total_views || 0}</div>
                  <div className="story-manage__statLabel">
                    {(story?.total_views || 0) === 1 ? 'View' : 'Views'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="my-studio__panel">
            <div className="my-studio__panelHead">
              <h2 className="my-studio__panelTitle">
                <i className="fas fa-users" aria-hidden />
                <span className="my-studio__panelTitleText">
                  Characters (
                  {(() => {
                    const uniqueCharacterNames = new Set(
                      allDialogues
                        .filter((dialogue) => dialogue.character_name)
                        .map((dialogue) => dialogue.character_name)
                    );
                    return uniqueCharacterNames.size;
                  })()}
                  )
                </span>
              </h2>
              <div className="my-studio__panelHeadActions">
                <button
                  type="button"
                  className="stories-landing__btnPrimary"
                  onClick={() => navigate(`/immersivecomics/story/${id}/characters/`)}
                >
                  <i className="fas fa-sliders-h me-2" aria-hidden />
                  Manage
                </button>
              </div>
            </div>
            <div className="my-studio__panelBody">
              {(() => {
                const uniqueCharacterNames = Array.from(
                  new Set(
                    allDialogues
                      .filter((dialogue) => dialogue.character_name)
                      .map((dialogue) => dialogue.character_name)
                  )
                );

                return uniqueCharacterNames.length === 0 ? (
                  <div className="story-manage__inlineEmpty">
                    <div className="stories-landing__emptyIcon" aria-hidden>
                      <i className="fas fa-users" />
                    </div>
                    <p className="product-landing__body mb-2" style={{ fontSize: '0.9rem' }}>
                      No characters yet. Add characters and dialogues to bring the story to life.
                    </p>
                    <button
                      type="button"
                      className="stories-landing__btnPrimary"
                      onClick={() => navigate(`/immersivecomics/story/${id}/characters/`)}
                    >
                      <i className="fas fa-plus me-2" aria-hidden />
                      Create characters
                    </button>
                  </div>
                ) : (
                  <div className="story-manage__chipRow">
                    {uniqueCharacterNames.map((characterName, index) => (
                      <span key={`${characterName}-${index}`} className="stories-landing__chip">
                        {characterName}
                      </span>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>

      <div className="story-manage__fullBleed">
        <div className="w-100">
          {seasons.length === 0 ? (
            <div className="my-studio__empty">
              <div className="stories-landing__emptyIcon" aria-hidden>
                <i className="fas fa-layer-group" />
              </div>
              <h3 className="product-landing__h2" style={{ fontSize: '1.2rem' }}>
                No seasons yet
              </h3>
              <p className="product-landing__body" style={{ marginTop: '0.35rem' }}>
                Create the first season for your story.
              </p>
              <button
                type="button"
                className="stories-landing__btnPrimary mt-2"
                onClick={() => navigate(`/immersivecomics/story/${id}/season/create/`)}
              >
                <i className="fas fa-plus me-2" aria-hidden />
                Create first season
              </button>
            </div>
          ) : (
            <div className="my-studio__panel">
              <div className="my-studio__panelHead">
                <h2 className="my-studio__panelTitle">
                  <i className="fas fa-layer-group" aria-hidden />
                  <span className="my-studio__panelTitleText">Seasons ({seasons.length})</span>
                </h2>
                <div className="my-studio__panelHeadActions">
                  <button
                    type="button"
                    className="stories-landing__btnPrimary"
                    onClick={() => navigate(`/immersivecomics/story/${id}/season/create/`)}
                  >
                    <i className="fas fa-plus me-2" aria-hidden />
                    New season
                  </button>
                </div>
              </div>
              <div className="my-studio__panelBody pt-2">
                <p className="stories-landing__chipMuted mb-2" style={{ fontSize: '0.8rem' }}>
                  Tap a season to load it in the 3D preview below.
                </p>
                <div className="story-manage__seasonStrip">
                  {seasons.map((season) => {
                    const epCount = allEpisodes.filter((ep) => ep.season === season.id).length;
                    const viewTotal =
                      (season as any).total_views ??
                      allEpisodes
                        .filter((ep) => ep.season === season.id)
                        .reduce((sum, ep) => sum + ((ep as any).view_count || 0), 0);
                    const modelType = getModelFileType(season);
                    return (
                      <div
                        key={season.id}
                        role="button"
                        tabIndex={0}
                        className={`story-manage__seasonCard ${
                          activeSeasonId === season.id ? 'story-manage__seasonCard--active' : ''
                        }`}
                        onClick={() => handleSeasonSelect(season)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleSeasonSelect(season);
                          }
                        }}
                      >
                        <div className="d-flex justify-content-between align-items-start gap-2">
                          <p className="story-manage__seasonCardTitle">
                            Season {season.season_number}: {season.title}
                          </p>
                          <span className="story-manage__seasonMeta flex-shrink-0">
                            {new Date(season.release_date).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="story-manage__seasonActions">
                          <button
                            type="button"
                            className="stories-landing__btnPrimary story-manage__btnCompact"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/immersivecomics/season/${season.id}/episodes/`);
                            }}
                          >
                            <i className="fas fa-video me-1" aria-hidden />
                            Episodes · {epCount}
                          </button>
                          <p className="stories-landing__meta mb-0" style={{ fontSize: '0.75rem' }}>
                            <i className="fas fa-eye me-1" aria-hidden />
                            <span className="stories-landing__metaNum">{viewTotal}</span>
                          </p>
                          <span className="stories-landing__chip">{modelType}</span>
                          <button
                            type="button"
                            className="product-landing__ctaGhost story-manage__btnCompact"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/immersivecomics/season/${season.id}/edit/`);
                            }}
                          >
                            <i className="fas fa-edit me-1" aria-hidden />
                            Edit
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="story-manage__viewerWrap">
        {activeSeasonId ? (
          <div className="my-studio__panel">
            <div className="my-studio__panelHead">
              <h2 className="my-studio__panelTitle">
                <i className="fas fa-cube" aria-hidden />
                <span className="my-studio__panelTitleText">3D preview</span>
              </h2>
            </div>
            <div className="my-studio__panelBody p-0" style={{ borderRadius: '0 0 18px 18px', overflow: 'hidden' }}>
              <Comic3DViewer
                episodes={allEpisodes.filter((ep) => ep.season === activeSeasonId)}
                dialogues={allDialogues}
                seasons={seasons}
                storyId={Number(id)}
                onEpisodeSelect={handleEpisodeSelect}
                onDialogueUpdate={async (dialogueId, data) => {
                  try {
                    await updateDialogue(dialogueId, data);
                  } catch (error: unknown) {
                    const approval = getDialogueApprovalRequired(error);
                    if (!approval) {
                      return;
                    }
                    try {
                      await apiService.requestDialogueEdit(dialogueId, data);
                      setMessage(`Asked ${approval.lastEditorUsername} to approve that camera change.`);
                      setMessageType('info');
                      setShowMessage(true);
                    } catch (requestError) {
                      console.error('Could not request dialogue approval:', requestError);
                    }
                  }
                }}
              />
            </div>
          </div>
        ) : (
          <div className="my-studio__empty">
            <div className="stories-landing__emptyIcon" aria-hidden>
              <i className="fas fa-hand-pointer" />
            </div>
            <h3 className="product-landing__h2" style={{ fontSize: '1.2rem' }}>
              Select a season
            </h3>
            <p className="product-landing__body mb-0" style={{ marginTop: '0.35rem' }}>
              Choose a season above to load its 3D scene and episodes.
            </p>
          </div>
        )}
      </div>

      <div className="story-manage__collab">
        <StoryCollaborators />
      </div>
        </div>
      </section>
    </div>
  );
};

export default StoryManage;