import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import MessagePopup from '../components/MessagePopup';
import { useApi } from '../contexts/ApiContext';
import { type Studio } from '../services/api';

const TEAM_AVATAR_PX = 28;

interface StudioTeamMemberAvatarProps {
  imageUrl?: string;
  username: string;
  caption: string;
}

const StudioTeamMemberAvatar: React.FC<StudioTeamMemberAvatarProps> = ({ imageUrl, username, caption }) => {
  const frame: React.CSSProperties = {
    width: TEAM_AVATAR_PX,
    height: TEAM_AVATAR_PX,
    border: '2px solid #fff',
    boxShadow: '0 0 0 1px rgba(15, 23, 42, 0.1)',
  };
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt=""
        className="rounded-circle flex-shrink-0"
        style={{ ...frame, objectFit: 'cover' }}
        title={caption}
      />
    );
  }
  const initial = (username || '?').charAt(0).toUpperCase();
  return (
    <span
      className="rounded-circle d-inline-flex align-items-center justify-content-center flex-shrink-0 fw-semibold"
      style={{
        ...frame,
        fontSize: '0.68rem',
        background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.85), rgba(15, 23, 42, 0.65))',
        color: '#fff',
      }}
      title={caption}
    >
      {initial}
    </span>
  );
};

const Studios: React.FC = () => {
  const { studios: contextStudios, loadStudios, isLoading } = useApi();
  const [studios, setStudios] = useState<Studio[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'success' | 'danger' | 'warning' | 'info'>('success');
  const [showMessage, setShowMessage] = useState(false);

  useEffect(() => {
    const fetchStudios = async () => {
      setLoading(true);
      setFetchError(false);
      try {
        await loadStudios().catch((err) => {
          const status = err?.response?.status;
          if (status === 401 || status === 403) {
            return null;
          }
          setFetchError(true);
          return null;
        });
      } catch {
        setFetchError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchStudios();
  }, [loadStudios]);

  useEffect(() => {
    if (Array.isArray(contextStudios)) {
      if (contextStudios.length > 0) {
        setStudios(contextStudios);
      } else {
        setStudios([]);
      }
    } else if (contextStudios === null || contextStudios === undefined) {
      setStudios([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextStudios]);

  useEffect(() => {
    if (studios && studios.length > 0) {
      setShowMessage(false);
      setMessage('');
      setFetchError(false);
    } else if (!loading && !isLoading && fetchError && (!studios || studios.length === 0)) {
      setMessage('Failed to load studios. Please refresh the page.');
      setMessageType('danger');
      setShowMessage(true);
    }
  }, [studios, loading, isLoading, fetchError]);

  const handleCloseMessage = () => {
    setShowMessage(false);
  };

  const getOwnerInfo = (studio: Studio) => {
    if (typeof studio.owner === 'object' && studio.owner !== null) {
      return studio.owner;
    }
    return {
      id: typeof studio.owner === 'number' ? studio.owner : 0,
      username: 'Unknown',
    };
  };

  const getCollaboratorInfo = (collaborator: any) => {
    if (collaborator.user) {
      return {
        id: collaborator.user.id || collaborator.id,
        username: collaborator.user.username || collaborator.username || 'Unknown',
        role: collaborator.role || 'collaborator',
        avatar: collaborator.avatar || collaborator.user.avatar,
      };
    }
    return {
      id: collaborator.id,
      username: collaborator.username || 'Unknown',
      role: collaborator.role || 'collaborator',
      avatar: collaborator.avatar,
    };
  };

  const getStudioLinkTitle = (studio: Studio): string =>
    studio.description ? `${studio.name} — ${studio.description}` : studio.name;

  const getTeamAvatarsTitle = (studio: Studio): string => {
    const parts: string[] = [];
    if (studio.owner && typeof studio.owner === 'object') {
      parts.push(`@${getOwnerInfo(studio).username} (studio owner)`);
    }
    studio.collaborators
      ?.filter((collab) => collab.is_active !== false)
      .forEach((collaborator) => {
        const info = getCollaboratorInfo(collaborator);
        parts.push(`@${info.username}`);
      });
    return parts.join(', ');
  };

  if (loading || isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="product-landing">
      <MessagePopup
        message={message}
        type={messageType}
        show={showMessage}
        onClose={handleCloseMessage}
        duration={3000}
      />

      <section className="product-landing__section product-landing__hero">
        <div className="product-landing__container">
          <p className="product-landing__eyebrow">Explore</p>
          <h1 className="product-landing__h1">Studios</h1>
          <p className="product-landing__lead">
            Where where artists collaborate to create immersive stories.
          </p>
        </div>
      </section>

      <section className="product-landing__section">
        <div className="product-landing__container">
          {studios.length > 0 ? (
            <div className="studios-landing__grid">
              {studios.map((studio) => (
                <article key={studio.id} className="studios-landing__card">
                  <div className="studios-landing__cardTop">
                    <Link
                      to={`/immersivecomics/studio/${studio.id}/`}
                      className="studios-landing__nameLink"
                      title={getStudioLinkTitle(studio)}
                    >
                      {studio.name}
                    </Link>
                    {studio.description ? (
                      <p className="studios-landing__desc">{studio.description}</p>
                    ) : null}
                  </div>

                  <div title={getTeamAvatarsTitle(studio)}>
                    <div className="studios-landing__teamLabel">Team</div>
                    <div className="studios-landing__teamRow">
                      {studio.owner && typeof studio.owner === 'object' ? (
                        <StudioTeamMemberAvatar
                          key={`owner-${studio.id}`}
                          imageUrl={studio.owner.avatar}
                          username={getOwnerInfo(studio).username}
                          caption={`@${getOwnerInfo(studio).username} (studio owner)`}
                        />
                      ) : null}
                      {studio.collaborators
                        ?.filter((collab) => collab.is_active !== false)
                        .map((collaborator) => {
                          const collaboratorInfo = getCollaboratorInfo(collaborator);
                          return (
                            <StudioTeamMemberAvatar
                              key={collaborator.id || collaboratorInfo.id}
                              imageUrl={collaboratorInfo.avatar}
                              username={collaboratorInfo.username}
                              caption={`@${collaboratorInfo.username}`}
                            />
                          );
                        })}
                    </div>
                  </div>

                  <p className="studios-landing__meta" aria-label="Studio stats">
                    <span className="studios-landing__metaNum">{studio.stories_count || 0}</span> stories
                    <span className="studios-landing__metaSep" aria-hidden>
                      ·
                    </span>
                    <span className="studios-landing__metaNum">
                      {(studio.total_episode_views ?? 0).toLocaleString()}
                    </span>{' '}
                    views
                    <span className="studios-landing__metaSep" aria-hidden>
                      ·
                    </span>
                    <span className="studios-landing__metaNum">
                      {(studio.total_comments ?? 0).toLocaleString()}
                    </span>{' '}
                    {(studio.total_comments ?? 0) === 1 ? 'comment' : 'comments'}
                  </p>

                  <div className="studios-landing__actions">
                    <Link
                      to={`/immersivecomics/?studio=${studio.id}`}
                      className="studios-landing__textLink"
                      aria-label="View stories from this studio"
                    >
                      View stories
                    </Link>
                    <Link to={`/immersivecomics/studio/${studio.id}/`} className="studios-landing__btnPrimary">
                      Open studio
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="studios-landing__empty">
              <div className="studios-landing__emptyIcon" aria-hidden>
                <i className="fas fa-building" />
              </div>
              <h2 className="product-landing__h2" style={{ fontSize: '1.25rem' }}>
                No studios found
              </h2>
              <p className="product-landing__body" style={{ marginTop: '0.5rem' }}>
                Be the first to create a collaborative studio!
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Studios;
