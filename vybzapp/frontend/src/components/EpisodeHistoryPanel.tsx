import React, { useCallback, useEffect, useState } from 'react';
import {
  apiService,
  DialogueEditRequest,
  Episode,
  EpisodeChangeEvent,
  EpisodeHistoryPayload,
} from '../services/api';

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

interface EpisodeHistoryPanelProps {
  episodeId: number;
  episodeTitle: string;
  refreshKey?: number;
  onRestored: (episode?: Episode) => void | Promise<void>;
  onNotice: (message: string, type: 'success' | 'danger' | 'warning' | 'info') => void;
}

const emptyHistory: EpisodeHistoryPayload = {
  can_edit: false,
  versions: [],
  changes: [],
  edit_requests: [],
};

const EpisodeHistoryPanel: React.FC<EpisodeHistoryPanelProps> = ({
  episodeId,
  episodeTitle,
  refreshKey = 0,
  onRestored,
  onNotice,
}) => {
  const [history, setHistory] = useState<EpisodeHistoryPayload>(emptyHistory);
  const [isLoading, setIsLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<number | null>(null);

  const loadHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const payload = await apiService.getEpisodeHistory(episodeId);
      setHistory({
        can_edit: !!payload.can_edit,
        versions: payload.versions || [],
        changes: payload.changes || [],
        edit_requests: payload.edit_requests || [],
      });
    } catch (error) {
      console.error('Error loading episode history:', error);
      setHistory(emptyHistory);
    } finally {
      setIsLoading(false);
    }
  }, [episodeId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory, refreshKey]);

  const handleResolve = async (request: DialogueEditRequest, decision: 'approve' | 'decline') => {
    setResolvingId(request.id);
    try {
      if (decision === 'approve') {
        await apiService.approveDialogueEdit(request.id);
        onNotice(`Approved ${request.requester_username || 'their'} change.`, 'success');
        await onRestored();
      } else {
        await apiService.declineDialogueEdit(request.id);
        onNotice(`Declined ${request.requester_username || 'their'} change.`, 'info');
      }
      await loadHistory();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Could not update that request';
      onNotice(message, 'danger');
    } finally {
      setResolvingId(null);
    }
  };

  const requests = history.edit_requests || [];

  return (
    <div className="my-studio__panel episode-manage__history">
      <div className="my-studio__panelHead">
        <h2 className="my-studio__panelTitle">
          <i className="fas fa-clock" aria-hidden />
          <span className="my-studio__panelTitleText">History · {episodeTitle}</span>
        </h2>
      </div>
      <div className="my-studio__panelBody p-3">
        {isLoading ? (
          <p className="product-landing__body mb-0" style={{ fontSize: '0.9rem' }}>
            Loading history…
          </p>
        ) : (
          <div className="episode-manage__historyGrid">
            <section aria-labelledby="episodeApprovalsHeading">
              <h3 id="episodeApprovalsHeading" className="episode-manage__historyHeading">
                Approvals
              </h3>
              <p className="episode-manage__historyHint">
                Teammate edits wait on the story owner. If someone else last edited a line, they approve the owner’s change.
              </p>
              {requests.length === 0 ? (
                <p className="episode-manage__historyEmpty">No changes waiting on approval.</p>
              ) : (
                <ul className="episode-manage__historyList">
                  {requests.map((request) => (
                    <li key={request.id} className="episode-manage__historyItem">
                      <div className="episode-manage__historyCopy">
                        <p className="episode-manage__historyName">
                          {request.action === 'delete'
                            ? `${request.requester_username || 'A teammate'} wants to delete${request.line_order != null ? ` line ${request.line_order}` : ' a line'}`
                            : `${request.requester_username || 'A teammate'} wants to change${request.line_order != null ? ` line ${request.line_order}` : ' a line'}`}
                        </p>
                        <p className="episode-manage__historyMeta">
                          {request.action === 'delete' ? 'Delete' : 'Update'}
                          {request.line_order != null ? ` · line ${request.line_order}` : ''}
                          {request.proposed_text ? ` · “${request.proposed_text}”` : ''}
                          {request.created_at ? ` · ${formatWhen(request.created_at)}` : ''}
                        </p>
                      </div>
                      {request.can_approve ? (
                        <div className="episode-manage__historyActions">
                          <button
                            type="button"
                            className="stories-landing__btnPrimary"
                            disabled={resolvingId === request.id}
                            onClick={() => handleResolve(request, 'approve')}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            className="product-landing__ctaGhost"
                            disabled={resolvingId === request.id}
                            onClick={() => handleResolve(request, 'decline')}
                          >
                            Decline
                          </button>
                        </div>
                      ) : (
                        <p className="episode-manage__historyMeta mb-0">
                          Waiting on {request.approver_username || 'the last editor'}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section aria-labelledby="episodeActivityHeading">
              <h3 id="episodeActivityHeading" className="episode-manage__historyHeading">
                Activity
              </h3>
              <p className="episode-manage__historyHint">Who changed what, and who asked for approval.</p>
              {history.changes.length === 0 ? (
                <p className="episode-manage__historyEmpty">Edits to this episode will show up here.</p>
              ) : (
                <ul className="episode-manage__historyList">
                  {history.changes.map((change: EpisodeChangeEvent) => (
                    <li key={change.id} className="episode-manage__historyItem">
                      <div className="episode-manage__historyCopy">
                        <p className="episode-manage__historyName">{change.summary}</p>
                        <p className="episode-manage__historyMeta">{formatWhen(change.created_at)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

export default EpisodeHistoryPanel;
