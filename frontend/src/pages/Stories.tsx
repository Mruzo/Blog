import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import Comic3DViewer from '../components/Comic3DViewer';
import MetaTags from '../components/MetaTags';
import { useApi } from '../contexts/ApiContext';
import apiService from '../services/api';
import { collaborationService } from '../services/collaborationService';
import './Stories.css';

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
  const [searchParams] = useSearchParams();
  const studioId = searchParams.get('studio');
  const [studio, setStudio] = useState<any>(null);
  const [filteredStories, setFilteredStories] = useState<any[]>([]);
  const [comics, setComics] = useState<Comic[]>([]);
  const [storyData, setStoryData] = useState<Map<number, {seasons: any[], episodes: any[], dialogues: any[], collaborators: any[]}>>(new Map());
  const [isLoadingStoryData, setIsLoadingStoryData] = useState(false);
  const [loadedStoryIds, setLoadedStoryIds] = useState<Set<number>>(new Set());
  const loadingRef = useRef<Map<number, boolean>>(new Map());
  // Track selected episode for each story (for sharing)
  const [selectedEpisodes, setSelectedEpisodes] = useState<Map<number, any>>(new Map());
  // Track expanded descriptions for each story
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<number>>(new Set());
  
  // Request deduplication cache - stores in-flight and completed requests
  const requestCache = useRef<Map<string, Promise<any>>>(new Map());
  const requestResults = useRef<Map<string, any>>(new Map());
  
  // Helper function for request deduplication
  const cachedRequest = useCallback(async <T,>(
    cacheKey: string,
    requestFn: () => Promise<T>
  ): Promise<T> => {
    // Check if we have a cached result
    if (requestResults.current.has(cacheKey)) {
      return requestResults.current.get(cacheKey);
    }
    
    // Check if request is already in-flight
    if (requestCache.current.has(cacheKey)) {
      return requestCache.current.get(cacheKey);
    }
    
    // Create new request and cache it
    const request = requestFn()
      .then(result => {
        // Cache the result
        requestResults.current.set(cacheKey, result);
        // Remove from in-flight cache
        requestCache.current.delete(cacheKey);
        return result;
      })
      .catch(error => {
        // Remove from in-flight cache on error
        requestCache.current.delete(cacheKey);
        throw error;
      });
    
    // Add to in-flight cache
    requestCache.current.set(cacheKey, request);
    
    return request;
  }, []);

  // Track authentication state - update when component mounts or token changes
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const token = localStorage.getItem('authToken');
    return !!token;
  });

  // Listen for token changes (e.g., after login/logout)
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('authToken');
      setIsAuthenticated(!!token);
    };

    // Check on mount
    checkAuth();

    // Listen for storage events (logout in other tabs)
    window.addEventListener('storage', checkAuth);
    
    // Also check periodically (in case token is set/removed in same tab)
    const interval = setInterval(checkAuth, 1000);

    return () => {
      window.removeEventListener('storage', checkAuth);
      clearInterval(interval);
    };
  }, []);

  // Handle create story button click - memoized with useCallback
  const handleCreateStoryClick = useCallback((e: React.MouseEvent) => {
    if (!isAuthenticated) {
      e.preventDefault();
      // Store the intended destination in sessionStorage for post-login redirect
      sessionStorage.setItem('redirectAfterLogin', '/immersivecomics/story/create/');
      // Redirect to login with return URL (Django supports 'next' parameter)
      window.location.href = `/login/?next=${encodeURIComponent('/immersivecomics/story/create/')}`;
    }
    // If authenticated, let the Link component handle navigation normally
  }, [isAuthenticated]);

  // Track share click function - matches Django template pattern
  const trackShareClick = async (platform: string, contentId: number, contentType: 'episode' | 'story' = 'story') => {
    try {
      // Get CSRF token from meta tag or cookies
      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || 
                       document.cookie.split('; ').find(row => row.startsWith('csrftoken='))?.split('=')[1] || '';
      
      // Construct the full URL - endpoint is at /immersivecomics/api/track-share/
      const baseURL = process.env.REACT_APP_API_URL || '';
      const serverBase = baseURL.replace('/api/icvybz', '');
      const endpoint = `${serverBase}/immersivecomics/api/track-share/`;
      
      const payload: any = {
        platform: platform,
      };
      
      if (contentType === 'episode') {
        payload.episode_id = contentId;
      } else {
        payload.story_id = contentId;
      }
      
      await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken
        },
        credentials: 'include', // Include cookies for CSRF
        body: JSON.stringify(payload)
      });
    } catch (error) {
      // Silently fail - don't interrupt user experience
      if (process.env.NODE_ENV === 'development') {
        console.error('Error tracking share:', error);
      }
    }
  };

  // Share functions - use selected episode if available
  const handleShare = (platform: string, storyId: number) => {
    const selectedEpisode = selectedEpisodes.get(storyId);
    const story = comics.find(c => c.id === storyId);
    const storyDataForStory = storyData.get(storyId);
    
    // Use episode data if available, otherwise fall back to story data
    let shareTitle: string;
    let shareDescription: string;
    let shareUrl: string;
    let contentId: number;
    let contentType: 'episode' | 'story' = 'story';
    
    if (selectedEpisode) {
      // Share the selected episode
      // The episode's cover image will be used via Open Graph meta tags on the episode detail page
      shareTitle = `${story?.title || 'Amazing 3D Comic Story'} - Episode ${selectedEpisode.episode_number}`;
      shareDescription = selectedEpisode.description || story?.description || 'Check out this amazing 3D comic episode!';
      
      // Build episode URL if we have season info
      const seasons = storyDataForStory?.seasons || [];
      const season = seasons.find((s: any) => s.id === selectedEpisode.season);
      if (season) {
        shareUrl = `${window.location.origin}/immersivecomics/seasons/${season.id}/episodes/${selectedEpisode.id}/`;
      } else {
        shareUrl = window.location.href;
      }
      
      contentId = selectedEpisode.id;
      contentType = 'episode';
    } else {
      // Fall back to story sharing
      shareTitle = story?.title || 'Amazing 3D Comic Story';
      shareDescription = story?.description || 'Check out this amazing 3D comic story!';
      shareUrl = window.location.href;
      contentId = storyId;
      contentType = 'story';
    }
    
    // Track the share click
    trackShareClick(platform, contentId, contentType);
    
    let shareUrlWithParams = '';
    
    switch (platform) {
      case 'facebook':
        // Facebook supports image via Open Graph meta tags, but we can include it in the URL
        shareUrlWithParams = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
        break;
      case 'x_twitter':
        const twitterText = `${shareTitle} - ${shareDescription}`;
        shareUrlWithParams = `https://twitter.com/intent/tweet?text=${encodeURIComponent(twitterText)}&url=${encodeURIComponent(shareUrl)}`;
        break;
      case 'reddit':
        shareUrlWithParams = `https://reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(shareTitle)}`;
        break;
      default:
        return;
    }
    
    if (shareUrlWithParams) {
      window.open(shareUrlWithParams, '_blank', 'width=600,height=400');
    }
  };

  // Copy link to clipboard - use selected episode URL if available
  const handleCopyLink = async (e: React.MouseEvent<HTMLButtonElement>, storyId: number) => {
    e.preventDefault();
    
    const selectedEpisode = selectedEpisodes.get(storyId);
    const storyDataForStory = storyData.get(storyId);
    
    let urlToCopy: string;
    let contentId: number;
    let contentType: 'episode' | 'story' = 'story';
    
    if (selectedEpisode) {
      // Use episode URL
      const seasons = storyDataForStory?.seasons || [];
      const season = seasons.find((s: any) => s.id === selectedEpisode.season);
      if (season) {
        urlToCopy = `${window.location.origin}/immersivecomics/seasons/${season.id}/episodes/${selectedEpisode.id}/`;
      } else {
        urlToCopy = window.location.href;
      }
      contentId = selectedEpisode.id;
      contentType = 'episode';
    } else {
      // Fall back to current page URL
      urlToCopy = window.location.href;
      contentId = storyId;
      contentType = 'story';
    }
    
    // Track the share click
    trackShareClick('copy_link', contentId, contentType);
    
    try {
      await navigator.clipboard.writeText(urlToCopy);
      
      // Show success feedback
      const button = e.currentTarget;
      const originalHTML = button.innerHTML;
      button.innerHTML = '<i class="fas fa-check" style="color: #ffffff; font-size: 0.8rem;"></i>';
      button.style.backgroundColor = '#28a745';
      
      setTimeout(() => {
        button.innerHTML = originalHTML;
        button.style.backgroundColor = '#ffffff';
      }, 2000);
    } catch (err) {
      console.error('Could not copy text: ', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = urlToCopy;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      
      // Show success feedback
      const button = e.currentTarget;
      const originalHTML = button.innerHTML;
      button.innerHTML = '<i class="fas fa-check" style="color: #ffffff; font-size: 0.8rem;"></i>';
      button.style.backgroundColor = '#28a745';
      
      setTimeout(() => {
        button.innerHTML = originalHTML;
        button.style.backgroundColor = '#ffffff';
      }, 2000);
    }
  };
  
  // Handle episode selection from Comic3DViewer - with progressive dialogue loading
  const handleEpisodeSelect = useCallback(async (storyId: number, episode: any) => {
    console.log(`[Stories] handleEpisodeSelect called for episode ${episode.id} in story ${storyId}`);
    
    // Update selected episode
    setSelectedEpisodes(prev => {
      const newMap = new Map(prev);
      newMap.set(storyId, episode);
      return newMap;
    });
    
    // PROGRESSIVE LOADING: Load dialogues for this episode on-demand
    const storyDataForStory = storyData.get(storyId);
    const existingDialogues = storyDataForStory?.dialogues || [];
    
    // Check if dialogues for this episode are already loaded
    const episodeDialogues = existingDialogues.filter((d: any) => d.episode === episode.id);
    if (episodeDialogues.length > 0) {
      // Dialogues already loaded, no need to fetch
      console.log(`[Stories] Dialogues already loaded for episode ${episode.id}, count: ${episodeDialogues.length}`);
      return;
    }
    
    console.log(`[Stories] Loading dialogues for episode ${episode.id}...`);
    
    // Load dialogues for this specific episode (with deduplication)
    try {
      const dialogues = await cachedRequest(
        `dialogues-${episode.id}`,
        () => {
          console.log(`[Stories] Making API call to getDialogues(${episode.id})`);
          return apiService.getDialogues(episode.id);
        }
      );
      
      console.log(`[Stories] Dialogues loaded for episode ${episode.id}, count: ${dialogues.length}`);
      
      // Update story data with new dialogues
      setStoryData(prev => {
        const updated = new Map(prev);
        const currentData = updated.get(storyId) || {
          seasons: [],
          episodes: [],
          dialogues: [],
          collaborators: []
        };
        
        // Merge new dialogues with existing ones (avoid duplicates)
        const existingIds = new Set(currentData.dialogues.map((d: any) => d.id));
        const newDialogues = dialogues.filter((d: any) => !existingIds.has(d.id));
        
        console.log(`[Stories] Adding ${newDialogues.length} new dialogues to story ${storyId}`);
        
        updated.set(storyId, {
          ...currentData,
          dialogues: [...currentData.dialogues, ...newDialogues]
        });
        
        return updated;
      });
    } catch (error: any) {
      // If 403/401, it's expected for public stories when not authenticated
      if (error?.response?.status === 403 || error?.response?.status === 401) {
        console.log(`[Stories] Dialogues not available for episode ${episode.id} (auth required)`);
      } else {
        console.error(`[Stories] Failed to load dialogues for episode ${episode.id}:`, error);
        console.error(`[Stories] Error details:`, {
          status: error?.response?.status,
          message: error?.message,
          data: error?.response?.data
        });
      }
    }
  }, [storyData, cachedRequest]);

  // Load studio if studio ID is provided
  useEffect(() => {
    const loadStudio = async () => {
      if (studioId) {
        try {
          const studioData = await apiService.getStudio(parseInt(studioId));
          setStudio(studioData);
        } catch (err) {
          console.error('Failed to load studio:', err);
        }
      } else {
        setStudio(null);
      }
    };

    loadStudio();
  }, [studioId]);

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

  // Filter stories by studio if studio is provided
  useEffect(() => {
    console.log('Stories component: stories from context:', stories);
    console.log('Stories component: stories type:', typeof stories, 'Is array:', Array.isArray(stories));
    if (!stories || !Array.isArray(stories)) {
      console.log('Stories component: stories is not an array, setting filteredStories to []');
      setFilteredStories([]);
      return;
    }

    if (studio && studio.owner) {
      // Get owner ID
      const ownerId = typeof studio.owner === 'object' ? studio.owner.id : studio.owner;
      
      // Filter stories owned by the studio owner
      const filtered = stories.filter((story) => story.user === ownerId);
      setFilteredStories(filtered);
    } else {
      // No studio filter - show all stories
      setFilteredStories(stories);
    }
  }, [stories, studio]);

  // Update comics when filtered stories change - OPTIMIZED: Skip character loading for now (load on demand)
  useEffect(() => {
    if (!filteredStories || !Array.isArray(filteredStories)) {
      setComics([]);
      return;
    }

    // Convert stories to comics format - skip character loading for efficiency
    // Characters will be loaded on demand if needed
    const comicsData = filteredStories.map((story) => ({
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
      characters: [] // Load on demand if needed
    }));
    
        setComics(comicsData);
  }, [filteredStories]);

  // Load detailed story data - OPTIMIZED: Load on demand when story card is visible
  // This useEffect loads data for stories that haven't been loaded yet
  // Allow loading for unauthenticated users so they can see 3D models on public stories
  useEffect(() => {
    const loadStoryData = async () => {
      if (!stories || !Array.isArray(stories)) {
        setIsLoadingStoryData(false);
        return;
      }

      // Find stories that haven't been loaded yet (use filtered stories if studio filter is active)
      const storiesToLoad = (studio && filteredStories.length > 0 ? filteredStories : stories).filter(story => !loadedStoryIds.has(story.id));
      
      if (storiesToLoad.length === 0) {
        setIsLoadingStoryData(false);
        return;
      }

      // Mark stories as loading to prevent duplicate requests
      storiesToLoad.forEach(story => {
        if (!loadingRef.current.get(story.id)) {
          loadingRef.current.set(story.id, true);
        }
      });

      setIsLoadingStoryData(true);
      const newStoryData = new Map<number, {seasons: any[], episodes: any[], dialogues: any[], collaborators: any[]}>();
      
      // Use Promise.allSettled to handle individual failures gracefully
      const results = await Promise.allSettled(
        storiesToLoad.map(async (story) => {
          try {
            // Load seasons - may require auth, handle gracefully (with deduplication)
            let seasonsData: any[] = [];
            try {
              seasonsData = await cachedRequest(
                `seasons-${story.id}`,
                () => apiService.getSeasons(story.id)
              );
            } catch (error: any) {
              // If 403/401, it's expected for public stories when not authenticated
              if (error?.response?.status === 403 || error?.response?.status === 401) {
                if (process.env.NODE_ENV === 'development') {
                  console.log(`[Stories] Seasons not available for public story ${story.id} (auth required)`);
                }
              } else {
                console.error(`[Stories] Failed to load seasons for story ${story.id}:`, error);
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
            
            // Load episodes for all seasons in parallel - may require auth (with deduplication)
            let allEpisodes: any[] = [];
            try {
              const episodePromises = seasonsData.map(season => 
                cachedRequest(
                  `episodes-${season.id}`,
                  () => apiService.getEpisodes(season.id)
                )
              );
              const episodeResults = await Promise.all(episodePromises);
              allEpisodes = episodeResults.flat();
            } catch (error: any) {
              // If 403/401, it's expected for public stories when not authenticated
              if (error?.response?.status === 403 || error?.response?.status === 401) {
                if (process.env.NODE_ENV === 'development') {
                  console.log(`[Stories] Episodes not available for public story ${story.id} (auth required)`);
                }
              } else {
                console.error(`[Stories] Failed to load episodes for story ${story.id}:`, error);
              }
              // Continue with empty episodes
            }
            
            // PROGRESSIVE LOADING: Don't load dialogues upfront - load on-demand when episode is selected
            // This significantly reduces initial load time and API calls
            let allDialogues: any[] = [];
            
            // Load collaborators for this story (with deduplication)
            // Only show StoryCollaborator objects (those selected via checkbox system)
            // Exclude CollaborationInvite objects entirely
            let collaboratorsData: any[] = [];
            try {
              // Try to load collaborators - might fail if story is private and user is not authenticated
              // This is okay, we'll just show no collaborators
              const allCollaborators = await cachedRequest(
                `collaborators-${story.id}`,
                () => collaborationService.getCollaborators(story.id)
              );
              
              // Filter to show ONLY StoryCollaborator objects (those with user field and is_active === true)
              // These are the collaborators selected through the checkbox system
              collaboratorsData = (allCollaborators || []).filter((collab: any) => {
                // Only show StoryCollaborator objects: has user field (nested with username) and is_active
                // Exclude all CollaborationInvite objects (those with invitee_user or invitee_email)
                if (collab.user && collab.user.username && collab.is_active !== false) {
                  return true;
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
          setLoadedStoryIds(prev => {
            const newSet = new Set(prev);
            newSet.add(result.value.storyId);
            return newSet;
          });
        } else {
          // Fallback for rejected promises
          const story = storiesToLoad[index];
          if (story) {
                  newStoryData.set(story.id, {
                    seasons: [],
                    episodes: [],
                    dialogues: [],
                    collaborators: []
                  });
            setLoadedStoryIds(prev => {
              const newSet = new Set(prev);
              newSet.add(story.id);
              return newSet;
            });
          }
        }
        // Clear loading flag
        const story = storiesToLoad[index];
        if (story) {
          loadingRef.current.delete(story.id);
        }
      });
      
      // Merge new data with existing data
      setStoryData(prev => {
        const merged = new Map(prev);
        newStoryData.forEach((value, key) => merged.set(key, value));
        return merged;
      });
      
      setIsLoadingStoryData(false);
    };
    
    loadStoryData();
  }, [stories, filteredStories, studio, loadedStoryIds, cachedRequest]);

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
      <MetaTags
        title="Immersive Stories"
        description="Browse all published interactive & immersive stories"
        keywords="3D comics, published stories, interactive narratives, immersive comics"
      />
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
                    <h5 className="subtext-btn-sm mb-1">
                      {comic.title}
                      {storyData.has(comic.id) && (() => {
                        const storySeasons = storyData.get(comic.id)?.seasons || [];
                        const storyEpisodes = storyData.get(comic.id)?.episodes || [];
                        // Find the season from the first episode (which Comic3DViewer auto-selects)
                        const firstEpisode = storyEpisodes[0];
                        if (firstEpisode && storySeasons.length > 0) {
                          const season = storySeasons.find((s: any) => s.id === firstEpisode.season);
                          if (season) {
                            return <span className="text-muted"> - Season {season.season_number}</span>;
                          }
                        }
                        // Fallback: show first season if available
                        if (storySeasons.length > 0) {
                          return <span className="text-muted"> - Season {storySeasons[0].season_number}</span>;
                        }
                        return null;
                      })()}
                    </h5>
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
                  
                  <div className="mb-2">
                    <p 
                      className={`subtext-btn-sm text-muted mb-0 story-description ${expandedDescriptions.has(comic.id) ? 'expanded' : 'collapsed'}`}
                    >
                    {comic.description}
                  </p>
                    {comic.description && comic.description.length > 100 && (
                      <button
                        className="btn btn-link p-0 text-primary text-decoration-none"
                        style={{ fontSize: '0.85rem', paddingTop: '0.25rem' }}
                        onClick={() => {
                          setExpandedDescriptions(prev => {
                            const newSet = new Set(prev);
                            if (newSet.has(comic.id)) {
                              newSet.delete(comic.id);
                            } else {
                              newSet.add(comic.id);
                            }
                            return newSet;
                          });
                        }}
                      >
                        {expandedDescriptions.has(comic.id) ? 'Show less' : '... Show more'}
                      </button>
                    )}
                  </div>
                  
                  {/* 3D Comic Viewer - Read-only mode */}
                  {storyData.has(comic.id) && (
                    <div className="mb-2">
                      <Comic3DViewer
                        episodes={storyData.get(comic.id)?.episodes || []}
                        dialogues={storyData.get(comic.id)?.dialogues || []}
                        seasons={storyData.get(comic.id)?.seasons || []}
                        storyId={comic.id}
                        readOnly={true}
                        onEpisodeSelect={(episode) => {
                          handleEpisodeSelect(comic.id, episode);
                        }}
                      />
                    </div>
                  )}
                  
                  {/* Views Count Section - Above Collaborators */}
                  {storyData.has(comic.id) && (() => {
                    const episodes = storyData.get(comic.id)?.episodes || [];
                    const totalViews = episodes.reduce((sum: number, episode: any) => {
                      // Handle both view_count (from API) and viewCount (camelCase) for compatibility
                      const views = episode.view_count || episode.viewCount || 0;
                      return sum + (typeof views === 'number' ? views : 0);
                    }, 0);
                    // Always show the views count section, even if 0, to match the pattern
                    return (
                      <div className="d-flex justify-content-start align-items-center mb-2">
                        <span 
                          className="badge" 
                          style={{ 
                            background: 'transparent', 
                            color: '#111e7f',
                            fontSize: '0.85rem',
                            padding: '0.35rem 0.65rem'
                          }}
                        >
                          
                          {totalViews} views
                        </span>
                      </div>
                    );
                  })()}
                  
                  {/* Collaborators Section - Below 3D Viewer */}
                  {storyData.has(comic.id) && (
                    <div className="mb-2">
                      <div className="card border-0 shadow-sm">
                        <div className="card-header bg-transparent border-bottom border-top p-2">
                          <h6 className="subtext-btn-sm mb-0">
                            <i className="fas fa-users me-2"></i>
                            &nbsp;Collaborators ({(() => {
                              const collaborators = storyData.get(comic.id)?.collaborators || [];
                              // Only count StoryCollaborator objects (selected via checkbox)
                              const storyCollaborators = collaborators.filter((collab: any) => 
                                collab.user && collab.user.username && collab.is_active !== false
                              );
                              return storyCollaborators.length;
                            })()})
                          </h6>
                        </div>
                        <div className="card-body p-2">
                          {(() => {
                            const collaborators = storyData.get(comic.id)?.collaborators || [];
                            // Only show StoryCollaborator objects (selected via checkbox)
                            const storyCollaborators = collaborators.filter((collab: any) => 
                              collab.user && collab.user.username && collab.is_active !== false
                            );
                            
                            return storyCollaborators.length > 0 ? (
                              <div className="d-flex flex-wrap gap-2">
                                {storyCollaborators.map((collaborator: any) => {
                                  // StoryCollaborator: has user field directly
                                  const displayName = `@${collaborator.user.username}`;
                                  const key = collaborator.id || `${collaborator.user?.id}-${collaborator.role || 'collaborator'}`;
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
                  
                  {/* Social Media Sharing Section - After Collaborators */}
                  {storyData.has(comic.id) && (
                    <div className="mb-3">
                      <div className="card border-0 shadow-sm">
                        <div className="card-body p-2">
                          <div className="d-flex justify-content-center justify-content-md-end gap-2 align-items-center">
                            {/* Facebook Share */}
                            <button 
                              type="button"
                              onClick={() => handleShare('facebook', comic.id)}
                              className="btn btn-outline-dark btn-sm rounded-circle share-btn"
                              style={{
                                backgroundColor: '#ffffff',
                                border: '1px solid #000000',
                                width: '35px',
                                height: '35px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.3s ease'
                              }}
                              title="Share on Facebook"
                            >
                              <i className="fab fa-facebook-f" style={{ color: '#000000', fontSize: '0.8rem' }}></i>
                            </button>
                            
                            {/* X (Twitter) Share */}
                            <button 
                              type="button"
                              onClick={() => handleShare('x_twitter', comic.id)}
                              className="btn btn-outline-dark btn-sm rounded-circle share-btn"
                              style={{
                                backgroundColor: '#ffffff',
                                border: '1px solid #000000',
                                width: '35px',
                                height: '35px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.3s ease'
                              }}
                              title="Share on X (Twitter)"
                            >
                              <i className="fab fa-x-twitter" style={{ color: '#000000', fontSize: '0.8rem' }}></i>
                            </button>
                            
                            {/* Reddit Share */}
                            <button 
                              type="button"
                              onClick={() => handleShare('reddit', comic.id)}
                              className="btn btn-outline-dark btn-sm rounded-circle share-btn"
                              style={{
                                backgroundColor: '#ffffff',
                                border: '1px solid #000000',
                                width: '35px',
                                height: '35px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.3s ease'
                              }}
                              title="Share on Reddit"
                            >
                              <i className="fab fa-reddit-alien" style={{ color: '#000000', fontSize: '0.8rem' }}></i>
                            </button>
                            
                            {/* Copy Link */}
                            <button 
                              type="button"
                              onClick={(e) => handleCopyLink(e, comic.id)}
                              className="btn btn-outline-dark btn-sm rounded-circle share-btn"
                              style={{
                                backgroundColor: '#ffffff',
                                border: '1px solid #000000',
                                width: '35px',
                                height: '35px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.3s ease'
                              }}
                              title="Copy link"
                            >
                              <i className="fas fa-link" style={{ color: '#000000', fontSize: '0.8rem' }}></i>
                            </button>
                          </div>
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
        to={isAuthenticated ? "/immersivecomics/story/create/" : "#"}
        className="btn btn-primary rounded-circle position-fixed create-story-btn"
        style={{ 
          bottom: '40px', 
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