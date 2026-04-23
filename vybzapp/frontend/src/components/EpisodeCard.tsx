import React from 'react';
import SmallButton from './SmallButton';
import { Episode as ApiEpisode } from '../services/api';

interface EpisodeCardProps {
  episode: ApiEpisode;
  onEdit: (episode: ApiEpisode) => void;
  onDelete: (episodeId: number) => void;
  onSelect: (episode: ApiEpisode) => void;
  isSelected?: boolean;
  showActions?: boolean;
  className?: string;
  dialogueCount?: number;
}

const EpisodeCard: React.FC<EpisodeCardProps> = ({ 
  episode, 
  onEdit, 
  onDelete, 
  onSelect,
  isSelected = false,
  showActions = true,
  className = '',
  dialogueCount = 0
}) => {
  // Function to strip HTML tags and render as plain text
  const stripHtmlTags = (html: string): string => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    return tempDiv.textContent || tempDiv.innerText || '';
  };

  return (
    <div
      className={`episode-manage__epCard ${isSelected ? 'episode-manage__epCard--selected' : ''} ${className}`}
      style={{ cursor: 'pointer', position: 'relative' }}
      onClick={() => onSelect(episode)}
    >
      <div
        className="position-absolute d-flex align-items-center gap-2"
        style={{ top: '8px', right: '8px', zIndex: 10 }}
      >
        <span
          className={`stories-landing__chip ${dialogueCount > 0 ? 'stories-landing__chip--success' : ''}`}
          style={{ fontSize: '0.68rem', padding: '0.15rem 0.4rem' }}
        >
          <i className="fas fa-comments me-1" aria-hidden />
          {dialogueCount}
        </span>
        {isSelected && (
          <span className="episode-manage__epBadge" aria-hidden>
            <i className="fas fa-check" style={{ fontSize: '0.65rem' }} />
          </span>
        )}
      </div>
      <div className="p-2">
        <div className="row">
          {/* Cover Image Column */}
          <div className="col-md-3">
            {episode.cover_image && typeof episode.cover_image === 'string' ? (
              <img 
                src={episode.cover_image} 
                alt={`${episode.title} cover`}
                className="img-fluid rounded"
                style={{ width: '100%', height: '80px', objectFit: 'cover' }}
              />
            ) : (
              <div 
                className="bg-light rounded d-flex align-items-center justify-content-center"
                style={{ width: '100%', height: '80px' }}
              >
                <i className="fas fa-image text-muted fa-2x"></i>
              </div>
            )}
          </div>
          
          {/* Content Column */}
          <div className="col-md-9">
            <div className="d-flex justify-content-between align-items-start mb-2">
              <div className="flex-grow-1">
                <div className="d-flex align-items-center my-1 flex-wrap gap-1">
                  <span className="stories-landing__chip" style={{ fontSize: '0.68rem' }}>
                    S{episode.season_number || 1}E{episode.episode_number}
                  </span>
                  <h6 className="subtext-btn mb-0" style={{ fontWeight: 700 }}>
                    {episode.title}
                  </h6>
                </div>
                <p className="subtext-btn-sm text-muted mb-0" style={{ 
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}>
                  {stripHtmlTags(episode.description)}
                </p>
              </div>
            </div>
            
            <div className="d-flex justify-content-between align-items-center">
              <small className="text-muted subtext-btn-sm">
                <span className="d-none d-md-inline">
                  <i className="fas fa-calendar me-1"></i>
                  Created: {new Date(episode.created_at).toLocaleDateString()}
                </span>
                <span className="d-md-none">
                  {new Date(episode.created_at).toLocaleDateString()}
                </span>
              </small>
              <div className="d-flex gap-2">
                {showActions && (
                  <>
                    <SmallButton 
                      variant="outline-primary" 
                      size="sm"
                      onClick={(e) => {
                        e?.stopPropagation();
                        onEdit(episode);
                      }}
                    >
                      <i className="fas fa-edit me-1"></i>Edit
                    </SmallButton>
                    <SmallButton 
                      variant="outline-danger" 
                      size="sm"
                      onClick={(e) => {
                        e?.stopPropagation();
                        onDelete(episode.id);
                      }}
                    >
                      <i className="fas fa-trash me-1"></i>Delete
                    </SmallButton>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EpisodeCard;





