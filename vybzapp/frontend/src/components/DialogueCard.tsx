import React from 'react';
import ScriptDialogueBlock, { stripHtmlTags } from './ScriptDialogueBlock';

interface Dialogue {
  id: number;
  character: number;
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
  characters: Character[];
  onEdit: (dialogue: Dialogue) => void;
  onDelete: (dialogueId: number) => void;
  showActions?: boolean;
  className?: string;
  showCameraInfo?: boolean;
  /** 'screenplay' = standard script layout; 'default' = compact metadata card */
  variant?: 'default' | 'screenplay';
  characterStyle?: 'dot' | 'accent';
}

const CHARACTER_COLORS = [
  '#0d6efd', '#198754', '#0dcaf0', '#fd7e14', '#dc3545',
  '#6f42c1', '#414042', '#20c997', '#6c757d', '#e83e8c',
];

const DialogueCard: React.FC<DialogueCardProps> = ({
  dialogue,
  characters,
  onEdit,
  onDelete,
  showActions = true,
  className = '',
  showCameraInfo = true,
  variant = 'screenplay',
}) => {
  const character = characters.find((char) => char.id === dialogue.character);
  const characterName = character ? character.name : `Character ${dialogue.character}`;
  const characterIndex = characters.findIndex((char) => char.id === dialogue.character);
  const characterColor = CHARACTER_COLORS[characterIndex >= 0 ? characterIndex % CHARACTER_COLORS.length : 0];

  if (variant === 'screenplay') {
    return (
      <div className={className}>
        <ScriptDialogueBlock
          order={dialogue.order}
          characterName={characterName}
          text={dialogue.text}
          sceneTitle={dialogue.scene_title}
          sceneDescription={dialogue.scene_description}
          showActions={showActions}
          onEdit={() => onEdit(dialogue)}
          onDelete={() => onDelete(dialogue.id)}
        />
        {showCameraInfo && (
          <p className="script-block__meta mb-0 mt-1 px-1">
            <i className="fas fa-camera me-1" aria-hidden />
            Orbit: {dialogue.camera_orbit} · Target: {dialogue.camera_target}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={`episode-manage__dialogueCard ${className}`}>
      <div className="p-2">
        <div className="d-flex justify-content-between align-items-start mb-2">
          <div className="d-flex align-items-center flex-wrap gap-1">
            <span className="dialogue-card__order" aria-label={`Order ${dialogue.order}`}>
              #{dialogue.order}
            </span>
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
          </div>
          {showActions && (
            <div className="episode-manage__cardActions">
              <button
                type="button"
                className="product-landing__ctaGhost story-manage__btnCompact"
                onClick={() => onEdit(dialogue)}
                title="Edit dialogue"
              >
                <i className="fas fa-edit me-1" aria-hidden />
                Edit
              </button>
              <button
                type="button"
                className="product-landing__ctaGhost story-manage__btnCompact story-manage__ghostDanger"
                onClick={() => onDelete(dialogue.id)}
                title="Delete dialogue"
              >
                <i className="fas fa-trash me-1" aria-hidden />
                Delete
              </button>
            </div>
          )}
        </div>

        <p
          className="subtext-btn-sm mb-2"
          style={{ lineHeight: '1.4', whiteSpace: 'pre-wrap' }}
        >
          &ldquo;{stripHtmlTags(dialogue.text)}&rdquo;
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
