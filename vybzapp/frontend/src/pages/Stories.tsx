import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import Comic3DViewer from '../components/Comic3DViewer';
import MetaTags from '../components/MetaTags';
import { useApi } from '../contexts/ApiContext';
import apiService from '../services/api';
import { collaborationService } from '../services/collaborationService';
import { filterPublicStoriesForStudio } from '../utils/studioScope';
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
  total_views?: number; // Total view count across all episodes (calculated by backend)
}

const sortEpisodesChronologically = (episodes: any[], seasons: any[]) => {
  const seasonNumberById = new Map<number, number>();
  (seasons || []).forEach((season: any) => {
    seasonNumberById.set(season.id, Number(season.season_number) || 0);
  });

  return [...(episodes || [])].sort((a: any, b: any) => {
    const seasonA = seasonNumberById.get(a.season) ?? 0;
    const seasonB = seasonNumberById.get(b.season) ?? 0;
    if (seasonA !== seasonB) return seasonA - seasonB;

    const episodeA = Number(a.episode_number) || 0;
    const episodeB = Number(b.episode_number) || 0;
    if (episodeA !== episodeB) return episodeA - episodeB;

    const createdA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const createdB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return createdA - createdB;
  });
};

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

  // Create story button removed - now handled by FloatingActionMenu in Layout

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
    const button = e.currentTarget;
    if (!button) return;

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
    
    const showCopiedFeedback = () => {
      if (!button.isConnected) return;
      const originalHTML = button.innerHTML;
      button.innerHTML = '<i class="fas fa-check"></i>';
      button.classList.add('is-copied');
      window.setTimeout(() => {
        if (!button.isConnected) return;
        button.innerHTML = originalHTML;
        button.classList.remove('is-copied');
      }, 2000);
    };

    try {
      await navigator.clipboard.writeText(urlToCopy);
      showCopiedFeedback();
    } catch (err) {
      console.error('Could not copy text: ', err);
      try {
        const textArea = document.createElement('textarea');
        textArea.value = urlToCopy;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showCopiedFeedback();
      } catch (fallbackErr) {
        console.error('Clipboard fallback failed: ', fallbackErr);
      }
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
      setFilteredStories(filterPublicStoriesForStudio(stories, studio));
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
              total_views: story.total_views || 0, // Include total_views from API
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
                `seasons-${story.id}-catalogue`,
                () => apiService.getSeasons(story.id, { catalogue: true })
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
                  `episodes-${season.id}-catalogue`,
                  () => apiService.getEpisodes(season.id, { catalogue: true })
                )
              );
              const episodeResults = await Promise.all(episodePromises);
              allEpisodes = sortEpisodesChronologically(episodeResults.flat(), seasonsData);
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
      <div className="product-landing stories-landing">
        <div className="product-landing__container product-landing__section">
          <div className="store-page__error" role="alert">
            <i className="fas fa-exclamation-triangle" aria-hidden />
            <span>{error}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="product-landing stories-landing">
      <MetaTags
        title="Immersive Comics"
        description="Browse all published interactive & immersive stories"
        keywords="3D comics, published stories, interactive narratives, immersive comics"
      />

      <section className="product-landing__section product-landing__hero">
        <div className="product-landing__container">
          <p className="product-landing__eyebrow">{studio ? 'Studio' : 'Browse'}</p>
          <h1 className="product-landing__h1">
            {studio?.name ? `Stories — ${studio.name}` : 'Immersive Comics'}
          </h1>
          <p className="product-landing__lead">
            {studio
              ? 'Published stories linked to this studio. Open a card to preview in 3D and share episodes.'
              : 'Explore published stories — explore scenes and collaborators, and share your favorites.'}
          </p>
          {studio && (
            <div className="stories-landing__contextStrip">
              <span>
                Filtered by <strong>{studio.name}</strong>
              </span>
              <Link to="/immersivecomics/" className="stories-landing__textLink">
                Show all stories
              </Link>
              <Link to={`/immersivecomics/studio/${studio.id}/`} className="stories-landing__btnPrimary">
                Studio profile
              </Link>
            </div>
          )}
        </div>
      </section>

      {comics.length === 0 ? (
        <section className="product-landing__section">
          <div className="product-landing__container">
            <div className="stories-landing__empty">
              <div className="stories-landing__emptyIcon" aria-hidden>
                <i className="fas fa-book-open" />
              </div>
              <h2 className="product-landing__h2" style={{ fontSize: '1.25rem' }}>
                No published stories yet
              </h2>
              <p className="product-landing__body" style={{ marginTop: '0.5rem' }}>
                Create and publish your first 3D comic story to have it appear here.
              </p>
              <Link to="/immersivecomics/story/create/" className="stories-landing__btnPrimary mt-3 d-inline-flex">
                <i className="fas fa-plus me-2" aria-hidden />
                Create your first story
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <section className="product-landing__section">
          <div className="product-landing__container">
            <div
              className={
                comics.length === 1
                  ? 'stories-landing__grid stories-landing__grid--single'
                  : 'stories-landing__grid'
              }
            >
              {comics.map((comic) => (
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

                  <h2 className="stories-landing__cardTitle">
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
                  </h2>

                  <div>
                    <p
                      className={`product-landing__body story-description mb-0 ${
                        expandedDescriptions.has(comic.id) ? 'expanded' : 'collapsed'
                      }`}
                      style={{ color: 'rgba(15, 23, 42, 0.62)', fontSize: '0.92rem' }}
                    >
                      {comic.description}
                    </p>
                    {comic.description && comic.description.length > 100 && (
                      <button
                        type="button"
                        className="stories-landing__descMore"
                        onClick={() => {
                          setExpandedDescriptions((prev) => {
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
                        {expandedDescriptions.has(comic.id) ? 'Show less' : 'Show more'}
                      </button>
                    )}
                  </div>
                  </div>

                  {storyData.has(comic.id) && (
                    <div className="stories-landing__viewerWrap">
                      <Comic3DViewer
                        episodes={storyData.get(comic.id)?.episodes || []}
                        dialogues={storyData.get(comic.id)?.dialogues || []}
                        seasons={storyData.get(comic.id)?.seasons || []}
                        storyId={comic.id}
                        readOnly={true}
                        onEpisodeSelect={(episode) => {
                          handleEpisodeSelect(comic.id, episode);
                        }}
                        onViewIncremented={(storyId, storyTotalViews) => {
                          setComics((prev) =>
                            prev.map((c) =>
                              c.id === storyId
                                ? {
                                    ...c,
                                    total_views:
                                      typeof storyTotalViews === 'number'
                                        ? storyTotalViews
                                        : (c.total_views || 0) + 1,
                                  }
                                : c
                            )
                          );
                          setFilteredStories((prev) =>
                            prev.map((s) =>
                              s.id === storyId
                                ? {
                                    ...s,
                                    total_views:
                                      typeof storyTotalViews === 'number'
                                        ? storyTotalViews
                                        : (s.total_views || 0) + 1,
                                  }
                                : s
                            )
                          );
                        }}
                      />
                    </div>
                  )}

                  <div className="stories-landing__cardFooter">
                  <p className="stories-landing__meta" aria-label="Total story views">
                    <span className="stories-landing__metaNum">{(comic.total_views || 0).toLocaleString()}</span>{' '}
                    views
                  </p>

                  {storyData.has(comic.id) && (
                    <div className="stories-landing__subsection">
                      <div className="stories-landing__subsectionLabel">
                        Collaborators (
                        {(() => {
                          const collaborators = storyData.get(comic.id)?.collaborators || [];
                          const storyCollaborators = collaborators.filter(
                            (collab: any) => collab.user && collab.user.username && collab.is_active !== false
                          );
                          return storyCollaborators.length;
                        })()}
                        )
                      </div>
                      {(() => {
                        const collaborators = storyData.get(comic.id)?.collaborators || [];
                        const storyCollaborators = collaborators.filter(
                          (collab: any) => collab.user && collab.user.username && collab.is_active !== false
                        );

                        if (storyCollaborators.length === 0) {
                          return <p className="stories-landing__chipMuted mb-0">No collaborators listed.</p>;
                        }

                        const collaboratorsByUser = new Map();
                        storyCollaborators.forEach((collaborator: any) => {
                          const userId = collaborator.user?.id;
                          if (!userId) return;

                          if (!collaboratorsByUser.has(userId)) {
                            collaboratorsByUser.set(userId, {
                              user: collaborator.user,
                              roles: [],
                            });
                          }
                          if (collaborator.role) {
                            collaboratorsByUser.get(userId).roles.push(collaborator.role);
                          }
                        });

                        return (
                          <div className="stories-landing__chips">
                            {Array.from(collaboratorsByUser.values()).map((collab: any) => {
                              const displayName = `@${collab.user.username}`;
                              const key = `${collab.user.id}`;
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
                  )}

                  {storyData.has(comic.id) && (
                    <div className="stories-landing__shareRow" role="group" aria-label="Share this story">
                      <button
                        type="button"
                        onClick={() => handleShare('facebook', comic.id)}
                        className="stories-landing__shareBtn"
                        title="Share on Facebook"
                      >
                        <i className="fab fa-facebook-f" aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleShare('x_twitter', comic.id)}
                        className="stories-landing__shareBtn"
                        title="Share on X (Twitter)"
                      >
                        <i className="fab fa-x-twitter" aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleShare('reddit', comic.id)}
                        className="stories-landing__shareBtn"
                        title="Share on Reddit"
                      >
                        <i className="fab fa-reddit-alien" aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleCopyLink(e, comic.id)}
                        className="stories-landing__shareBtn"
                        title="Copy link"
                      >
                        <i className="fas fa-link" aria-hidden />
                      </button>
                    </div>
                  )}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default Stories;