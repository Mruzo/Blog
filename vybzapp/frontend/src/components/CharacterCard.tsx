import React from 'react';

interface Character {
  id: number;
  name: string;
  bio: string;
  personality: string;
  love_interest: string;
  user: number;
  created_at: string;
  updated_at: string;
}

interface CharacterCardProps {
  character: Character;
  onEdit: (character: Character) => void;
  onDelete: (characterId: number) => void;
  showActions?: boolean;
  className?: string;
}

const CharacterCard: React.FC<CharacterCardProps> = ({ 
  character, 
  onEdit, 
  onDelete, 
  showActions = true,
  className = ''
}) => {
  return (
    <article className={`my-studio__storyCard character-card ${className}`}>
      <div className="my-studio__storyBody">
        <header className="my-studio__storyHead">
          <h3 className="my-studio__storyTitle">{character.name}</h3>
          {showActions && (
            <button 
              className="product-landing__ctaGhost story-manage__btnCompact story-manage__ghostDanger"
              type="button" 
              onClick={() => onDelete(character.id)}
              title="Delete character"
              aria-label={`Delete ${character.name}`}
            >
              <i className="fas fa-trash"></i>
            </button>
          )}
        </header>
        
        {character.personality && (
          <div className="stories-landing__chips">
            <span className="stories-landing__chip text-truncate">
              {character.personality}
            </span>
          </div>
        )}
        
        <p className="my-studio__storyDesc" style={{ overflowWrap: 'anywhere' }}>
          {character.bio}
        </p>
        
        {character.love_interest && (
          <div className="stories-landing__subsection">
            <div className="stories-landing__subsectionLabel">Love Interest</div>
            <p className="my-studio__storyDesc mb-0" style={{ overflowWrap: 'anywhere' }}>
              {character.love_interest}
            </p>
          </div>
        )}
      </div>

      <footer className="my-studio__storyFooter">
        <div className="d-flex align-items-center justify-content-between gap-2">
          <time className="my-studio__storyDate" dateTime={character.created_at}>
            Created: {new Date(character.created_at).toLocaleDateString()}
          </time>
          {showActions && (
            <button
              className="product-landing__ctaGhost story-manage__btnCompact"
              type="button"
              onClick={() => onEdit(character)}
              title="Edit character"
            >
              <i className="fas fa-edit"></i>
              <span>Edit</span>
            </button>
          )}
        </div>
      </footer>
    </article>
  );
};

export default CharacterCard;
