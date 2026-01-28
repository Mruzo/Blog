import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import BackButton from '../components/BackButton';
import SmallButton from '../components/SmallButton';
import LoadingSpinner from '../components/LoadingSpinner';
import MessagePopup from '../components/MessagePopup';
import Comic3DViewer from '../components/Comic3DViewer';
import StoryCollaborators from '../components/StoryCollaborators';
import { useApi } from '../contexts/ApiContext';
import { FeedbackContext } from '../contexts/FeedbackContext';
import { Story, Episode, Dialogue, Season } from '../services/api';
import { apiService } from '../services/api';
import { collaborationService } from '../services/collaborationService';
import '../components/Comic3DViewer.css';


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
    console.log('Season selected:', season);
    setActiveSeasonId(season.id);
    // Filter episodes for the selected season
    const seasonEpisodes = allEpisodes.filter(ep => ep.season === season.id);
    console.log('Episodes for selected season:', seasonEpisodes);
  }, [allEpisodes]);

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
    console.log('Episode selected:', episode);
    // Find the season for this episode
    const season = seasons.find(s => s.id === episode.season);
    if (season) {
      setActiveSeasonId(season.id);
    }
  }, [seasons]);

  // Function to get 3D model file type from season
  const getModelFileType = (season: Season): string => {
    if (season.model_gltf) {
      return 'GLTF';
    } else if (season.model_usdz) {
      return 'USDZ';
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

  // Check authorization: user must be owner or collaborator
  useEffect(() => {
    const checkAuthorization = async () => {
      if (!id || !currentUser) {
        // Wait for currentUser to load
        const token = localStorage.getItem('authToken');
        if (!token) {
          // No token, redirect to login
          navigate('/login/?next=' + encodeURIComponent(window.location.pathname));
          return;
        }
        // Token exists but currentUser not loaded yet, wait a bit
        return;
      }
      
      setIsCheckingAuth(true);
      const storyId = Number(id);
      
      try {
        // Try to load the story - this will fail if user doesn't have access
        const storyData = await loadStory(storyId);
        
        if (!storyData) {
          setError('Story not found.');
          setIsAuthorized(false);
          setIsCheckingAuth(false);
          return;
        }
        
        // Check if user is the owner
        // Story.user is a number (user ID), but API might return it as an object in some cases
        const storyUserId = typeof storyData.user === 'object' && storyData.user !== null 
          ? (storyData.user as any).id 
          : Number(storyData.user);
        const isOwner = storyUserId === Number(currentUser.id);
        
        if (isOwner) {
          setIsAuthorized(true);
          setStory(storyData);
          setIsCheckingAuth(false);
          return;
        }
        
        // Check if user is a collaborator
        try {
          const collaborators = await collaborationService.getCollaborators(storyId);
          const isCollaborator = collaborators.some((collab: any) => {
            // Check StoryCollaborator (has user field)
            if (collab.user && (collab.user.id === currentUser.id || collab.user === currentUser.id)) {
              return true;
            }
            // Check CollaborationInvite (has invitee_user field)
            if (collab.invitee_user && (collab.invitee_user.id === currentUser.id || collab.invitee_user === currentUser.id)) {
              // Only count accepted invites
              return collab.status === 'accepted';
            }
            return false;
          });
          
          if (isCollaborator) {
            setIsAuthorized(true);
            setStory(storyData);
          } else {
            // User is neither owner nor collaborator
            setError('You do not have permission to access this story.');
            setIsAuthorized(false);
            setTimeout(() => {
              navigate('/immersivecomics/my-studio/');
            }, 2000);
          }
        } catch (collabError: any) {
          // If we can't load collaborators, user probably doesn't have access
          if (collabError.response?.status === 403 || collabError.response?.status === 401) {
            setError('You do not have permission to access this story.');
            setIsAuthorized(false);
            setTimeout(() => {
              navigate('/immersivecomics/my-studio/');
            }, 2000);
          } else {
            // Other error, still allow access if story loaded successfully
            setIsAuthorized(true);
            setStory(storyData);
          }
        }
        
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
      <div className="container mt-2" style={{ maxWidth: '1200px' }}>
        <LoadingSpinner message={isCheckingAuth ? "Checking access permissions..." : "Loading story..."} />
      </div>
    );
  }

  // Show error if not authorized or other error
  if (error || !isAuthorized) {
    return (
      <div className="container mt-2" style={{ maxWidth: '1200px' }}>
        <div className="alert alert-danger">
          <h5>Access Denied</h5>
          <p>{error || 'You do not have permission to access this story.'}</p>
          <p className="text-muted">Only the story owner and collaborators can access the manage page.</p>
          <button 
            className="btn btn-primary"
            onClick={() => navigate('/immersivecomics/my-studio/')}
          >
            <i className="fas fa-arrow-left me-1"></i>Back to My Studio
          </button>
        </div>
      </div>
    );
  }

  if (!story) {
    return (
      <div className="container mt-4">
        <div className="alert alert-warning" role="alert">
          <i className="fas fa-info-circle me-2"></i>
          Story not found or still loading...
        </div>
        <div className="mt-3">
          <BackButton to="/immersivecomics/my-studio/" variant="primary" />
          <button 
            className="btn btn-primary ms-2"
            onClick={() => window.location.reload()}
          >
            <i className="fas fa-refresh me-1"></i>Retry
          </button>
        </div>
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

  return (
    <div className="container mt-2 p-2" style={{ maxWidth: '1200px' }}>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <div className="flex-grow-1">
          <h4 className="font-quicksand mb-0">Manage story details</h4>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <BackButton to="/immersivecomics/my-studio/" />
        </div>
      </div>

      <MessagePopup
        message={message}
        type={messageType}
        show={showMessage}
        onClose={() => setShowMessage(false)}
        duration={3000}
      />

      {/* Story Info */}
      <div className="row mb-4">
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-transparent text-white d-flex justify-content-between align-items-center p-2">
              <h5 className="mb-0 font-quicksand"><i className="fas fa-book me-2"></i> {story?.title?.trim() || (story ? 'Untitled Story' : 'Loading...')}</h5>
              <div className="d-flex gap-2">
                <SmallButton 
                  variant="outline-primary"
                  onClick={() => navigate(`/immersivecomics/story/${id}/edit/`)}
                >
                  <i className="fas fa-edit me-1"></i>
                </SmallButton>
                <SmallButton 
                  variant="outline-danger"
                  onClick={handleDeleteStory}
                  title="Delete story"
                >
                  <i className="fas fa-trash me-1"></i>
                </SmallButton>
              </div>
            </div>
            <div className="card-body p-2">
              {/* Cover Image */}
              {story?.comic_image && typeof story.comic_image === 'string' && (
                <div className="mb-3">
                  <img 
                    src={story.comic_image} 
                    alt={story.title || 'Story cover'} 
                    className="img-fluid rounded"
                    style={{ maxHeight: '200px', objectFit: 'cover', width: '100%' }}
                  />
                </div>
              )}
              
              <p className="subtext-btn-sm mb-3">{story?.description?.trim() || 'No description provided'}</p>
              <div className="d-flex gap-2 mb-3">
                <span className={`badge ${story?.is_public ? 'bg-success' : 'bg-secondary'}`}>
                  {story?.is_public ? 'Public' : 'Private'}
                </span>
              </div>
                      <div className="text-muted subtext-btn-sm">
                <div>Created: {story?.created_at ? new Date(story.created_at).toLocaleDateString() : 'N/A'}</div>
                <div>Updated: {story?.updated_at ? new Date(story.updated_at).toLocaleDateString() : 'N/A'}</div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="col-lg-4">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-info text-white">
              <h5 className="mb-0 font-quicksand"><i className="fas fa-chart-bar me-2"></i> Quick Stats</h5>
            </div>
            <div className="card-body">
              <div className="row text-center">
                <div className="col-4">
                  <div className="subtext-md text-primary">{seasons.length}</div>
                    <div className="subtext-btn-sm text-muted">
                      {seasons.length === 1 ? 'Season' : 'Seasons'}
                    </div>
                </div>
                <div className="col-4">
                  <div className="subtext-md text-primary">{allEpisodes.length}</div>
                  <div className="subtext-btn-sm text-muted">
                    {allEpisodes.length === 1 ? 'Episode' : 'Episodes'}
                  </div>
                </div>
                <div className="col-4">
                  <div className="subtext-md text-success">
                    {story?.total_views || 0}
                  </div>
                  <div className="subtext-btn-sm text-muted">
                    {(story?.total_views || 0) === 1 ? 'View' : 'Views'}
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Characters Section */}
          <div className="row my-2">
            <div className="col-12 ">
              <div className="d-flex justify-content-between align-items-center mb-0">
                <h3 className="subtext-btn mb-0">Characters ({(() => {
                  // Get unique character names from all dialogues
                  const uniqueCharacterNames = new Set(
                    allDialogues
                      .filter(dialogue => dialogue.character_name)
                      .map(dialogue => dialogue.character_name)
                  );
                  return uniqueCharacterNames.size;
                })()})</h3>
                <SmallButton 
                  className="btn btn-primary subtext-btn-sm"
                  onClick={() => navigate(`/immersivecomics/story/${id}/characters/`)}
                >
                  <i className="fas fa-edit me-1"></i>
                </SmallButton>
              </div>
              
              {(() => {
                // Get unique character names from all dialogues
                const uniqueCharacterNames = Array.from(new Set(
                  allDialogues
                    .filter(dialogue => dialogue.character_name)
                    .map(dialogue => dialogue.character_name)
                ));
                
                return uniqueCharacterNames.length === 0 ? (
                  <div className="card border-0 shadow-sm">
                    <div className="card-body text-center py-4">
                      <i className="fas fa-users fa-3x text-muted mb-0"></i>
                      <h5 className="subtext-btn mb-0">No Characters Yet</h5>
                      <p className="subtext-btn-sm text-muted mb-3">
                        Create characters and dialogues to bring your story to life.
                      </p>
                      <button 
                        className="btn btn-primary subtext-btn-sm"
                        onClick={() => navigate(`/immersivecomics/story/${id}/characters/`)}
                      >
                        <i className="fas fa-plus me-1"></i>Create Characters
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="card border-0 shadow-sm">
                    <div className="card-body p-1">
                      <div className="d-flex flex-wrap gap-2">
                        {uniqueCharacterNames.map((characterName, index) => (
                          <span 
                            key={`${characterName}-${index}`} 
                            className="badge bg-primary subtext-btn-sm px-3 py-2"
                          >
                            {characterName}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>



      {/* Seasons Section */}
      <div className="row">
        <div className="col-12 border-left">
          {/* <div className="d-flex justify-content-between align-items-center mb-0 ">
            <h3 className="subtext-btn mb-0">Seasons</h3>
            <button 
              className="btn btn-primary subtext-btn-sm"
              onClick={() => navigate(`/immersivecomics/story/${id}/season/create/`)}
            >
              <i className="fas fa-plus me-1"></i>Add Season
            </button>
          </div> */}
          
          {seasons.length === 0 ? (
            <div className="card border-1 shadow-sm">
              <div className="card-body text-center py-3">
                <i className="fas fa-layer-group fa-3x text-muted mb-2"></i>
                <h5 className="subtext-btn-sm text-muted mb-3">No seasons yet</h5>
                <p className="subtext-btn-sm text-muted mb-2">
                  Create the first season for your story.
                </p>
                <button 
                  className="btn btn-primary subtext-btn-sm"
                  onClick={() => navigate(`/immersivecomics/story/${id}/season/create/`)}
                >
                  <i className="fas fa-plus me-1"></i>Create First Season
                </button>
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="subtext-btn mb-0">Seasons ({seasons.length})</h5>
                <SmallButton 
                  variant="outline-primary" 
                  onClick={() => navigate(`/immersivecomics/story/${id}/season/create/`)}
                >
                  <i className="fas fa-plus me-1"></i>New Season
                </SmallButton>
              </div>
              <div className="card-body p-1">
                {/* Desktop: Horizontal scroll for first 5 seasons */}
                <div className="d-none d-lg-block">
                  <div className="d-flex gap-3" style={{ overflowX: 'auto', paddingBottom: '10px' }}>
                    {seasons.slice(0, 5).map((season) => (
                      <div key={season.id} className="flex-shrink-0" style={{ width: '300px' }}>
                        <div 
                          className={`card h-100 shadow-sm ${activeSeasonId === season.id ? 'border-primary border-3' : 'border-0'}`}
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleSeasonSelect(season)}
                        >
                          <div className="card-body d-flex flex-column p-1">
                            {/* Row 1: Title and Release Date */}
                            <div className="d-flex justify-content-between align-items-start mb-0">
                              <h5 className="subtext-btn-sm mb-0">Season {season.season_number}: {season.title}</h5>
                              <div className="subtext-btn-sm text-muted">
                                <span className="d-none d-md-inline">Release Date: </span>
                                {new Date(season.release_date).toLocaleDateString()}
                              </div>
                            </div>
                            
                            {/* Row 2: Description */}
                            {/* <div className="mb-1 flex-grow-1">
                              <p className="subtext-btn-sm text-muted mb-0">
                                {season.description}
                              </p>
                            </div> */}
                            
                            {/* Row 3: Episodes, Views, 3D Model, and Edit Button */}
                            <div className="d-flex justify-content-between align-items-center gap-2">
                              <button 
                                className="btn btn-primary btn-sm subtext-btn-sm border-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/immersivecomics/season/${season.id}/episodes/`);
                                }}
                              >
                                <i className="fas fa-video me-1"></i> Episodes: {allEpisodes.filter(ep => ep.season === season.id).length}
                              </button>
                              
                              <div className="d-flex align-items-center text-muted subtext-btn-sm">
                                <i className="fas fa-eye me-1"></i>
                                &nbsp;<strong>{(season as any).total_views ?? (allEpisodes.filter(ep => ep.season === season.id).reduce((sum, ep) => sum + ((ep as any).view_count || 0), 0))}</strong>
                              </div>
                              
                              <div className="d-flex align-items-center">
                                <span className="me-2 subtext-btn-sm text-muted"> Model:</span>
                                <span className={`badge ${getModelFileType(season) === 'None' ? 'bg-success' : 'bg-success'}`}>
                                  {getModelFileType(season)}
                                </span>
                              </div>
                              
                              <button 
                                className="btn btn-outline-secondary btn-sm subtext-btn-sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/immersivecomics/season/${season.id}/edit/`);
                                }}
                              >
                                <i className="fas fa-edit me-1"></i>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Mobile: Vertical scroll for all seasons */}
                <div className="d-lg-none" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  <div className="row">
                    {seasons.map((season) => (
                      <div key={season.id} className="col-12 mb-3">
                        <div 
                          className={`card h-100 shadow-sm ${activeSeasonId === season.id ? 'border-primary border-3' : 'border-0'}`}
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleSeasonSelect(season)}
                        >
                          <div className="card-body d-flex flex-column p-1">
                            {/* Row 1: Title and Release Date */}
                            <div className="d-flex justify-content-between align-items-start mb-0">
                              <h5 className="subtext-btn-sm mb-0">Season {season.season_number}: {season.title}</h5>
                              <div className="subtext-btn-sm text-muted">
                                <span className="d-none d-md-inline">Release Date: </span>
                                {new Date(season.release_date).toLocaleDateString()}
                              </div>
                            </div>
                            
                            {/* Row 2: Description */}
                            <div className="mb-1 flex-grow-1">
                              <p className="subtext-btn-sm text-muted mb-0">
                                {season.description}
                              </p>
                            </div>
                            
                            {/* Row 3: Episodes, Views, 3D Model, and Edit Button */}
                            <div className="d-flex justify-content-between align-items-center gap-2">
                              <button 
                                className="btn btn-primary btn-sm subtext-btn-sm border-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/immersivecomics/season/${season.id}/episodes/`);
                                }}
                              >
                                <i className="fas fa-video me-1"></i> Ep: {allEpisodes.filter(ep => ep.season === season.id).length}
                              </button>
                              
                              <div className="d-flex align-items-center text-muted subtext-btn-sm">
                                <i className="fas fa-eye me-1"></i>
                                &nbsp;<strong>{(season as any).total_views ?? (allEpisodes.filter(ep => ep.season === season.id).reduce((sum, ep) => sum + ((ep as any).view_count || 0), 0))}</strong>
                              </div>
                              
                              <div className="d-flex align-items-center">
                                <span className="me-2 subtext-btn-sm text-muted"> Model:</span>
                                <span className={`badge ${getModelFileType(season) === 'None' ? 'bg-success' : 'bg-success'}`}>
                                  {getModelFileType(season)}
                                </span>
                              </div>
                              
                              <button 
                                className="btn btn-outline-secondary btn-sm subtext-btn-sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/immersivecomics/season/${season.id}/edit/`);
                                }}
                              >
                                <i className="fas fa-edit me-1"></i>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3D Comic Viewer Section */}
      <div className="row mt-4">
        <div className="col-12 border-left">
          {activeSeasonId ? (
            <Comic3DViewer
              episodes={allEpisodes.filter(ep => ep.season === activeSeasonId)}
              dialogues={allDialogues}
              seasons={seasons}
              storyId={Number(id)}
              onEpisodeSelect={handleEpisodeSelect}
              onDialogueUpdate={(dialogueId, data) => {
                updateDialogue(dialogueId, data);
              }}
            />
          ) : (
            <div className="card">
              <div className="card-body text-center py-5">
                <i className="fas fa-mouse-pointer fa-3x text-muted mb-3"></i>
                <h5 className="subtext-btn-sm text-muted mb-3">Select a Season</h5>
                <p className="subtext-btn-sm text-muted mb-0">
                  Click on a season above to view its 3D model and episodes.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Story Collaborators Section */}
      <div className="row mt-3 border-top">
        <div className="col-12">
          <StoryCollaborators />
        </div>
      </div>
    </div>
  );
};

export default StoryManage;