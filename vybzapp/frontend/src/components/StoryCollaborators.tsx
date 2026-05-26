import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { User, collaborationService } from '../services/collaborationService';
import { Story, apiService } from '../services/api';
import MessagePopup from './MessagePopup';

interface StudioCollaborator {
  id: number;
  user: User;
  role: string;
  roles?: string[];
  is_story_collaborator: boolean;
  story_roles?: string[];
}

const formatRoleLabel = (role: string): string =>
  role
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

const StoryCollaborators: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const storyId = id ? parseInt(id, 10) : 0;

  const [studioCollaborators, setStudioCollaborators] = useState<StudioCollaborator[]>([]);
  const [selectedUserRoles, setSelectedUserRoles] = useState<Map<number, Set<string>>>(new Map());
  const [story, setStory] = useState<Story | null>(null);
  const [currentUser, setCurrentUser] = useState<{ id: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'danger' | 'warning' | 'info'>('success');
  const [showMessage, setShowMessage] = useState(false);

  const isOwner = story && currentUser ? story.user === currentUser.id : false;

  const loadStudioCollaborators = async () => {
    if (!storyId) return;
    try {
      setLoading(true);
      const data = await collaborationService.getStudioCollaboratorsForStory(storyId);
      setStudioCollaborators(data);

      const selectedRoles = new Map<number, Set<string>>();
      data.forEach((collab: StudioCollaborator) => {
        if (collab.is_story_collaborator && collab.story_roles) {
          selectedRoles.set(collab.user.id, new Set(collab.story_roles));
        } else if (collab.is_story_collaborator) {
          selectedRoles.set(collab.user.id, new Set(collab.roles || [collab.role]));
        }
      });
      setSelectedUserRoles(selectedRoles);
      setError(null);
    } catch (err: unknown) {
      const detail =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : undefined;
      setError(detail || 'Failed to load studio collaborators');
      console.error('Error loading studio collaborators:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadStory = async () => {
    if (!storyId) return;
    try {
      const storyData = await apiService.getStory(storyId);
      setStory(storyData);
    } catch (err) {
      console.error('Error loading story:', err);
    }
  };

  const loadCurrentUser = async () => {
    try {
      const userData = await apiService.getCurrentUser();
      setCurrentUser(userData);
    } catch (err) {
      console.error('Error loading current user:', err);
    }
  };

  useEffect(() => {
    if (storyId) {
      loadStory();
      loadCurrentUser();
      loadStudioCollaborators();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyId]);

  const handleToggleRole = (userId: number, role: string) => {
    const newSelectedRoles = new Map(selectedUserRoles);
    const userRoles = new Set(newSelectedRoles.get(userId) || []);

    if (userRoles.has(role)) {
      userRoles.delete(role);
      if (userRoles.size === 0) {
        newSelectedRoles.delete(userId);
      } else {
        newSelectedRoles.set(userId, userRoles);
      }
    } else {
      userRoles.add(role);
      newSelectedRoles.set(userId, userRoles);
    }

    setSelectedUserRoles(newSelectedRoles);
  };

  const hasSelectedRoles = (userId: number): boolean =>
    selectedUserRoles.has(userId) && (selectedUserRoles.get(userId)?.size || 0) > 0;

  const isRoleSelected = (userId: number, role: string): boolean =>
    selectedUserRoles.get(userId)?.has(role) || false;

  const handleSave = async () => {
    if (!storyId) return;

    try {
      setSaving(true);
      const userRolesArray = Array.from(selectedUserRoles.entries()).map(([userId, roles]) => ({
        user_id: userId,
        roles: Array.from(roles),
      }));

      await collaborationService.bulkAssignStoryCollaborators(storyId, userRolesArray);
      await loadStudioCollaborators();

      setMessage('Collaborators updated successfully');
      setMessageType('success');
      setShowMessage(true);
    } catch (err: unknown) {
      const detail =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : undefined;
      setMessage(detail || 'Failed to update collaborators');
      setMessageType('danger');
      setShowMessage(true);
      console.error('Error saving collaborators:', err);
    } finally {
      setSaving(false);
    }
  };

  const panelBody = () => {
    if (loading) {
      return (
        <div className="story-collab__loading" aria-busy="true">
          <div className="spinner-border text-dark" role="status">
            <span className="visually-hidden">Loading collaborators</span>
          </div>
          <p className="product-landing__body mb-0">Loading collaborators…</p>
        </div>
      );
    }

    if (!isOwner) {
      return (
        <div className="story-collab__notice" role="status">
          <i className="fas fa-info-circle" aria-hidden />
          <p className="mb-0">Only the story owner can manage collaborators.</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="story-collab__notice story-collab__notice--danger" role="alert">
          <i className="fas fa-exclamation-triangle" aria-hidden />
          <p className="mb-0">{error}</p>
        </div>
      );
    }

    if (studioCollaborators.length === 0) {
      return (
        <div className="story-collab__empty">
          <div className="stories-landing__emptyIcon" aria-hidden>
            <i className="fas fa-users" />
          </div>
          <p className="product-landing__body mb-0">
            No studio collaborators yet. Add teammates from your studio first, then assign story roles here.
          </p>
        </div>
      );
    }

    return (
      <>
        <p className="story-collab__lead">
          Choose which studio teammates work on this story and which roles they hold. Tap a role to toggle it on or off.
        </p>
        <ul className="story-collab__list">
          {studioCollaborators.map((collab) => {
            const userRoles = collab.roles || [collab.role];
            const active = hasSelectedRoles(collab.user.id);
            return (
              <li
                key={collab.id}
                className={`story-collab__row${active ? ' story-collab__row--active' : ''}`}
              >
                <div className="story-collab__member">
                  {collab.user.avatar ? (
                    <img
                      src={collab.user.avatar}
                      alt=""
                      className="story-collab__avatar"
                    />
                  ) : (
                    <div className="story-collab__avatar story-collab__avatar--placeholder" aria-hidden>
                      {(collab.user.username || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="story-collab__handle">@{collab.user.username}</span>
                </div>
                <div className="story-collab__roles" role="group" aria-label={`Roles for @${collab.user.username}`}>
                  {userRoles.map((role) => {
                    const selected = isRoleSelected(collab.user.id, role);
                    return (
                      <button
                        key={role}
                        type="button"
                        className={`story-collab__rolePill${selected ? ' story-collab__rolePill--on' : ''}`}
                        data-role={role}
                        aria-pressed={selected}
                        onClick={() => handleToggleRole(collab.user.id, role)}
                      >
                        {formatRoleLabel(role)}
                      </button>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ul>
      </>
    );
  };

  return (
    <>
      <MessagePopup
        message={message}
        type={messageType}
        show={showMessage}
        onClose={() => setShowMessage(false)}
        duration={3000}
      />

      <div className="my-studio__panel">
        <div className="my-studio__panelHead">
          <h2 className="my-studio__panelTitle">
            <i className="fas fa-users" aria-hidden />
            <span className="my-studio__panelTitleText">Story collaborators</span>
          </h2>
          {isOwner && !loading && (
            <div className="my-studio__panelHeadActions">
              <button
                type="button"
                className="product-landing__ctaPrimary story-manage__btnCompact"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm me-1"
                      role="status"
                      aria-hidden="true"
                    />
                    Saving…
                  </>
                ) : (
                  <>
                    <i className="fas fa-save me-1" aria-hidden />
                    Save
                  </>
                )}
              </button>
            </div>
          )}
        </div>
        <div className="my-studio__panelBody">{panelBody()}</div>
      </div>
    </>
  );
};

export default StoryCollaborators;
