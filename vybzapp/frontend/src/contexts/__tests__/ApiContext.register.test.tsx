import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { ApiProvider, useApi } from '../ApiContext';
import { apiService } from '../../services/api';

jest.mock('../../services/api', () => ({
  apiService: {
    register: jest.fn(),
    getStories: jest.fn(),
    getStudios: jest.fn(),
    getMyStudio: jest.fn(),
    getAudioTracks: jest.fn(),
    getCurrentUser: jest.fn(),
    login: jest.fn(),
    logout: jest.fn(),
  },
}));

const mockRegister = apiService.register as jest.Mock;
const mockGetStories = apiService.getStories as jest.Mock;
const mockGetStudios = apiService.getStudios as jest.Mock;
const mockGetMyStudio = apiService.getMyStudio as jest.Mock;
const mockGetAudioTracks = apiService.getAudioTracks as jest.Mock;

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ApiProvider>{children}</ApiProvider>
);

describe('ApiContext.register', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockGetStories.mockResolvedValue([]);
    mockGetStudios.mockResolvedValue([]);
    mockGetMyStudio.mockResolvedValue(null);
    mockGetAudioTracks.mockResolvedValue([]);
  });

  it('resolves when register succeeds but post-register reload fails', async () => {
    mockRegister.mockResolvedValue({
      token: 'reg-token',
      user: {
        id: 1,
        username: 'newuser',
        email: 'new@example.com',
        is_active: false,
      },
      message: 'Registration successful.',
      email_verification_required: true,
    });
    mockGetStories.mockRejectedValue(new Error('stories unavailable'));

    const { result } = renderHook(() => useApi(), { wrapper });

    let registerResult: Awaited<ReturnType<typeof result.current.register>> | undefined;
    await act(async () => {
      registerResult = await result.current.register({
        username: 'newuser',
        email: 'new@example.com',
        password: 'pass',
        password2: 'pass',
        accept_terms: true,
      });
    });

    expect(registerResult?.token).toBe('reg-token');
    expect(localStorage.getItem('authToken')).toBe('reg-token');
    expect(result.current.currentUser?.username).toBe('newuser');

    await waitFor(() => {
      expect(mockGetStories).toHaveBeenCalled();
    });
  });

  it('rejects only when register API fails', async () => {
    mockRegister.mockRejectedValue({
      response: { data: { error: 'Username already exists' } },
    });

    const { result } = renderHook(() => useApi(), { wrapper });

    await expect(
      act(async () => {
        await result.current.register({
          username: 'taken',
          email: 'taken@example.com',
          password: 'pass',
          password2: 'pass',
          accept_terms: true,
        });
      })
    ).rejects.toBeDefined();

    expect(localStorage.getItem('authToken')).toBeNull();
    expect(result.current.currentUser).toBeNull();
  });
});
