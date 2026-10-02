import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import EpisodeHistoryPanel from '../EpisodeHistoryPanel';
import { renderWithRouter } from '../../testing/testHelpers';
import { apiService } from '../../services/api';

jest.mock('../../services/api', () => ({
  apiService: {
    getEpisodeHistory: jest.fn(),
    approveDialogueEdit: jest.fn(),
    declineDialogueEdit: jest.fn(),
  },
}));

const mockedApi = apiService as jest.Mocked<typeof apiService>;

describe('EpisodeHistoryPanel', () => {
  const onRestored = jest.fn();
  const onNotice = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockedApi.getEpisodeHistory.mockResolvedValue({
      can_edit: true,
      versions: [],
      changes: [
        {
          id: 9,
          action: 'request',
          summary: 'editor asked owner to approve a change to line 12',
          user_username: 'editor',
          created_at: '2026-10-01T18:05:00Z',
        },
      ],
      edit_requests: [
        {
          id: 4,
          action: 'update',
          status: 'pending',
          summary: 'editor asked owner to approve a change to line 12',
          requester_username: 'editor',
          approver_username: 'owner',
          dialogue: 12,
          line_order: 12,
          proposed_text: 'Hold still now.',
          can_approve: true,
          created_at: '2026-10-01T18:05:00Z',
        },
      ],
    });
  });

  it('lists pending approvals and activity', async () => {
    renderWithRouter(
      <EpisodeHistoryPanel
        episodeId={9}
        episodeTitle="The Chase"
        onRestored={onRestored}
        onNotice={onNotice}
      />
    );

    expect(await screen.findByRole('heading', { name: /Approvals/i })).toBeInTheDocument();
    expect(screen.getAllByText(/editor wants to change line 12/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /approve/i })).toBeInTheDocument();
    expect(mockedApi.getEpisodeHistory).toHaveBeenCalledWith(9);
  });

  it('approves a waiting change', async () => {
    mockedApi.approveDialogueEdit.mockResolvedValue({
      id: 4,
      action: 'update',
      status: 'approved',
      summary: 'editor asked owner to approve a change to line 12',
      dialogue: 12,
      created_at: '2026-10-01T18:05:00Z',
    });

    renderWithRouter(
      <EpisodeHistoryPanel
        episodeId={9}
        episodeTitle="The Chase"
        onRestored={onRestored}
        onNotice={onNotice}
      />
    );

    fireEvent.click(await screen.findByRole('button', { name: /approve/i }));

    await waitFor(() => {
      expect(mockedApi.approveDialogueEdit).toHaveBeenCalledWith(4);
    });
    expect(onRestored).toHaveBeenCalled();
    expect(onNotice).toHaveBeenCalledWith('Approved editor change.', 'success');
  });
});
