import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '../../__tests__/testUtils';
import PrivacySettings from '../PrivacySettings';

const mockNavigate = jest.fn();
const mockLogout = jest.fn().mockResolvedValue(undefined);

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('../../contexts/ApiContext', () => ({
  useApi: () => ({
    currentUser: { id: 1, username: 'testuser', first_name: 'Test' },
    logout: mockLogout,
  }),
}));

describe('PrivacySettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.setItem('authToken', 'test-token');
    global.fetch = jest.fn();
  });

  afterEach(() => {
    localStorage.clear();
  });

  test('renders export and delete sections', async () => {
    renderWithRouter(<PrivacySettings />);

    await waitFor(() => {
      expect(screen.getByText('Privacy & Data')).toBeInTheDocument();
    });
    expect(screen.getByText('Download your data')).toBeInTheDocument();
    expect(screen.getByText('Delete your account')).toBeInTheDocument();
  });

  test('triggers data export download', async () => {
    const blob = new Blob(['{"email":"test@example.com"}'], { type: 'application/json' });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(blob),
    });

    const createObjectURL = jest.fn(() => 'blob:mock');
    const revokeObjectURL = jest.fn();
    global.URL.createObjectURL = createObjectURL;
    global.URL.revokeObjectURL = revokeObjectURL;

    renderWithRouter(<PrivacySettings />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /download my data/i })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('button', { name: /download my data/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('gdpr/export'),
        expect.objectContaining({
          headers: { Authorization: 'Token test-token' },
        })
      );
    });
  });
});
