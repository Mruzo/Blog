import { ApiService } from '../api';
import { Season, SeasonCreateData } from '../api';

// Mock axios
jest.mock('axios');
import axios from 'axios';
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ApiService - Season Update Operations', () => {
  let apiService: ApiService;

  beforeEach(() => {
    apiService = new ApiService();
    jest.clearAllMocks();
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
          id: 26,
          title: 'Updated Season',
          description: 'Updated Description',
          season_number: 2,
          release_date: '2024-02-01',
          comic: 8,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-02-01T00:00:00Z'
        }
      };

      mockedAxios.patch.mockResolvedValue(mockResponse);

      const result = await apiService.updateSeason(26, seasonData);

      expect(mockedAxios.patch).toHaveBeenCalledWith(
        '/seasons/26/',
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
          id: 26,
          title: 'Updated Season',
          description: 'Updated Description',
          season_number: 2,
          release_date: '2024-02-01',
          comic: 8,
          model_gltf: 'http://example.com/updated.glb',
          model_usdz: 'http://example.com/updated.usdz',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-02-01T00:00:00Z'
        }
      };

      mockedAxios.patch.mockResolvedValue(mockResponse);

      const result = await apiService.updateSeason(26, seasonData);

      expect(mockedAxios.patch).toHaveBeenCalledWith(
        '/seasons/26/',
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

    it('should handle partial updates with only changed fields', async () => {
      const seasonData: Partial<SeasonCreateData> = {
        title: 'Only Title Updated'
      };

      const mockResponse = {
        data: {
          id: 26,
          title: 'Only Title Updated',
          description: 'Original Description',
          season_number: 1,
          release_date: '2024-01-01',
          comic: 8,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-02-01T00:00:00Z'
        }
      };

      mockedAxios.patch.mockResolvedValue(mockResponse);

      const result = await apiService.updateSeason(26, seasonData);

      expect(mockedAxios.patch).toHaveBeenCalledWith(
        '/seasons/26/',
        expect.any(FormData),
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      // Verify only the title was included in FormData
      const formDataCall = mockedAxios.patch.mock.calls[0][1] as FormData;
      expect(formDataCall.get('title')).toBe('Only Title Updated');
      expect(formDataCall.get('description')).toBeNull();
      expect(formDataCall.get('season_number')).toBeNull();
      expect(formDataCall.get('release_date')).toBeNull();

      expect(result).toEqual(mockResponse.data);
    });

    it('should handle empty season data gracefully', async () => {
      const seasonData: Partial<SeasonCreateData> = {};

      const mockResponse = {
        data: {
          id: 26,
          title: 'Original Title',
          description: 'Original Description',
          season_number: 1,
          release_date: '2024-01-01',
          comic: 8,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      };

      mockedAxios.patch.mockResolvedValue(mockResponse);

      const result = await apiService.updateSeason(26, seasonData);

      expect(mockedAxios.patch).toHaveBeenCalledWith(
        '/seasons/26/',
        expect.any(FormData),
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      // Verify FormData was constructed with empty values
      const formDataCall = mockedAxios.patch.mock.calls[0][1] as FormData;
      expect(formDataCall.get('title')).toBeNull();
      expect(formDataCall.get('description')).toBeNull();
      expect(formDataCall.get('season_number')).toBeNull();
      expect(formDataCall.get('release_date')).toBeNull();

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

      await expect(apiService.updateSeason(26, seasonData)).rejects.toThrow('Update Error');
    });

    it('should handle 500 server errors', async () => {
      const seasonData: Partial<SeasonCreateData> = {
        title: 'Updated Season',
        description: 'Updated Description',
        season_number: 2,
        release_date: '2024-02-01'
      };

      const error = {
        response: {
          status: 500,
          data: 'Internal Server Error'
        }
      };
      mockedAxios.patch.mockRejectedValue(error);

      await expect(apiService.updateSeason(26, seasonData)).rejects.toEqual(error);
    });

    it('should handle file upload errors', async () => {
      const gltfFile = new File(['test'], 'test.glb', { type: 'model/gltf-binary' });
      const seasonData: Partial<SeasonCreateData> = {
        title: 'Updated Season',
        model_gltf: gltfFile
      };

      const error = new Error('File upload failed');
      mockedAxios.patch.mockRejectedValue(error);

      await expect(apiService.updateSeason(26, seasonData)).rejects.toThrow('File upload failed');
    });
  });
});


