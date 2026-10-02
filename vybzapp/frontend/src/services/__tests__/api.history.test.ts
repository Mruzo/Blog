import { ApiService } from '../api';
import axios from 'axios';

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ApiService - Episode history', () => {
  let apiService: ApiService;

  beforeEach(() => {
    apiService = new ApiService();
    jest.clearAllMocks();
  });

  it('loads versions and activity for an episode', async () => {
    const payload = { can_edit: true, versions: [], changes: [] };
    mockedAxios.get.mockResolvedValue({ data: payload });

    const result = await apiService.getEpisodeHistory(9);

    expect(mockedAxios.get).toHaveBeenCalledWith('/episodes/9/history/');
    expect(result).toEqual(payload);
  });

  it('saves and restores a named version', async () => {
    mockedAxios.post
      .mockResolvedValueOnce({ data: { id: 3, name: 'Cut A', line_count: 2 } })
      .mockResolvedValueOnce({ data: { restored: true } });

    await apiService.createEpisodeVersion(9, 'Cut A');
    await apiService.restoreEpisodeVersion(9, 3);

    expect(mockedAxios.post).toHaveBeenNthCalledWith(1, '/episodes/9/versions/', { name: 'Cut A' });
    expect(mockedAxios.post).toHaveBeenNthCalledWith(2, '/episodes/9/versions/3/restore/', {});
  });

  it('requests and approves a dialogue edit', async () => {
    mockedAxios.post
      .mockResolvedValueOnce({ data: { id: 4, status: 'pending' } })
      .mockResolvedValueOnce({ data: { id: 4, status: 'approved' } });

    await apiService.requestDialogueEdit(12, { text: 'Hold still now.' });
    await apiService.approveDialogueEdit(4);

    expect(mockedAxios.post).toHaveBeenNthCalledWith(1, '/dialogues/12/edit-requests/', {
      text: 'Hold still now.',
    });
    expect(mockedAxios.post).toHaveBeenNthCalledWith(2, '/edit-requests/4/approve/', {});
  });
});
