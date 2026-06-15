import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { apiService, Story, Season, SeasonCreateData, Character, Episode, Dialogue, Studio, AudioTrack } from '../services/api';

export interface User {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  is_active?: boolean;
  is_email_verified?: boolean;
  avatar?: string;
}

interface ApiContextType {
  // State
  stories: Story[];
  seasons: Season[];
  characters: Character[];
  episodes: Episode[];
  dialogues: Dialogue[];
  studios: Studio[];
  audioTracks: AudioTrack[];
  currentStory: Story | null;
  currentSeason: Season | null;
  currentEpisode: Episode | null;
  myStudio: Studio | null;
  currentUser: User | null;
  
  // Loading states
  isLoading: boolean;
  error: string | null;
  
  // Actions
  loadStories: () => Promise<void>;
  loadPublicStories: () => Promise<void>;
  loadStory: (id: number) => Promise<Story>;
  createStory: (storyData: Partial<Story>) => Promise<Story>;
  updateStory: (id: number, storyData: Partial<Story>) => Promise<Story>;
  deleteStory: (id: number) => Promise<void>;
  
  loadSeasons: (storyId: number) => Promise<Season[]>;
  createSeason: (storyId: number, seasonData: SeasonCreateData) => Promise<Season>;
  updateSeason: (id: number, seasonData: Partial<SeasonCreateData>) => Promise<Season>;
  deleteSeason: (id: number) => Promise<void>;
  
  loadCharacters: (storyId: number) => Promise<void>;
  createCharacter: (storyId: number, characterData: Partial<Character>) => Promise<Character>;
  updateCharacter: (id: number, characterData: Partial<Character>) => Promise<Character>;
  deleteCharacter: (id: number) => Promise<void>;
  
  loadEpisodes: (seasonId: number) => Promise<Episode[]>;
  createEpisode: (seasonId: number, episodeData: Partial<Episode>) => Promise<Episode>;
  updateEpisode: (id: number, episodeData: Partial<Episode>) => Promise<Episode>;
  deleteEpisode: (id: number) => Promise<void>;
  
  loadDialogues: (episodeId: number) => Promise<void>;
  createDialogue: (episodeId: number, dialogueData: Partial<Dialogue>) => Promise<Dialogue>;
  updateDialogue: (id: number, dialogueData: Partial<Dialogue>) => Promise<Dialogue>;
  deleteDialogue: (id: number) => Promise<void>;
  
  loadStudios: () => Promise<void>;
  loadMyStudio: () => Promise<void>;
  createStudio: (studioData: Partial<Studio>) => Promise<Studio>;
  updateStudio: (id: number, studioData: Partial<Studio>) => Promise<Studio>;
  deleteStudio: (id: number) => Promise<void>;
  
  loadAudioTracks: () => Promise<void>;
  createAudioTrack: (audioData: Partial<AudioTrack>) => Promise<AudioTrack>;
  updateAudioTrack: (id: number, audioData: Partial<AudioTrack>) => Promise<AudioTrack>;
  deleteAudioTrack: (id: number) => Promise<void>;
  
  // Auth
  loadCurrentUser: () => Promise<void>;
  clearUser: () => void;
  login: (username: string, password: string) => Promise<{ token: string; user: User }>;
  register: (userData: { username: string; email: string; password: string; password2: string; first_name?: string; last_name?: string; accept_terms: boolean }) => Promise<{ token: string; user: User; message: string; email_verification_required: boolean }>;
  logout: () => Promise<void>;
  
  // Utility
  clearError: () => void;
  clearStories: () => void;
  reloadAllData: () => Promise<void>;
  setCurrentStory: (story: Story | null) => void;
  setCurrentSeason: (season: Season | null) => void;
  setCurrentEpisode: (episode: Episode | null) => void;
}

const ApiContext = createContext<ApiContextType | undefined>(undefined);

export const useApi = () => {
  const context = useContext(ApiContext);
  if (context === undefined) {
    throw new Error('useApi must be used within an ApiProvider');
  }
  return context;
};

interface ApiProviderProps {
  children: ReactNode;
}

export const ApiProvider: React.FC<ApiProviderProps> = ({ children }) => {
  // State
  const [stories, setStories] = useState<Story[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [dialogues, setDialogues] = useState<Dialogue[]>([]);
  const [studios, setStudios] = useState<Studio[]>([]);
  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>([]);
  const [currentStory, setCurrentStory] = useState<Story | null>(null);
  const [currentSeason, setCurrentSeason] = useState<Season | null>(null);
  const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null);
  const [myStudio, setMyStudio] = useState<Studio | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper function to handle API calls
  const handleApiCall = useCallback(async <T,>(apiCall: () => Promise<T>): Promise<T> => {
    console.log('ApiContext: Setting isLoading to true');
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiCall();
      console.log('ApiContext: API call successful, setting isLoading to false');
      return result;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'An error occurred';
      setError(errorMessage);
      console.log('ApiContext: API call failed, setting isLoading to false');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Stories
  const loadStories = useCallback(async () => {
    const stories = await handleApiCall(() => apiService.getStories());
    console.log('ApiContext: loadStories returned', stories);
    console.log('ApiContext: Total stories:', stories?.length || 0);
    console.log('ApiContext: Draft stories:', stories?.filter(s => !s.is_public) || []);
    console.log('ApiContext: Public stories:', stories?.filter(s => s.is_public) || []);
    setStories(stories);
  }, [handleApiCall]);

  const loadPublicStories = useCallback(async () => {
    const stories = await handleApiCall(() => apiService.getPublicStories());
    console.log('ApiContext: loadPublicStories returned', stories);
    console.log('ApiContext: Stories type:', typeof stories, 'Is array:', Array.isArray(stories));
    console.log('ApiContext: Stories length:', stories?.length || 0);
    setStories(stories);
  }, [handleApiCall]);

  const loadStory = useCallback(async (id: number) => {
    const story = await handleApiCall(() => apiService.getStory(id));
    setCurrentStory(story);
    return story;
  }, [handleApiCall]);

  const createStory = async (storyData: Partial<Story>) => {
    const story = await handleApiCall(() => apiService.createStory(storyData));
    setStories(prev => [...prev, story]);
    return story;
  };

  const updateStory = async (id: number, storyData: Partial<Story>) => {
    const story = await handleApiCall(() => apiService.updateStory(id, storyData));
    setStories(prev => prev.map(s => s.id === id ? story : s));
    if (currentStory?.id === id) {
      setCurrentStory(story);
    }
    return story;
  };

  const deleteStory = async (id: number) => {
    await handleApiCall(() => apiService.deleteStory(id));
    setStories(prev => prev.filter(s => s.id !== id));
    if (currentStory?.id === id) {
      setCurrentStory(null);
    }
  };

  // Seasons
  const loadSeasons = useCallback(async (storyId: number) => {
    const seasons = await handleApiCall(() => apiService.getSeasons(storyId));
    setSeasons(seasons);
    return seasons;
  }, [handleApiCall]);

  const createSeason = async (storyId: number, seasonData: SeasonCreateData) => {
    const season = await handleApiCall(() => apiService.createSeason(storyId, seasonData));
    setSeasons(prev => [...prev, season]);
    return season;
  };

  const updateSeason = async (id: number, seasonData: Partial<SeasonCreateData>) => {
    const season = await handleApiCall(() => apiService.updateSeason(id, seasonData));
    setSeasons(prev => prev.map(s => s.id === id ? season : s));
    if (currentSeason?.id === id) {
      setCurrentSeason(season);
    }
    return season;
  };

  const deleteSeason = async (id: number) => {
    await handleApiCall(() => apiService.deleteSeason(id));
    setSeasons(prev => prev.filter(s => s.id !== id));
    if (currentSeason?.id === id) {
      setCurrentSeason(null);
    }
  };

  // Characters
  const loadCharacters = useCallback(async (storyId: number) => {
    const characters = await handleApiCall(() => apiService.getCharacters(storyId));
    setCharacters(characters);
  }, [handleApiCall]);

  const createCharacter = async (storyId: number, characterData: Partial<Character>) => {
    const character = await handleApiCall(() => apiService.createCharacter(storyId, characterData));
    setCharacters(prev => [...prev, character]);
    return character;
  };

  const updateCharacter = async (id: number, characterData: Partial<Character>) => {
    const character = await handleApiCall(() => apiService.updateCharacter(id, characterData));
    setCharacters(prev => prev.map(c => c.id === id ? character : c));
    return character;
  };

  const deleteCharacter = async (id: number) => {
    await handleApiCall(() => apiService.deleteCharacter(id));
    setCharacters(prev => prev.filter(c => c.id !== id));
  };

  // Episodes
  const loadEpisodes = useCallback(async (seasonId: number) => {
    const episodes = await handleApiCall(() => apiService.getEpisodes(seasonId));
    setEpisodes(episodes);
    return episodes;
  }, [handleApiCall]);

  const createEpisode = useCallback(async (seasonId: number, episodeData: Partial<Episode>) => {
    const episode = await handleApiCall(() => apiService.createEpisode(seasonId, episodeData));
    setEpisodes(prev => [...prev, episode]);
    return episode;
  }, [handleApiCall]);

  const updateEpisode = useCallback(async (id: number, episodeData: Partial<Episode>) => {
    const episode = await handleApiCall(() => apiService.updateEpisode(id, episodeData));
    setEpisodes(prev => prev.map(e => e.id === id ? episode : e));
    if (currentEpisode?.id === id) {
      setCurrentEpisode(episode);
    }
    return episode;
  }, [handleApiCall, currentEpisode]);

  const deleteEpisode = useCallback(async (id: number) => {
    await handleApiCall(() => apiService.deleteEpisode(id));
    setEpisodes(prev => prev.filter(e => e.id !== id));
    if (currentEpisode?.id === id) {
      setCurrentEpisode(null);
    }
  }, [handleApiCall, currentEpisode]);

  // Dialogues
  const loadDialogues = useCallback(async (episodeId: number) => {
    const dialogues = await handleApiCall(() => apiService.getDialogues(episodeId));
    setDialogues(dialogues);
  }, [handleApiCall]);

  const createDialogue = async (episodeId: number, dialogueData: Partial<Dialogue>) => {
    const dialogue = await handleApiCall(() => apiService.createDialogue(episodeId, dialogueData));
    setDialogues(prev => [...prev, dialogue]);
    return dialogue;
  };

  const updateDialogue = async (id: number, dialogueData: Partial<Dialogue>) => {
    const dialogue = await handleApiCall(() => apiService.updateDialogue(id, dialogueData));
    setDialogues(prev => prev.map(d => d.id === id ? dialogue : d));
    return dialogue;
  };

  const deleteDialogue = async (id: number) => {
    await handleApiCall(() => apiService.deleteDialogue(id));
    setDialogues(prev => prev.filter(d => d.id !== id));
  };

  // Studios
  const loadStudios = useCallback(async () => {
    try {
      const studios = await apiService.getStudios();
      console.log('ApiContext: loadStudios returned', studios);
      console.log('ApiContext: Studios count:', studios?.length || 0);
      setStudios(studios || []);
    } catch (err: any) {
      const status = err?.response?.status;
      const errorMessage = err?.response?.data?.detail || err?.message || 'Unknown error';
      if (status === 403 || status === 401) {
        console.warn('[ApiContext] Auth error loading studios (may be expected for public endpoint):', status, errorMessage);
      } else {
        console.error('[ApiContext] Failed to load studios:', status, errorMessage, err);
      }
      // Don't throw - return empty array instead
      setStudios([]);
      throw err; // Re-throw so components can handle it
    }
  }, []);

  const loadMyStudio = useCallback(async () => {
    const studio = await handleApiCall(() => apiService.getMyStudio());
    console.log('ApiContext: loadMyStudio returned', studio);
    setMyStudio(studio);
  }, [handleApiCall]);

  const createStudio = async (studioData: Partial<Studio>) => {
    const studio = await handleApiCall(() => apiService.createStudio(studioData));
    setStudios(prev => [...prev, studio]);
    return studio;
  };

  const updateStudio = async (id: number, studioData: Partial<Studio>) => {
    const studio = await handleApiCall(() => apiService.updateStudio(id, studioData));
    setStudios(prev => prev.map(s => s.id === id ? studio : s));
    if (myStudio?.id === id) {
      setMyStudio(studio);
    }
    return studio;
  };

  const deleteStudio = async (id: number) => {
    await handleApiCall(() => apiService.deleteStudio(id));
    setStudios(prev => prev.filter(s => s.id !== id));
    if (myStudio?.id === id) {
      setMyStudio(null);
    }
  };

  // Audio Tracks
  const loadAudioTracks = useCallback(async () => {
    const audioTracks = await handleApiCall(() => apiService.getAudioTracks());
    setAudioTracks(audioTracks);
  }, [handleApiCall]);

  const createAudioTrack = async (audioData: Partial<AudioTrack>) => {
    const audioTrack = await handleApiCall(() => apiService.createAudioTrack(audioData));
    setAudioTracks(prev => [...prev, audioTrack]);
    return audioTrack;
  };

  const updateAudioTrack = async (id: number, audioData: Partial<AudioTrack>) => {
    const audioTrack = await handleApiCall(() => apiService.updateAudioTrack(id, audioData));
    setAudioTracks(prev => prev.map(a => a.id === id ? audioTrack : a));
    return audioTrack;
  };

  const deleteAudioTrack = async (id: number) => {
    await handleApiCall(() => apiService.deleteAudioTrack(id));
    setAudioTracks(prev => prev.filter(a => a.id !== id));
  };

  // Utility functions
  const clearError = () => setError(null);
  const clearStories = () => setStories([]);
  
  // Method to reload all data (useful after login)
  const reloadAllData = useCallback(async () => {
    const token = localStorage.getItem('authToken');
    if (token) {
      await Promise.all([
        loadStories(),
        loadStudios(),
        loadMyStudio(),
        loadAudioTracks()
      ]);
    }
  }, [loadStories, loadStudios, loadMyStudio, loadAudioTracks]);

  // Auth functions
  const loadCurrentUser = useCallback(async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setCurrentUser(null);
        return;
      }
      const user = await apiService.getCurrentUser();
      setCurrentUser(user);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 403 || status === 401) {
        // Token is invalid, clear user
        setCurrentUser(null);
        localStorage.removeItem('authToken');
      } else {
        console.error('[ApiContext] Failed to load current user:', err);
      }
    }
  }, []);

  const clearUser = useCallback(() => {
    setCurrentUser(null);
    localStorage.removeItem('authToken');
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    try {
      const result = await apiService.login(username, password);
      localStorage.setItem('authToken', result.token);
      setCurrentUser(result.user);
      // Reload data after login
      await loadCurrentUser(); // Load user first
      await reloadAllData(); // Then reload all other data
      
      // Trigger cart refresh after login (cart is preserved on backend)
      // The CartContext will automatically refresh on next fetchCart call
      // We dispatch a custom event that CartContext can listen to
      window.dispatchEvent(new Event('cart:refresh'));
      
      return result;
    } catch (err: any) {
      console.error('[ApiContext] Login failed:', err);
      throw err;
    }
  }, [reloadAllData, loadCurrentUser]);

  const register = useCallback(async (userData: { username: string; email: string; password: string; password2: string; first_name?: string; last_name?: string; accept_terms: boolean }) => {
    const result = await apiService.register(userData);
    localStorage.setItem('authToken', result.token);
    setCurrentUser(result.user);
    reloadAllData().catch((err) => {
      console.warn('[ApiContext] Post-registration data reload failed:', err);
    });
    return result;
  }, [reloadAllData]);

  const logout = useCallback(async () => {
    try {
      await apiService.logout();
    } catch (err: any) {
      // Ignore errors - token will be cleared anyway
      console.log('[ApiContext] Logout API error (non-critical):', err);
    } finally {
      // Always clear user state and token
      setCurrentUser(null);
      localStorage.removeItem('authToken');
      // Clear all data
      setStories([]);
      setSeasons([]);
      setCharacters([]);
      setEpisodes([]);
      setDialogues([]);
      setStudios([]);
      setAudioTracks([]);
      setMyStudio(null);
      setCurrentStory(null);
      setCurrentSeason(null);
      setCurrentEpisode(null);
    }
  }, []);

  // Load initial data (only run once on mount)
  useEffect(() => {
    // Check if user is authenticated before making API calls
    const token = localStorage.getItem('authToken');
    if (token) {
      // Load current user first
      loadCurrentUser().catch(err => {
        console.warn('[ApiContext] Failed to load current user:', err);
      });
      
      // Load data in parallel, but handle errors gracefully
      Promise.all([
        loadStories().catch(err => {
          // Log all errors for debugging, but handle auth errors gracefully
          const status = err?.response?.status;
          if (status === 403 || status === 401) {
            console.warn('[ApiContext] Auth error loading stories (token may be invalid):', status);
          } else {
            console.error('[ApiContext] Failed to load stories:', err);
          }
        }),
        loadStudios().catch(err => {
          const status = err?.response?.status;
          if (status === 403 || status === 401) {
            console.warn('[ApiContext] Auth error loading studios (token may be invalid):', status);
          } else {
            console.error('[ApiContext] Failed to load studios:', err);
          }
        }),
        loadMyStudio().catch(err => {
          const status = err?.response?.status;
          if (status === 403 || status === 401) {
            console.warn('[ApiContext] Auth error loading my studio (token may be invalid):', status);
          } else {
            console.error('[ApiContext] Failed to load my studio:', err);
          }
        }),
        loadAudioTracks().catch(err => {
          const status = err?.response?.status;
          if (status === 403 || status === 401) {
            console.warn('[ApiContext] Auth error loading audio tracks (token may be invalid):', status);
          } else {
            console.error('[ApiContext] Failed to load audio tracks:', err);
          }
        })
      ]);
    } else {
      // No token - log for debugging
      if (process.env.NODE_ENV === 'development') {
        console.log('[ApiContext] No auth token found, skipping initial data load');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - only run once on mount

  // Listen for storage changes (logout in other tabs)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'authToken') {
        if (!e.newValue) {
          // Token was removed, clear user
          clearUser();
        } else if (e.newValue && !currentUser) {
          // Token was added, load user
          loadCurrentUser();
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [currentUser, clearUser, loadCurrentUser]);

  const value: ApiContextType = {
    // State
    stories,
    seasons,
    characters,
    episodes,
    dialogues,
    studios,
    audioTracks,
    currentStory,
    currentSeason,
    currentEpisode,
    myStudio,
    currentUser,
    
    // Loading states
    isLoading,
    error,
    
    // Actions
    loadStories,
    loadPublicStories,
    loadStory,
    createStory,
    updateStory,
    deleteStory,
    
    loadSeasons,
    createSeason,
    updateSeason,
    deleteSeason,
    
    loadCharacters,
    createCharacter,
    updateCharacter,
    deleteCharacter,
    
    loadEpisodes,
    createEpisode,
    updateEpisode,
    deleteEpisode,
    
    loadDialogues,
    createDialogue,
    updateDialogue,
    deleteDialogue,
    
    loadStudios,
    loadMyStudio,
    createStudio,
    updateStudio,
    deleteStudio,
    
    loadAudioTracks,
    createAudioTrack,
    updateAudioTrack,
    deleteAudioTrack,
    
    // Auth
    loadCurrentUser,
    clearUser,
    login,
    register,
    logout,
    
    // Utility
    clearError,
    clearStories,
    reloadAllData,
    setCurrentStory,
    setCurrentSeason,
    setCurrentEpisode,
  };

  return (
    <ApiContext.Provider value={value}>
      {children}
    </ApiContext.Provider>
  );
};

export default ApiProvider;
