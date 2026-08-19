import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import SeasonCreationWizard from '../SeasonCreationWizard';
import { createMockApiContext, renderWithRouter } from '../../testing/testHelpers';

const mockUseApi = jest.fn();
const mockCreateSeason = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ storyId: '123' }),
  useNavigate: () => jest.fn(),
}));

jest.mock('../../contexts/ApiContext', () => ({
  useApi: () => mockUseApi(),
}));

const renderWizard = () => renderWithRouter(<SeasonCreationWizard />);

describe('SeasonCreationWizard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateSeason.mockResolvedValue({ id: 1, title: 'Season 1' });
    mockUseApi.mockReturnValue(
      createMockApiContext({
        createSeason: mockCreateSeason,
        loadSeasons: jest.fn().mockResolvedValue([]),
      }),
    );
  });

  it('renders season creation form', async () => {
    renderWizard();

    expect(await screen.findByLabelText(/Season Title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Season Number/i)).toBeInTheDocument();
  });

  it('submits season data through createSeason', async () => {
    renderWizard();

    fireEvent.change(await screen.findByLabelText(/Season Title/i), {
      target: { value: 'Season 1' },
    });
    fireEvent.change(screen.getByLabelText(/Description/i), {
      target: { value: 'First season' },
    });
    fireEvent.change(screen.getByLabelText(/Season Number/i), {
      target: { value: '1' },
    });
    fireEvent.change(screen.getByLabelText(/Release Date/i), {
      target: { value: '2024-01-01' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Create Season/i }));

    await waitFor(() => {
      expect(mockCreateSeason).toHaveBeenCalled();
    });
  });
});
