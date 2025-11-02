import { ApiService } from '../api';
import { Season, SeasonCreateData } from '../api';

// Mock axios
jest.mock('axios');
import axios from 'axios';
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ApiService - Season Operations', () => {
  let apiService: ApiService;

  beforeEach(() => {
    apiService = new ApiService();
    jest.clearAllMocks();
  });

  describe('createSeason', () => {
    it('should create a season with text data only', async () => {
      const seasonData: SeasonCreateData = {
        title: 'Test Season',
        description: 'Test Description',
        season_number: 1,
        release_date: '2024-01-01'
      };

      const mockResponse = {
        data: {
          id: 1,
          title: 'Test Season',
          description: 'Test Description',
          season_number: 1,
          release_date: '2024-01-01',
          comic: 123,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await apiService.createSeason(123, seasonData);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        '/stories/123/seasons/',
        expect.any(FormData),
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      expect(result).toEqual(mockResponse.data);
    });

    it('should create a season with 3D model files', async () => {
      const gltfFile = new File(['test'], 'test.glb', { type: 'model/gltf-binary' });
      const usdzFile = new File(['test'], 'test.usdz', { type: 'model/vnd.usdz' });

      const seasonData: SeasonCreateData = {
        title: 'Test Season',
        description: 'Test Description',
        season_number: 1,
        release_date: '2024-01-01',
        model_gltf: gltfFile,
        model_usdz: usdzFile
      };

      const mockResponse = {
        data: {
          id: 1,
          title: 'Test Season',
          description: 'Test Description',
          season_number: 1,
          release_date: '2024-01-01',
          comic: 123,
          model_gltf: 'http://example.com/model.glb',
          model_usdz: 'http://example.com/model.usdz',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await apiService.createSeason(123, seasonData);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        '/stories/123/seasons/',
        expect.any(FormData),
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      // Verify FormData was constructed correctly
      const formDataCall = mockedAxios.post.mock.calls[0][1] as FormData;
      expect(formDataCall.get('title')).toBe('Test Season');
      expect(formDataCall.get('description')).toBe('Test Description');
      expect(formDataCall.get('season_number')).toBe('1');
      expect(formDataCall.get('release_date')).toBe('2024-01-01');
      expect(formDataCall.get('model_gltf')).toBe(gltfFile);
      expect(formDataCall.get('model_usdz')).toBe(usdzFile);

      expect(result).toEqual(mockResponse.data);
    });

    it('should handle empty season data', async () => {
      const seasonData: SeasonCreateData = {
        title: '',
        description: '',
        season_number: 1,
        release_date: ''
      };

      const mockResponse = {
        data: {
          id: 1,
          title: '',
          description: '',
          season_number: 1,
          release_date: '',
          comic: 123,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await apiService.createSeason(123, seasonData);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        '/stories/123/seasons/',
        expect.any(FormData),
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      // Verify FormData was constructed with empty values
      const formDataCall = mockedAxios.post.mock.calls[0][1] as FormData;
      expect(formDataCall.get('title')).toBe('');
      expect(formDataCall.get('description')).toBe('');
      expect(formDataCall.get('season_number')).toBe('');
      expect(formDataCall.get('release_date')).toBe('');

      expect(result).toEqual(mockResponse.data);
    });

    it('should handle API errors', async () => {
      const seasonData: SeasonCreateData = {
        title: 'Test Season',
        description: 'Test Description',
        season_number: 1,
        release_date: '2024-01-01'
      };

      const error = new Error('API Error');
      mockedAxios.post.mockRejectedValue(error);

      await expect(apiService.createSeason(123, seasonData)).rejects.toThrow('API Error');
    });
  });

  describe('updateSeason', () => {
    it('should update a season with text data only', async () => {
      const seasonData: Partial<SeasonCreateData> = {
        title: 'Updated Season',
        description: 'Updated Description',
        season_number: 2,
        release_date: '2024-02-01'
      };

      const mockResponse = {
        data: {
          id: 1,
          title: 'Updated Season',
          description: 'Updated Description',
          season_number: 2,
          release_date: '2024-02-01',
          comic: 123,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-02-01T00:00:00Z'
        }
      };

      mockedAxios.patch.mockResolvedValue(mockResponse);

      const result = await apiService.updateSeason(1, seasonData);

      expect(mockedAxios.patch).toHaveBeenCalledWith(
        '/seasons/1/',
        expect.any(FormData),
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      expect(result).toEqual(mockResponse.data);
    });

    it('should update a season with 3D model files', async () => {
      const gltfFile = new File(['test'], 'updated.glb', { type: 'model/gltf-binary' });
      const usdzFile = new File(['test'], 'updated.usdz', { type: 'model/vnd.usdz' });

      const seasonData: Partial<SeasonCreateData> = {
        title: 'Updated Season',
        description: 'Updated Description',
        season_number: 2,
        release_date: '2024-02-01',
        model_gltf: gltfFile,
        model_usdz: usdzFile
      };

      const mockResponse = {
        data: {
          id: 1,
          title: 'Updated Season',
          description: 'Updated Description',
          season_number: 2,
          release_date: '2024-02-01',
          comic: 123,
          model_gltf: 'http://example.com/updated.glb',
          model_usdz: 'http://example.com/updated.usdz',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-02-01T00:00:00Z'
        }
      };

      mockedAxios.patch.mockResolvedValue(mockResponse);

      const result = await apiService.updateSeason(1, seasonData);

      expect(mockedAxios.patch).toHaveBeenCalledWith(
        '/seasons/1/',
        expect.any(FormData),
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      // Verify FormData was constructed correctly
      const formDataCall = mockedAxios.patch.mock.calls[0][1] as FormData;
      expect(formDataCall.get('title')).toBe('Updated Season');
      expect(formDataCall.get('description')).toBe('Updated Description');
      expect(formDataCall.get('season_number')).toBe('2');
      expect(formDataCall.get('release_date')).toBe('2024-02-01');
      expect(formDataCall.get('model_gltf')).toBe(gltfFile);
      expect(formDataCall.get('model_usdz')).toBe(usdzFile);

      expect(result).toEqual(mockResponse.data);
    });

    it('should handle API errors during update', async () => {
      const seasonData: Partial<SeasonCreateData> = {
        title: 'Updated Season',
        description: 'Updated Description',
        season_number: 2,
        release_date: '2024-02-01'
      };

      const error = new Error('Update Error');
      mockedAxios.patch.mockRejectedValue(error);

      await expect(apiService.updateSeason(1, seasonData)).rejects.toThrow('Update Error');
    });
  });

  describe('deleteSeason', () => {
    it('should delete a season', async () => {
      mockedAxios.delete.mockResolvedValue({ data: {} });

      await apiService.deleteSeason(1);

      expect(mockedAxios.delete).toHaveBeenCalledWith('/seasons/1/');
    });

    it('should handle API errors during deletion', async () => {
      const error = new Error('Delete Error');
      mockedAxios.delete.mockRejectedValue(error);

      await expect(apiService.deleteSeason(1)).rejects.toThrow('Delete Error');
    });
  });

  describe('getSeasons', () => {
    it('should get seasons for a story', async () => {
      const mockResponse = {
        data: [
          {
            id: 1,
            title: 'Season 1',
            description: 'First season',
            season_number: 1,
            release_date: '2024-01-01',
            comic: 123,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          }
        ]
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await apiService.getSeasons(123);

      expect(mockedAxios.get).toHaveBeenCalledWith('/stories/123/seasons/');
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle paginated response', async () => {
      const mockResponse = {
        data: {
          results: [
            {
              id: 1,
              title: 'Season 1',
              description: 'First season',
              season_number: 1,
              release_date: '2024-01-01',
              comic: 123,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            }
          ],
          count: 1,
          next: null,
          previous: null
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await apiService.getSeasons(123);

      expect(mockedAxios.get).toHaveBeenCalledWith('/stories/123/seasons/');
      expect(result).toEqual(mockResponse.data.results);
    });

    it('should handle API errors', async () => {
      const error = new Error('Get Seasons Error');
      mockedAxios.get.mockRejectedValue(error);

      await expect(apiService.getSeasons(123)).rejects.toThrow('Get Seasons Error');
    });
  });
});
