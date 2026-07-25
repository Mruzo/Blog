import React from 'react';
import { StoryCreationData } from '../StoryCreationWizard';

interface PublishStepProps {
  data: StoryCreationData;
  onDataUpdate: (data: Partial<StoryCreationData>) => void;
  onNext: () => void;
  onPrevious: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
  onSaveDraft?: () => void | Promise<void>;
  onPublish?: () => void | Promise<void>;
  isSaving?: boolean;
}

const PublishStep: React.FC<PublishStepProps> = ({ data }) => {
  const characterNames = data.characters.map((c) => c.name).filter(Boolean);
  const dialogueCount = data.dialogues.length;

  return (
    <div className="story-wizard-publish" data-testid="publish-step">
      <div className="story-wizard-publish__hero">
        <p className="story-wizard-publish__eyebrow">Ready to share</p>
        <h3 className="story-wizard-publish__title">
          {data.story.title.trim() || 'Untitled story'}
        </h3>
        {data.story.description.trim() ? (
          <p className="story-wizard-publish__description">{data.story.description}</p>
        ) : null}
      </div>

      <dl className="story-wizard-publish__meta">
        <div className="story-wizard-publish__metaItem">
          <dt>Season</dt>
          <dd>{data.season.title.trim() || '—'}</dd>
        </div>
        <div className="story-wizard-publish__metaItem">
          <dt>Episode</dt>
          <dd>{data.episode.title.trim() || '—'}</dd>
        </div>
        <div className="story-wizard-publish__metaItem">
          <dt>Cast</dt>
          <dd>
            {characterNames.length > 0
              ? characterNames.join(', ')
              : 'No characters yet'}
          </dd>
        </div>
        <div className="story-wizard-publish__metaItem">
          <dt>Script</dt>
          <dd>
            {dialogueCount === 1 ? '1 line' : `${dialogueCount} lines`}
          </dd>
        </div>
      </dl>

      {data.episode.description.trim() ? (
        <div className="story-wizard-publish__episode">
          <p className="story-wizard-publish__episodeLabel">Episode summary</p>
          <p className="story-wizard-publish__episodeText">{data.episode.description}</p>
        </div>
      ) : null}

      <p className="story-wizard-publish__note">
        Publish makes this story public. Save draft keeps it private. You can change
        visibility anytime from story edit.
      </p>
    </div>
  );
};

export default PublishStep;
