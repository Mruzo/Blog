import axios, { AxiosInstance, AxiosResponse } from 'axios';

// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/icvybz';

// Create axios instance with default config
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    // Don't send auth token for public endpoints
    // Public endpoints don't require auth and sending an invalid token can cause 403 errors
    const url = config.url || '';
    const method = config.method?.toUpperCase() || '';
    
    // Only exclude auth token for truly public endpoints:
    // - /stories/public/ (public stories list)
    // - /studios/ (public studios list - GET only, no path after /studios/)
    // But NOT for authenticated endpoints like:
    // - /studios/{id}/collaboration-requests/ (requires auth)
    // - /studios/{id}/collaborators/ (requires auth)
    const isPublicStoriesEndpoint = url.includes('/stories/public/');
    const isPublicStudiosListEndpoint = url.match(/\/studios\/$/) && method === 'GET';
    const isPublicEndpoint = isPublicStoriesEndpoint || isPublicStudiosListEndpoint;
    
    if (!isPublicEndpoint) {
      const token = localStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Token ${token}`;
      }
    }
    
    // Don't set Content-Type for FormData - let browser set it with boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    // Reduce logging - only log in development mode
    if (process.env.NODE_ENV === 'development' && !config.url?.includes('/dialogues/')) {
      console.log('API Request:', config.method?.toUpperCase(), config.url);
    }
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response: AxiosResponse) => {
    // Reduce logging - only log errors and important requests
    if (process.env.NODE_ENV === 'development' && 
        (response.status >= 400 || response.config.url?.includes('/stories/public/') || response.config.url?.includes('/collaborators/'))) {
      console.log('API Response:', response.status, response.config.url);
    }
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url;
    const method = error.config?.method?.toUpperCase();
    
    // Categorize the error
    const isLogoutEndpoint = url?.includes('/auth/logout/');
    const isPublicStoriesEndpoint = url?.includes('/stories/public/');
    const isPublicStudiosListEndpoint = url?.match(/\/studios\/$/) && method === 'GET';
    const isPublicEndpoint = isPublicStoriesEndpoint || isPublicStudiosListEndpoint;
    const isAuthEndpoint = url?.includes('/auth/');
    const is403Or401 = status === 403 || status === 401;
    
    // Check if this is an authenticated endpoint being called without auth
    // These are expected to fail for unauthenticated users on public pages
    const isAuthenticatedEndpoint = url?.includes('/characters/') || 
                                    url?.includes('/seasons/') || 
                                    url?.includes('/episodes/') || 
                                    url?.includes('/dialogues/');
    const hasToken = !!localStorage.getItem('authToken');
    const isPublicPage = window.location.pathname.includes('/immersivecomics/') && 
                       !window.location.pathname.includes('/my-studio/') &&
                       !window.location.pathname.includes('/story/create/');
    
    // Log errors appropriately based on context
    if (isLogoutEndpoint && is403Or401) {
      // Expected error for logout - just log at debug level
      if (process.env.NODE_ENV === 'development') {
        console.log('[API] Logout endpoint auth error (expected):', status, url);
      }
    } else if (isPublicEndpoint && is403Or401) {
      // Auth error on public endpoint - might be expected if user is not logged in
      if (process.env.NODE_ENV === 'development') {
        console.log('[API] Auth error on public endpoint (may be expected):', status, method, url);
      }
    } else if (isAuthenticatedEndpoint && is403Or401 && !hasToken && isPublicPage) {
      // Expected: Authenticated endpoint called without token on public page
      // Suppress these errors - they're expected when viewing public stories without login
      // Only log in development mode
      if (process.env.NODE_ENV === 'development') {
        console.log('[API] Auth required endpoint called without token on public page (expected):', status, method, url);
      }
    } else if (isAuthEndpoint && is403Or401) {
      // Auth errors on auth endpoints - important to log
      console.warn('[API] Authentication error on auth endpoint:', status, method, url, error.response?.data);
    } else if (is403Or401) {
      // Other 403/401 errors - log as warning (might indicate token issues)
      console.warn('[API] Authentication failed:', status, method, url, {
        message: error.response?.data?.detail || error.message,
        hasToken: !!localStorage.getItem('authToken')
      });
    } else {
      // Other errors - log as error
      console.error('[API] Request failed:', status, method, url, {
        message: error.message,
        data: error.response?.data
      });
    }
    
    // Handle 401 errors
    if (status === 401 && !isLogoutEndpoint && !isPublicEndpoint) {
      // Clear invalid token
      localStorage.removeItem('authToken');
      // Only redirect on protected pages
      if (!window.location.pathname.includes('/immersivecomics/') && 
          !window.location.pathname.includes('/product/')) {
        window.location.href = '/login/';
      }
    }
    
    return Promise.reject(error);
  }
);

// Types
export interface Story {
  id: number;
  title: string;
  description: string;
  comic_image?: string | File; // URL string or File object for uploads
  is_public: boolean;
  created_at: string;
  updated_at: string;
  user: number;
  user_username?: string; // Username of the story owner
  moderation_status: string;
  total_views?: number; // Total view count across all episodes
}

export interface Season {
  id: number;
  title: string;
  season_number: number;
  description: string;
  release_date: string;
  is_public: boolean;
  comic: number;
  model_gltf?: string;
  model_usdz?: string;
  created_at: string;
  updated_at: string;
}

export interface SeasonCreateData {
  title: string;
  season_number: number;
  description: string;
  release_date: string;
  is_public?: boolean;
  model_gltf?: File;
  model_usdz?: File;
}

export interface Character {
  id: number;
  name: string;
  bio: string;
  personality: string;
  love_interest: string;
  user: number;
  story: number;
  pov_data?: {
    id: number;
    head_x: number;
    head_y: number;
    head_z: number;
    default_camera_target: string;
    character: number;
  };
  created_at: string;
  updated_at: string;
}

export interface Episode {
  id: number;
  title: string;
  episode_number: number;
  description: string;
  summary: string;
  is_published: boolean;
  cover_image?: string | File; // URL string or File object for uploads
  season: number;
  season_number?: number; // Season number for display (S1E1 format)
  created_at: string;
  updated_at: string;
}

export interface Dialogue {
  id: number;
  pov?: number; // POV ID
  pov_data?: {
    id: number;
    head_x: number;
    head_y: number;
    head_z: number;
    default_camera_target: string;
    character: number;
  };
  character: number; // Character ID (who is speaking)
  character_name?: string; // Character name (for display)
  text: string;
  order: number;
  scene_title: string;
  scene_description: string;
  shot_type: string;
  camera_orbit: string;
  camera_target: string;
  field_of_view: number;
  zoom_speed: number;
  rotation: string;
  episode: number;
  created_at: string;
  updated_at: string;
}

export interface AudioTrack {
  id: number;
  name: string;
  file: string;
  duration: number;
  file_size: number;
  created_at: string;
  updated_at: string;
}

export interface Studio {
  id: number;
  name: string;
  description: string;
  is_public: boolean;
  owner: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
  } | number; // Can be object or just owner ID (for backward compatibility)
  collaborators?: Array<{
    id: number;
    username?: string;
    first_name?: string;
    last_name?: string;
    role?: string;
  }>;
  stories_count?: number;
  collaborators_count?: number;
  created_at: string;
  updated_at: string;
  avatar_url?: string;
}

// API Service Class
class ApiService {
  // Authentication
  async login(username: string, password: string): Promise<{ token: string; user: any }> {
    const response = await api.post('/auth/login/', { username, password });
    return response.data;
  }

  async register(userData: any): Promise<{ token: string; user: any; message: string; email_verification_required: boolean }> {
    const response = await api.post('/auth/register/', userData);
    return response.data;
  }

  async getCurrentUser(): Promise<any> {
    const response = await api.get('/auth/user/');
    return response.data;
  }

  async updateUser(userData: { first_name?: string; last_name?: string }): Promise<any> {
    const response = await api.patch('/auth/user/', userData);
    return response.data;
  }

  async passwordReset(email: string): Promise<{ message: string }> {
    const response = await api.post('/auth/password-reset/', { email });
    return response.data;
  }

  async submitContactForm(contactData: { full_name: string; email: string; subject: string; content: string; _honeypot?: string; _form_time?: string }): Promise<{ success: boolean; message?: string; errors?: any }> {
    // Contact form is in the snmov API namespace, not icvybz
    const response = await axios.post('/api/contact/', contactData, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  }

  async logout(): Promise<void> {
    try {
      // Try to call logout API while we still have the token
      await api.post('/auth/logout/');
    } catch (error: any) {
      // Ignore errors - token will be cleared anyway
      // This prevents 403 errors from blocking logout
      if (error?.response?.status !== 403) {
        console.log('Logout API error:', error);
      }
    } finally {
      // Always clear token, even if API call failed
      localStorage.removeItem('authToken');
    }
  }

  // Stories
  async getStories(): Promise<Story[]> {
    const response = await api.get('/stories/');
    return response.data.results || response.data;
  }

  async getPublicStories(): Promise<Story[]> {
    const response = await api.get('/stories/public/');
    return response.data.results || response.data;
  }

  async getStory(id: number): Promise<Story> {
    const response = await api.get(`/stories/${id}/`);
    return response.data;
  }

  async getUser(id: number): Promise<any> {
    // Assuming user endpoint exists or fetch from Django auth
    try {
      const response = await api.get(`/users/${id}/`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch user:', error);
      return { username: 'Unknown' };
    }
  }

  async createStory(storyData: Partial<Story>): Promise<Story> {
    const formData = new FormData();
    
    // Add text fields
    if (storyData.title) formData.append('title', storyData.title);
    if (storyData.description) formData.append('description', storyData.description);
    if (storyData.is_public !== undefined) formData.append('is_public', storyData.is_public.toString());
    
    // Add file if present
    if (storyData.comic_image instanceof File) {
      formData.append('comic_image', storyData.comic_image);
    }
    
    const response = await api.post('/stories/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async updateStory(id: number, storyData: Partial<Story>): Promise<Story> {
    // Check if we have a file to upload - if so, use FormData
    const hasFile = storyData.comic_image instanceof File;
    
    if (hasFile) {
      // Use FormData for file uploads
      const formData = new FormData();
      
      // Always include all text fields when updating with a file
      formData.append('title', storyData.title || '');
      formData.append('description', storyData.description || '');
      formData.append('is_public', (storyData.is_public !== undefined ? storyData.is_public : false).toString());
      
      // Add file
      formData.append('comic_image', storyData.comic_image as File);
      
      // Use PATCH - don't set Content-Type header (let browser set it with boundary)
      const response = await api.patch(`/stories/${id}/`, formData);
      return response.data;
    } else {
      // Use JSON for text-only updates (can use PATCH for partial updates)
      const jsonData: any = {};
      if (storyData.title !== undefined) jsonData.title = storyData.title;
      if (storyData.description !== undefined) jsonData.description = storyData.description;
      if (storyData.is_public !== undefined) jsonData.is_public = storyData.is_public;
      
      // Use PATCH for partial updates without file
      const response = await api.patch(`/stories/${id}/`, jsonData);
      return response.data;
    }
  }

  async deleteStory(id: number): Promise<void> {
    await api.delete(`/stories/${id}/`);
  }

  // Seasons
  async getSeasons(storyId: number): Promise<Season[]> {
    const response = await api.get(`/stories/${storyId}/seasons/`);
    return response.data.results || response.data;
  }

  async getSeason(id: number): Promise<Season> {
    const response = await api.get(`/seasons/${id}/`);
    return response.data;
  }

  async createSeason(storyId: number, seasonData: SeasonCreateData): Promise<Season> {
    const formData = new FormData();
    
    // Add text fields
    formData.append('title', seasonData.title);
    formData.append('description', seasonData.description);
    formData.append('season_number', seasonData.season_number.toString());
    formData.append('release_date', seasonData.release_date);
    if (seasonData.is_public !== undefined) {
      formData.append('is_public', seasonData.is_public.toString());
    }
    
    // Add file uploads
    if (seasonData.model_gltf) {
      formData.append('model_gltf', seasonData.model_gltf);
    }
    if (seasonData.model_usdz) {
      formData.append('model_usdz', seasonData.model_usdz);
    }
    
    const response = await api.post(`/stories/${storyId}/seasons/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async updateSeason(id: number, seasonData: Partial<SeasonCreateData>): Promise<Season> {
    const formData = new FormData();
    
    // Add text fields
    if (seasonData.title) formData.append('title', seasonData.title);
    if (seasonData.description) formData.append('description', seasonData.description);
    if (seasonData.season_number) formData.append('season_number', seasonData.season_number.toString());
    if (seasonData.release_date) formData.append('release_date', seasonData.release_date);
    if (seasonData.is_public !== undefined) formData.append('is_public', seasonData.is_public.toString());
    
    // Add file uploads
    if (seasonData.model_gltf) {
      formData.append('model_gltf', seasonData.model_gltf);
    }
    if (seasonData.model_usdz) {
      formData.append('model_usdz', seasonData.model_usdz);
    }
    
    const response = await api.patch(`/seasons/${id}/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async deleteSeason(id: number): Promise<void> {
    await api.delete(`/seasons/${id}/`);
  }

  // Characters
  async getCharacters(storyId: number): Promise<Character[]> {
    const response = await api.get(`/stories/${storyId}/characters/`);
    return response.data.results || response.data;
  }

  async createCharacter(storyId: number, characterData: Partial<Character>): Promise<Character> {
    const response = await api.post(`/stories/${storyId}/characters/`, characterData);
    return response.data;
  }

  async updateCharacter(id: number, characterData: Partial<Character>): Promise<Character> {
    const response = await api.put(`/characters/${id}/`, characterData);
    return response.data;
  }

  async deleteCharacter(id: number): Promise<void> {
    await api.delete(`/characters/${id}/`);
  }

  // Episodes
  async getEpisodes(seasonId: number): Promise<Episode[]> {
    const response = await api.get(`/seasons/${seasonId}/episodes/`);
    return response.data.results || response.data;
  }

  async createEpisode(seasonId: number, episodeData: Partial<Episode>): Promise<Episode> {
    const formData = new FormData();
    
    // Add text fields
    if (episodeData.title) formData.append('title', episodeData.title);
    if (episodeData.episode_number) formData.append('episode_number', episodeData.episode_number.toString());
    if (episodeData.description) formData.append('description', episodeData.description);
    
    // Add file if present
    if (episodeData.cover_image && episodeData.cover_image instanceof File) {
      formData.append('cover_image', episodeData.cover_image);
    }
    
    const response = await api.post(`/seasons/${seasonId}/episodes/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async updateEpisode(id: number, episodeData: Partial<Episode>): Promise<Episode> {
    const formData = new FormData();
    
    // Add text fields
    if (episodeData.title) formData.append('title', episodeData.title);
    if (episodeData.episode_number) formData.append('episode_number', episodeData.episode_number.toString());
    if (episodeData.description) formData.append('description', episodeData.description);
    
    // Add file if present
    if (episodeData.cover_image && episodeData.cover_image instanceof File) {
      formData.append('cover_image', episodeData.cover_image);
    }
    
    const response = await api.put(`/episodes/${id}/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async deleteEpisode(id: number): Promise<void> {
    await api.delete(`/episodes/${id}/`);
  }

  async incrementEpisodeView(episodeId: number): Promise<{ success: boolean; view_count: number }> {
    const response = await api.post(`/episodes/${episodeId}/increment-view/`);
    return response.data;
  }

  // Dialogues
  async getDialogues(episodeId: number): Promise<Dialogue[]> {
    const response = await api.get(`/episodes/${episodeId}/dialogues/`);
    return response.data.results || response.data;
  }

  async createDialogue(episodeId: number, dialogueData: Partial<Dialogue>): Promise<Dialogue> {
    const response = await api.post(`/episodes/${episodeId}/dialogues/`, dialogueData);
    return response.data;
  }

  async updateDialogue(id: number, dialogueData: Partial<Dialogue>): Promise<Dialogue> {
    console.log('API: updateDialogue called with:', { id, dialogueData });
    console.log('API: dialogueData type:', typeof dialogueData);
    console.log('API: dialogueData keys:', Object.keys(dialogueData));
    console.log('API: dialogueData values:', Object.values(dialogueData));
    
    try {
      // Use PATCH for partial updates instead of PUT
      const response = await api.patch(`/dialogues/${id}/`, dialogueData);
      console.log('API: updateDialogue successful:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('API: updateDialogue failed:', error);
      console.error('API: Error response:', error.response?.data);
      console.error('API: Error status:', error.response?.status);
      throw error;
    }
  }

  async deleteDialogue(id: number): Promise<void> {
    await api.delete(`/dialogues/${id}/`);
  }

  // File Upload
  async uploadFile(file: File, type: 'model' | 'audio' | 'image'): Promise<{ url: string; id: number }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    const response = await api.post('/upload/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  // Audio Tracks
  async getAudioTracks(): Promise<AudioTrack[]> {
    const response = await api.get('/audio/');
    return response.data.results || response.data;
  }

  async createAudioTrack(audioData: Partial<AudioTrack>): Promise<AudioTrack> {
    const response = await api.post('/audio/', audioData);
    return response.data;
  }

  async updateAudioTrack(id: number, audioData: Partial<AudioTrack>): Promise<AudioTrack> {
    const response = await api.put(`/audio/${id}/`, audioData);
    return response.data;
  }

  async deleteAudioTrack(id: number): Promise<void> {
    await api.delete(`/audio/${id}/`);
  }

  // Studios
  async getStudios(): Promise<Studio[]> {
    // Use the detailed studio_list_api endpoint which includes owner and collaborators info
    // This endpoint is at /immersivecomics/api/studios/ which is outside the /api/icvybz namespace
    try {
      // Get base URL and construct full path
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/icvybz';
      const serverBase = baseURL.replace('/api/icvybz', '');
      // Don't add token for public studios endpoint
      const headers: any = {
        'Content-Type': 'application/json',
      };
      
      // Use axios directly with full URL since this endpoint is outside the /api/icvybz namespace
      const axiosInstance = axios.create({
        baseURL: serverBase,
        headers
      });
      
      console.log('getStudios: Calling /immersivecomics/api/studios/');
      const response = await axiosInstance.get('/immersivecomics/api/studios/');
      console.log('getStudios: Response received:', response.status, response.data);
      if (response.data && response.data.studios) {
        console.log('getStudios: Returning studios array with', response.data.studios.length, 'studios');
        return response.data.studios;
      }
      // If response doesn't have studios array, return empty array
      console.warn('getStudios: Response does not have studios array:', response.data);
      return [];
    } catch (error: any) {
      const status = error?.response?.status;
      const errorMessage = error?.response?.data?.detail || error?.message || 'Unknown error';
      const errorData = error?.response?.data;
      console.error('getStudios: Studio list API endpoint failed:', {
        status,
        errorMessage,
        errorData,
        url: '/immersivecomics/api/studios/',
        hasResponse: !!error?.response
      });
      // Re-throw the error so loadStudios can handle it properly
      throw error;
    }
  }

  async getStudio(id: number): Promise<Studio> {
    const response = await api.get(`/studios/${id}/`);
    return response.data;
  }

  async getStudioCollaborationRequests(studioId: number): Promise<any[]> {
    const response = await api.get(`/studios/${studioId}/collaboration-requests/`);
    return response.data.results || response.data;
  }

  async createStudioCollaborationRequest(studioId: number, data: { role?: string; message?: string }): Promise<any> {
    const response = await api.post(`/studios/${studioId}/collaboration-requests/create/`, data);
    return response.data;
  }

  async acceptStudioCollaborationRequest(studioId: number, requestId: number): Promise<any> {
    const response = await api.post(`/studios/${studioId}/collaboration-requests/${requestId}/accept/`);
    return response.data;
  }

  async declineStudioCollaborationRequest(studioId: number, requestId: number): Promise<any> {
    const response = await api.post(`/studios/${studioId}/collaboration-requests/${requestId}/decline/`);
    return response.data;
  }

  async createStudio(studioData: Partial<Studio>): Promise<Studio> {
    const response = await api.post('/studios/', studioData);
    return response.data;
  }

  async updateStudio(id: number, studioData: Partial<Studio>): Promise<Studio> {
    const response = await api.put(`/studios/${id}/`, studioData);
    return response.data;
  }

  async deleteStudio(id: number): Promise<void> {
    await api.delete(`/studios/${id}/`);
  }

  // My Studio
  async getMyStudio(): Promise<Studio> {
    const response = await api.get('/my-studio/');
    return response.data;
  }

  // Story Creation Workflow
  async createCompleteStory(storyData: {
    story: Partial<Story>;
    season: Partial<Season>;
    characters: Partial<Character>[];
    episode: Partial<Episode>;
    dialogues: Partial<Dialogue>[];
    model?: File;
  }): Promise<{
    story: Story;
    season: Season;
    characters: Character[];
    episode: Episode;
    dialogues: Dialogue[];
    model_url?: string;
  }> {
    console.log('ApiService: createCompleteStory called with:', storyData);
    
    try {
      // Send as JSON data instead of FormData
      const response = await api.post('/create-complete-story/', {
        story: storyData.story,
        season: storyData.season,
        characters: storyData.characters,
        episode: storyData.episode,
        dialogues: storyData.dialogues,
        // Note: model file upload would need separate handling if needed
      });
      
      console.log('ApiService: createCompleteStory response:', response.data);
      console.log('ApiService: Created story ID:', response.data.story?.id);
      console.log('ApiService: Created story title:', response.data.story?.title);
      return response.data;
    } catch (error: any) {
      console.error('ApiService: createCompleteStory error:', error);
      console.error('ApiService: Error response:', error.response?.data);
      throw error;
    }
  }
}

// Export singleton instance
export const apiService = new ApiService();
export { api };
export default apiService;
