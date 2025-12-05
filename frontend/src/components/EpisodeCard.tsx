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

  console.log(`EpisodeCard ${episode.id} (${episode.title}): received dialogueCount = ${dialogueCount}`);

  return (
    <div 
      className={`card mb-3 ${isSelected ? 'border-primary shadow-sm' : 'border-0 shadow-sm'} ${className}`}
      style={{ cursor: 'pointer', position: 'relative' }}
      onClick={() => onSelect(episode)}
    >
      {/* Dialogue count and selected indicator - top right corner */}
      <div className="position-absolute" style={{ top: '8px', right: '8px', zIndex: 10, display: 'flex', gap: '8px', alignItems: 'center' }}>
        {/* Dialogue count badge */}
        <span className={`badge subtext-btn-sm ${dialogueCount > 0 ? 'bg-success' : 'bg-secondary'}`}>
          <i className="fas fa-comments me-1"></i>
          {dialogueCount}
        </span>
        
        {/* Selected indicator */}
        {isSelected && (
          <div 
            style={{ 
              backgroundColor: 'rgba(13, 110, 253, 0.9)',
              borderRadius: '50%',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <i className="fas fa-check text-white" style={{ fontSize: '12px' }}></i>
          </div>
        )}
      </div>
      <div className="card-body p-1">
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
                <div className="d-flex align-items-center my-1">
                  <span className="badge bg-primary me-2 subtext-btn-sm">
                    S{episode.season_number || 1}E{episode.episode_number}
                  </span>
                  <h6 className="subtext-btn mb-0">{episode.title}</h6>
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





