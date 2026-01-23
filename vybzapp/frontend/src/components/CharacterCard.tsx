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
  const getPersonalityColor = (personality: string) => {
    const personalityColors: { [key: string]: string } = {
      'Brave': 'bg-primary',
      'Shy': 'bg-info',
      'Confident': 'bg-warning text-dark',
      'Mysterious': 'bg-dark',
      'Funny': 'bg-success',
      'Serious': 'bg-secondary',
      'Optimistic': 'bg-success',
      'Pessimistic': 'bg-danger',
      'Loyal': 'bg-primary',
      'Independent': 'bg-warning text-dark',
      'Other': 'bg-secondary'
    };
    return personalityColors[personality] || 'bg-secondary';
  };

  return (
    <div className={`card h-100 ${className}`}>
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-start mb-2">
          <h6 className="subtext-btn mb-0">{character.name}</h6>
          {showActions && (
            <button 
              className="btn btn-sm btn-outline-danger" 
              type="button" 
              onClick={() => onDelete(character.id)}
              title="Delete character"
            >
              <i className="fas fa-trash"></i>
            </button>
          )}
        </div>
        
        <span className={`badge ${getPersonalityColor(character.personality)} subtext-btn-sm mb-2`}>
          {character.personality}
        </span>
        
        <p className="subtext-btn-sm text-muted mb-2" style={{ 
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden'
        }}>
          {character.bio}
        </p>
        
        {character.love_interest && (
          <div className="mb-2">
            <small className="text-muted subtext-btn-sm">
              <strong>Love Interest:</strong>
            </small>
            <p className="subtext-btn-sm text-muted mb-0" style={{ 
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}>
              {character.love_interest}
            </p>
          </div>
        )}
      </div>
      
      <div className="card-footer bg-transparent border-0 pt-0">
        <div className="d-flex justify-content-between align-items-center">
          <small className="text-muted subtext-btn-sm">
            Created: {new Date(character.created_at).toLocaleDateString()}
          </small>
          {showActions && (
            <button 
              className="btn btn-sm btn-outline-primary" 
              type="button" 
              onClick={() => onEdit(character)}
              title="Edit character"
            >
              <i className="fas fa-edit me-1"></i>Edit
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CharacterCard;
