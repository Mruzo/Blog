import { ApiService } from '../api';
import axios from 'axios';

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ApiService - Dialogue list', () => {
  let apiService: ApiService;

  beforeEach(() => {
    apiService = new ApiService();
    jest.clearAllMocks();
  });

  it('returns a plain array when pagination is disabled', async () => {
    const lines = [
      { id: 1, text: 'Line 1', order: 1, episode: 9 },
      { id: 21, text: 'Line 21', order: 21, episode: 9 },
    ];
    mockedAxios.get.mockResolvedValue({ data: lines });

    const result = await apiService.getDialogues(9);

    expect(mockedAxios.get).toHaveBeenCalledWith('/episodes/9/dialogues/');
    expect(result).toEqual(lines);
  });

  it('follows next pages so line 21 is not dropped', async () => {
    const firstPage = Array.from({ length: 20 }, (_, index) => ({
      id: index + 1,
      text: `Line ${index + 1}`,
      order: index + 1,
      episode: 9,
    }));
    const secondPage = [{ id: 21, text: 'Line 21', order: 21, episode: 9 }];

    mockedAxios.get
      .mockResolvedValueOnce({
        data: {
          count: 21,
          next: 'http://localhost/api/icvybz/episodes/9/dialogues/?page=2',
          previous: null,
          results: firstPage,
        },
      })
      .mockResolvedValueOnce({
        data: {
          count: 21,
          next: null,
          previous: 'http://localhost/api/icvybz/episodes/9/dialogues/',
          results: secondPage,
        },
      });

    const result = await apiService.getDialogues(9);

    expect(mockedAxios.get).toHaveBeenNthCalledWith(1, '/episodes/9/dialogues/');
    expect(mockedAxios.get).toHaveBeenNthCalledWith(
      2,
      'http://localhost/api/icvybz/episodes/9/dialogues/?page=2'
    );
    expect(result).toHaveLength(21);
    expect(result[20]).toEqual(secondPage[0]);
  });
});
