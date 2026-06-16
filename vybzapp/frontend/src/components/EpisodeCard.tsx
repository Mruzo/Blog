import React from 'react';
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
  dialogueCount = 0,
}) => {
  const stripHtmlTags = (html: string): string => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    return tempDiv.textContent || tempDiv.innerText || '';
  };

  const description = stripHtmlTags(episode.description);
  const hasCover = episode.cover_image && typeof episode.cover_image === 'string';
  const epLabel = `S${episode.season_number || 1}E${episode.episode_number}`;

  return (
    <div
      className={`episode-manage__epCard ${isSelected ? 'episode-manage__epCard--selected' : ''} ${className}`}
      onClick={() => onSelect(episode)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(episode);
        }
      }}
    >
      <div className="episode-manage__epCardInner">
        <div className="episode-manage__epCardMediaWrap">
          <div className="episode-manage__epCardMedia">
            {hasCover ? (
              <img
                src={episode.cover_image as string}
                alt=""
                className="episode-manage__epCardImg"
                loading="lazy"
              />
            ) : (
              <div className="episode-manage__epCardPlaceholder" aria-hidden>
                <i className="fas fa-film" />
              </div>
            )}
            <span className="episode-manage__epCardEpBadge" aria-label={`Episode ${epLabel}`}>
              {epLabel}
            </span>
          </div>
        </div>

        <div className="episode-manage__epCardBody">
          <h6 className="episode-manage__epCardTitle">{episode.title}</h6>

          <div className="stories-landing__chips episode-manage__epCardMeta" aria-label="Episode status">
            <span
              className={`stories-landing__chip ${episode.is_published ? 'stories-landing__chip--success' : ''}`}
            >
              {episode.is_published ? 'Published' : 'Draft'}
            </span>
            <span className="stories-landing__chip">
              <i className="fas fa-comments me-1" aria-hidden />
              {dialogueCount} {dialogueCount === 1 ? 'dialogue' : 'dialogues'}
            </span>
            {isSelected && (
              <span className="stories-landing__chip episode-manage__epCardMetaChip--selected">
                <i className="fas fa-check me-1" aria-hidden />
                Selected
              </span>
            )}
          </div>

          {description ? (
            <p className="episode-manage__epCardDesc">{description}</p>
          ) : null}

          <div className="episode-manage__epCardFoot">
            <time className="episode-manage__epCardDate" dateTime={episode.created_at}>
              {new Date(episode.created_at).toLocaleDateString()}
            </time>
            {showActions && (
              <div className="episode-manage__epCardActions">
                <button
                  type="button"
                  className="product-landing__ctaGhost story-manage__btnCompact"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(episode);
                  }}
                >
                  <i className="fas fa-edit me-1" aria-hidden />
                  Edit
                </button>
                <button
                  type="button"
                  className="product-landing__ctaGhost story-manage__btnCompact story-manage__ghostDanger"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(episode.id);
                  }}
                >
                  <i className="fas fa-trash me-1" aria-hidden />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EpisodeCard;
