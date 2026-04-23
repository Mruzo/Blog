import React from 'react';

interface Dialogue {
  id: number;
  character: number; // Character ID (who is speaking)
  text: string;
  order: number;
  episode: number;
  scene_title: string;
  scene_description: string;
  shot_type: string;
  camera_orbit: string;
  camera_target: string;
  field_of_view: number;
  zoom_speed: number;
  rotation: string;
  created_at: string;
  updated_at: string;
}

interface Character {
  id: number;
  name: string;
  personality: string;
  love_interest: string;
  bio: string;
  user: number;
  created_at: string;
  updated_at: string;
}

/** 'dot' = colored dot + name (default). 'accent' = left border + light background. */
interface DialogueCardProps {
  dialogue: Dialogue;
  characters: Character[];
  onEdit: (dialogue: Dialogue) => void;
  onDelete: (dialogueId: number) => void;
  showActions?: boolean;
  className?: string;
  showCameraInfo?: boolean;
  characterStyle?: 'dot' | 'accent';
}

const CHARACTER_COLORS = [
  '#0d6efd', '#198754', '#0dcaf0', '#fd7e14', '#dc3545',
  '#6f42c1', '#414042', '#20c997', '#6c757d', '#e83e8c'
];

const DialogueCard: React.FC<DialogueCardProps> = ({ 
  dialogue, 
  characters,
  onEdit, 
  onDelete, 
  showActions = true,
  className = '',
  showCameraInfo = true,
  characterStyle = 'dot'
}) => {
  const character = characters.find(char => char.id === dialogue.character);
  const characterName = character ? character.name : `Character ${dialogue.character}`;
  // One color per character: use index in list so each character is distinct
  const characterIndex = characters.findIndex(char => char.id === dialogue.character);
  const characterColor = CHARACTER_COLORS[characterIndex >= 0 ? characterIndex % CHARACTER_COLORS.length : 0];

  const stripHtmlTags = (html: string): string => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    return tempDiv.textContent || tempDiv.innerText || '';
  };

  return (
    <div className={`episode-manage__dialogueCard ${className}`}>
      <div className="p-2">
        <div className="d-flex justify-content-between align-items-start mb-2">
          <div className="d-flex align-items-center flex-wrap gap-1">
            <span className="dialogue-card__order" aria-label={`Order ${dialogue.order}`}>
              #{dialogue.order}
            </span>
            {characterStyle === 'dot' ? (
              <span
                className="dialogue-card__character dialogue-card__character--dot subtext-btn-sm"
                aria-label={`Character: ${characterName}`}
              >
                <span
                  className="dialogue-card__character-dot"
                  style={{ backgroundColor: characterColor }}
                  aria-hidden
                />
                {characterName}
              </span>
            ) : (
              <span
                className="dialogue-card__character subtext-btn-sm"
                style={{ color: characterColor }}
                aria-label={`Character: ${characterName}`}
              >
                {characterName}
              </span>
            )}
          </div>
          {showActions && (
            <div className="d-flex gap-2">
              <button 
                className="btn btn-sm btn-outline-primary" 
                type="button" 
                onClick={() => onEdit(dialogue)}
                title="Edit dialogue"
              >
                <i className="fas fa-edit"></i>
              </button>
              <button 
                className="btn btn-sm btn-outline-danger" 
                type="button" 
                onClick={() => onDelete(dialogue.id)}
                title="Delete dialogue"
              >
                <i className="fas fa-trash"></i>
              </button>
            </div>
          )}
        </div>
        
        <p className="subtext-btn-sm mb-2" style={{ 
          lineHeight: '1.4',
          whiteSpace: 'pre-wrap'
        }}>
          "{stripHtmlTags(dialogue.text)}"
        </p>
        
        {showCameraInfo && (
          <div className="mt-2">
            <small className="text-muted subtext-btn-sm">
              <i className="fas fa-camera me-1">&nbsp;</i>
               Orbit: {dialogue.camera_orbit} | Target: {dialogue.camera_target}
            </small>
          </div>
        )}
        
        
      </div>
    </div>
  );
};

export default DialogueCard;

