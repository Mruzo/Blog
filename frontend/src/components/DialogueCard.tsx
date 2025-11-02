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

interface DialogueCardProps {
  dialogue: Dialogue;
  characters: Character[]; // Add characters array to get character name
  onEdit: (dialogue: Dialogue) => void;
  onDelete: (dialogueId: number) => void;
  showActions?: boolean;
  className?: string;
  showCameraInfo?: boolean;
}

const DialogueCard: React.FC<DialogueCardProps> = ({ 
  dialogue, 
  characters,
  onEdit, 
  onDelete, 
  showActions = true,
  className = '',
  showCameraInfo = true
}) => {
  // Get character name from POV ID
  const character = characters.find(char => char.id === dialogue.character);
  const characterName = character ? character.name : `Character ${dialogue.character}`;
  
  // Function to strip HTML tags and render as plain text
  const stripHtmlTags = (html: string): string => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    return tempDiv.textContent || tempDiv.innerText || '';
  };
  
  const getCharacterColor = (characterName: string) => {
    // Simple hash function to generate consistent colors
    let hash = 0;
    for (let i = 0; i < characterName.length; i++) {
      hash = characterName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = [
      'bg-primary', 'bg-success', 'bg-info', 'bg-warning', 'bg-danger',
      'bg-secondary', 'bg-dark', 'bg-light text-dark'
    ];
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className={`card mb-2 border-0 ${className}`}>
      <div className="card-body p-0 border-0">
        <div className="d-flex justify-content-between align-items-start mb-2">
          <div className="d-flex align-items-center">
            <span className="badge bg-secondary me-2 subtext-btn-sm">
              {dialogue.order}
            </span>
            <span className={`badge ${getCharacterColor(characterName)} subtext-btn-sm`}>
              {characterName}
            </span>
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
              <i className="fas fa-camera me-1"></i>
              {dialogue.shot_type} | Orbit: {dialogue.camera_orbit} | FOV: {dialogue.field_of_view}°
            </small>
          </div>
        )}
        
        <div className="mt-2">
          <small className="text-muted subtext-btn-sm">
            <i className="fas fa-clock me-1"></i>
            {new Date(dialogue.created_at).toLocaleDateString()}
          </small>
        </div>
      </div>
    </div>
  );
};

export default DialogueCard;

