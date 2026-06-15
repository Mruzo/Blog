import React from 'react';
import SmallButton from './SmallButton';

export function stripHtmlTags(html: string): string {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  return tempDiv.textContent || tempDiv.innerText || '';
}

export interface ScriptDialogueBlockProps {
  order?: number;
  characterName: string;
  text: string;
  sceneTitle?: string;
  sceneDescription?: string;
  showActions?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
  /** Compact variant for inline live preview */
  compact?: boolean;
}

const ScriptDialogueBlock: React.FC<ScriptDialogueBlockProps> = ({
  order,
  characterName,
  text,
  sceneTitle,
  sceneDescription,
  showActions = false,
  onEdit,
  onDelete,
  className = '',
  compact = false,
}) => {
  const plainText = stripHtmlTags(text).trim();
  const slugline = sceneTitle?.trim();
  const action = sceneDescription?.trim();
  const cue = characterName.trim().toUpperCase() || 'CHARACTER';

  return (
    <article
      className={`script-block${compact ? ' script-block--compact' : ''} ${className}`.trim()}
      aria-label={order != null ? `Script line ${order}, ${characterName}` : `Script line, ${characterName}`}
    >
      {order != null && (
        <span className="script-block__lineNum" aria-hidden>
          {order}.
        </span>
      )}

      {showActions && (onEdit || onDelete) && (
        <div className="script-block__actions">
          {onEdit && (
            <SmallButton variant="outline-primary" onClick={onEdit} title="Edit line">
              <i className="fas fa-edit" aria-hidden />
            </SmallButton>
          )}
          {onDelete && (
            <SmallButton variant="outline-danger" onClick={onDelete} title="Delete line">
              <i className="fas fa-trash" aria-hidden />
            </SmallButton>
          )}
        </div>
      )}

      {slugline && <p className="script-block__slugline">{slugline.toUpperCase()}</p>}

      {action && <p className="script-block__action">{action}</p>}

      <p className="script-block__character">{cue}</p>

      <div className="script-block__dialogue">
        {plainText ? (
          <p className="script-block__dialogueText">{plainText}</p>
        ) : (
          <p className="script-block__dialogueText script-block__dialogueText--empty">
            Dialogue goes here…
          </p>
        )}
      </div>
    </article>
  );
};

export default ScriptDialogueBlock;
