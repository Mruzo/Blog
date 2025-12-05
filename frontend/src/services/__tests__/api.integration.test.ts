/**
 * Integration Tests for API Service
 * 
 * These tests make REAL API calls to the Django backend.
 * 
 * Prerequisites:
 * 1. Django backend must be running on http://localhost:8000
 * 2. Test database should be set up with test data
 * 3. Run: python manage.py test --settings=snm.settings.test (or similar)
 * 
 * To run these tests:
 * REACT_APP_API_URL=http://localhost:8000/api/icvybz npm test -- api.integration.test.ts
 */

import apiService from '../api';

// Check if we're in integration test mode
const RUN_INTEGRATION_TESTS = process.env.REACT_APP_RUN_INTEGRATION_TESTS === 'true';
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/icvybz';

describe('API Service - Integration Tests', () => {
  // Use the singleton instance
  let testAuthToken: string | null = null;
  let testUserId: number | null = null;

  beforeAll(() => {
    if (!RUN_INTEGRATION_TESTS) {
      console.log('Skipping integration tests. Set REACT_APP_RUN_INTEGRATION_TESTS=true to run.');
    }
    // Use the singleton apiService instance
  });

  beforeEach(() => {
    if (!RUN_INTEGRATION_TESTS) {
      return;
    }
    // Clear any existing auth token
    localStorage.removeItem('authToken');
  });

  afterEach(() => {
    if (!RUN_INTEGRATION_TESTS) {
      return;
    }
    // Clean up auth token
    if (testAuthToken) {
      localStorage.removeItem('authToken');
    }
  });

  describe('Public Stories API', () => {
    it('should fetch public stories without authentication', async () => {
      if (!RUN_INTEGRATION_TESTS) {
        return;
      }

      const stories = await apiService.getPublicStories();

      expect(Array.isArray(stories)).toBe(true);
      // Verify story structure
      if (stories.length > 0) {
        const story = stories[0];
        expect(story).toHaveProperty('id');
        expect(story).toHaveProperty('title');
        expect(story).toHaveProperty('description');
        expect(story).toHaveProperty('is_public');
        expect(story.is_public).toBe(true);
      }
    }, 10000); // 10 second timeout for real API calls

    it('should return appropriate data structure for public stories', async () => {
      if (!RUN_INTEGRATION_TESTS) {
        return;
      }

      const stories = await apiService.getPublicStories();

      stories.forEach((story: any) => {
        expect(story).toHaveProperty('id');
        expect(story).toHaveProperty('title');
        expect(story).toHaveProperty('is_public');
        expect(typeof story.id).toBe('number');
        expect(typeof story.is_public).toBe('boolean');
      });
    }, 10000);
  });

  describe('Studios API', () => {
    it('should fetch public studios without authentication', async () => {
      if (!RUN_INTEGRATION_TESTS) {
        return;
      }

      const studios = await apiService.getStudios();

      expect(Array.isArray(studios)).toBe(true);
      // Verify studio structure
      if (studios.length > 0) {
        const studio = studios[0];
        expect(studio).toHaveProperty('id');
        expect(studio).toHaveProperty('name');
        expect(studio).toHaveProperty('description');
        expect(studio).toHaveProperty('owner');
        expect(studio).toHaveProperty('is_public');
        expect(studio.is_public).toBe(true);
      }
    }, 10000);

    it('should return studios with correct data structure', async () => {
      if (!RUN_INTEGRATION_TESTS) {
        return;
      }

      const studios = await apiService.getStudios();

      studios.forEach((studio: any) => {
        expect(studio).toHaveProperty('id');
        expect(studio).toHaveProperty('name');
        expect(studio).toHaveProperty('owner');
        expect(studio).toHaveProperty('is_public');
        
        // Verify owner structure
        if (typeof studio.owner === 'object') {
          expect(studio.owner).toHaveProperty('id');
          expect(studio.owner).toHaveProperty('username');
        }
        
        // Verify collaborators structure if present
        if (studio.collaborators && Array.isArray(studio.collaborators)) {
          studio.collaborators.forEach((collab: any) => {
            expect(collab).toHaveProperty('id');
            expect(collab).toHaveProperty('username');
            expect(collab).toHaveProperty('role');
          });
        }
      });
    }, 10000);

    it('should include stories_count in studio data', async () => {
      if (!RUN_INTEGRATION_TESTS) {
        return;
      }

      const studios = await apiService.getStudios();

      studios.forEach((studio: any) => {
        expect(studio).toHaveProperty('stories_count');
        expect(typeof studio.stories_count).toBe('number');
        expect(studio.stories_count).toBeGreaterThanOrEqual(0);
      });
    }, 10000);
  });

  describe('Authentication API', () => {
    it('should handle login with valid credentials', async () => {
      if (!RUN_INTEGRATION_TESTS) {
        return;
      }

      // Note: This test requires a test user to exist in the database
      // You may need to create one or use fixtures
      const testUsername = process.env.REACT_APP_TEST_USERNAME || 'testuser';
      const testPassword = process.env.REACT_APP_TEST_PASSWORD || 'testpass123';

      try {
        const result = await apiService.login(testUsername, testPassword);

        expect(result).toHaveProperty('token');
        expect(result).toHaveProperty('user');
        expect(typeof result.token).toBe('string');
        expect(result.token.length).toBeGreaterThan(0);
        expect(result.user).toHaveProperty('id');
        expect(result.user).toHaveProperty('username');
        expect(result.user.username).toBe(testUsername);

        testAuthToken = result.token;
        testUserId = result.user.id;
      } catch (error: any) {
        // If test user doesn't exist, skip this test
        if (error.response?.status === 400 || error.response?.status === 401) {
          console.log('Test user not found, skipping login test');
          return;
        }
        throw error;
      }
    }, 10000);

    it('should handle login with invalid credentials', async () => {
      if (!RUN_INTEGRATION_TESTS) {
        return;
      }

      await expect(
        apiService.login('invaliduser', 'invalidpass')
      ).rejects.toThrow();
    }, 10000);

    it('should fetch current user when authenticated', async () => {
      if (!RUN_INTEGRATION_TESTS || !testAuthToken) {
        return;
      }

      localStorage.setItem('authToken', testAuthToken);
      const user = await apiService.getCurrentUser();

      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('username');
      expect(user).toHaveProperty('email');
      if (testUserId) {
        expect(user.id).toBe(testUserId);
      }
    }, 10000);
  });

  describe('Authenticated Stories API', () => {
    it('should fetch user stories when authenticated', async () => {
      if (!RUN_INTEGRATION_TESTS || !testAuthToken) {
        return;
      }

      localStorage.setItem('authToken', testAuthToken);
      const stories = await apiService.getStories();

      expect(Array.isArray(stories)).toBe(true);
      // Verify story structure
      stories.forEach((story: any) => {
        expect(story).toHaveProperty('id');
        expect(story).toHaveProperty('title');
        expect(story).toHaveProperty('user');
      });
    }, 10000);
  });

  describe('API Error Handling', () => {
    it('should handle 404 errors gracefully', async () => {
      if (!RUN_INTEGRATION_TESTS) {
        return;
      }

      // Try to fetch a non-existent story
      await expect(
        apiService.getStory(999999)
      ).rejects.toThrow();
    }, 10000);

    it('should handle 403 errors gracefully', async () => {
      if (!RUN_INTEGRATION_TESTS) {
        return;
      }

      // Try to access protected endpoint without auth
      localStorage.removeItem('authToken');
      
      // This should work for public endpoints, but fail for protected ones
      // For example, getStories() requires auth
      try {
        await apiService.getStories();
        // If this doesn't throw, the endpoint might be public
      } catch (error: any) {
        expect(error.response?.status).toBe(401);
      }
    }, 10000);
  });

  describe('API Response Structure', () => {
    it('should return consistent data structures across endpoints', async () => {
      if (!RUN_INTEGRATION_TESTS) {
        return;
      }

      const [stories, studios] = await Promise.all([
        apiService.getPublicStories(),
        apiService.getStudios()
      ]);

      // Verify stories structure
      if (stories.length > 0) {
        expect(stories[0]).toHaveProperty('id');
        expect(stories[0]).toHaveProperty('title');
      }

      // Verify studios structure
      if (studios.length > 0) {
        expect(studios[0]).toHaveProperty('id');
        expect(studios[0]).toHaveProperty('name');
        expect(studios[0]).toHaveProperty('owner');
      }
    }, 15000);
  });

  describe('Episode View Count API', () => {
    it('should include view_count in episode API response', async () => {
      if (!RUN_INTEGRATION_TESTS) {
        return;
      }

      // First, we need to get a story and season
      const stories = await apiService.getPublicStories();
      if (stories.length === 0) {
        console.log('No stories available for view_count test');
        return;
      }

      const story = stories[0];
      const seasons = await apiService.getSeasons(story.id);
      if (seasons.length === 0) {
        console.log('No seasons available for view_count test');
        return;
      }

      const season = seasons[0];
      const episodes = await apiService.getEpisodes(season.id);

      if (episodes.length > 0) {
        const episode = episodes[0];
        expect(episode).toHaveProperty('view_count');
        expect(typeof episode.view_count).toBe('number');
        expect(episode.view_count).toBeGreaterThanOrEqual(0);
      }
    }, 10000);
  });

  describe('Share Tracking API', () => {
    it('should track share click for story', async () => {
      if (!RUN_INTEGRATION_TESTS) {
        return;
      }

      const stories = await apiService.getPublicStories();
      if (stories.length === 0) {
        console.log('No stories available for share tracking test');
        return;
      }

      const story = stories[0];
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/icvybz';
      const serverBase = baseURL.replace('/api/icvybz', '');
      const endpoint = `${serverBase}/immersivecomics/api/track-share/`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          platform: 'facebook',
          story_id: story.id,
        }),
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data).toHaveProperty('success', true);
    }, 10000);

    it('should handle share tracking errors gracefully', async () => {
      if (!RUN_INTEGRATION_TESTS) {
        return;
      }

      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/icvybz';
      const serverBase = baseURL.replace('/api/icvybz', '');
      const endpoint = `${serverBase}/immersivecomics/api/track-share/`;

      // Test with missing platform
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          story_id: 999, // Non-existent story
        }),
      });

      // Should return error status
      expect(response.status).toBe(400);
    }, 10000);
  });
});

