import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import Studios from '../Studios';
import {
  createMockApiContext,
  createMockStudio,
  renderWithRouter,
} from '../../testing/testHelpers';

const mockUseApi = jest.fn();

jest.mock('../../contexts/ApiContext', () => ({
  useApi: () => mockUseApi(),
}));

jest.mock('../../services/api', () => ({
  __esModule: true,
  default: {
    getStudios: jest.fn(),
  },
}));

const renderStudios = () => renderWithRouter(<Studios />);

describe('Studios', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseApi.mockReturnValue(createMockApiContext());
  });

  it('renders studios hero copy', async () => {
    renderStudios();

    expect(await screen.findByRole('heading', { level: 1, name: 'Studios' })).toBeInTheDocument();
    expect(screen.getByText('Explore')).toBeInTheDocument();
  });

  it('shows loading spinner while studios load', () => {
    mockUseApi.mockReturnValue(createMockApiContext({ isLoading: true }));

    renderStudios();

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('renders studio cards from context', async () => {
    mockUseApi.mockReturnValue(
      createMockApiContext({
        studios: [
          createMockStudio({ name: 'Studio Alpha', description: 'A creative studio' }),
          createMockStudio({ id: 2, name: 'Studio Beta', description: 'Another studio' }),
        ],
      }),
    );

    renderStudios();

    await waitFor(() => {
      expect(screen.getByText('Studio Alpha')).toBeInTheDocument();
      expect(screen.getByText('Studio Beta')).toBeInTheDocument();
    });
  });

  it('calls loadStudios on mount', async () => {
    const loadStudios = jest.fn().mockResolvedValue(undefined);
    mockUseApi.mockReturnValue(createMockApiContext({ loadStudios }));

    renderStudios();

    await screen.findByRole('heading', { level: 1, name: 'Studios' });
    expect(loadStudios).toHaveBeenCalled();
  });

  it('shows empty state when no studios exist', async () => {
    renderStudios();

    expect(await screen.findByText(/No studios found/i)).toBeInTheDocument();
  });
});
