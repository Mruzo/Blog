import React, { useState, useCallback, useLayoutEffect, useMemo } from 'react';
import { StoryCreationData } from '../StoryCreationWizard';
import SmallButton from '../SmallButton';
import ScriptDialogueBlock from '../ScriptDialogueBlock';
import { useApi } from '../../contexts/ApiContext';
import SimpleRichTextEditor from '../SimpleRichTextEditor';

interface DialoguesStepProps {
  data: StoryCreationData;
  onDataUpdate: (data: Partial<StoryCreationData>) => void;
  onNext: () => void;
  onPrevious: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
  registerFooterNext?: (fn: (() => Promise<void>) | null) => void;
}

interface Dialogue {
  id?: number;
  character: number;
  text: string;
  order: number;
  scene_title: string;
  scene_description: string;
  shot_type: string;
  camera_orbit: string;
  camera_target: string;
  field_of_view: number;
  zoom_speed: number;
  rotation: string;
}

const DEFAULT_CAMERA = {
  camera_orbit: '0deg 75deg 3m',
  camera_target: '0m 1.6m 0m',
  field_of_view: 45.0,
  zoom_speed: 1.0,
  rotation: '0deg 0deg 0deg',
};

function defaultCharacterId(characters: StoryCreationData['characters']): number {
  if (characters.length > 0 && characters[0].id !== undefined) {
    return characters[0].id as number;
  }
  return 0;
}

function createEmptyDialogue(order: number, characters: StoryCreationData['characters']): Dialogue {
  return {
    character: defaultCharacterId(characters),
    text: '',
    order,
    scene_title: '',
    scene_description: '',
    shot_type: '',
    ...DEFAULT_CAMERA,
  };
}

function getCharacterName(
  characterId: number,
  characters: StoryCreationData['characters']
): string {
  const character = characters.find((char) => char.id === characterId);
  return character?.name || `Character ${characterId}`;
}

function buildDialogueApiPayload(dialogue: Dialogue): Partial<Dialogue> {
  const payload: Partial<Dialogue> = {
    character: dialogue.character,
    text: dialogue.text,
    order: dialogue.order,
    scene_title: dialogue.scene_title,
    scene_description: dialogue.scene_description,
    camera_orbit: dialogue.camera_orbit,
    camera_target: dialogue.camera_target,
    field_of_view: dialogue.field_of_view,
    zoom_speed: dialogue.zoom_speed,
    rotation: dialogue.rotation,
  };
  if (dialogue.shot_type) {
    payload.shot_type = dialogue.shot_type;
  }
  return payload;
}

const DialoguesStep: React.FC<DialoguesStepProps> = ({
  data,
  onDataUpdate,
  onNext,
  registerFooterNext,
}) => {
  const { createDialogue, loadEpisodes, createEpisode } = useApi();
  const [dialogues, setDialogues] = useState<Dialogue[]>(
    data.dialogues.map((d) => ({
      ...d,
      character: d.character || 0,
      shot_type: d.shot_type || '',
    }))
  );
  const [currentDialogue, setCurrentDialogue] = useState<Dialogue>(() =>
    createEmptyDialogue(
      data.dialogues.length > 0 ? data.dialogues.length + 1 : 1,
      data.characters
    )
  );
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const resetForm = (nextOrder: number) => {
    setCurrentDialogue(createEmptyDialogue(nextOrder, data.characters));
    setEditingIndex(null);
    setErrors({});
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === 'character') {
      setCurrentDialogue((prev) => ({
        ...prev,
        character: parseInt(value, 10),
      }));
    } else if (name === 'field_of_view' || name === 'zoom_speed') {
      setCurrentDialogue((prev) => ({ ...prev, [name]: parseFloat(value) }));
    } else {
      setCurrentDialogue((prev) => ({ ...prev, [name]: value }));
    }

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateDialogue = (dialogue: Dialogue) => {
    const newErrors: Record<string, string> = {};

    if (!dialogue.character || dialogue.character === 0) {
      newErrors.character = 'Please select a character';
    }

    if (!dialogue.text.trim()) {
      newErrors.text = 'Dialogue text is required';
    }

    if (dialogue.order < 1) {
      newErrors.order = 'Order must be at least 1';
    }

    return newErrors;
  };

  const handleAddDialogue = () => {
    const newErrors = validateDialogue(currentDialogue);

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    let updatedDialogues: Dialogue[];
    if (editingIndex !== null) {
      updatedDialogues = [...dialogues];
      updatedDialogues[editingIndex] = currentDialogue;
    } else {
      updatedDialogues = [...dialogues, currentDialogue];
    }

    setDialogues(updatedDialogues);
    onDataUpdate({ dialogues: updatedDialogues });
    resetForm(updatedDialogues.length + 1);
  };

  const handleEditDialogue = (index: number) => {
    setCurrentDialogue(dialogues[index]);
    setEditingIndex(index);
  };

  const handleDeleteDialogue = (index: number) => {
    const updatedDialogues = dialogues
      .filter((_, i) => i !== index)
      .map((dialogue, i) => ({ ...dialogue, order: i + 1 }));
    setDialogues(updatedDialogues);
    onDataUpdate({ dialogues: updatedDialogues });
    if (editingIndex === index) {
      resetForm(updatedDialogues.length + 1);
    }
  };

  const resolveEpisodeId = useCallback(async (): Promise<number | undefined> => {
    if (data.episode.id) {
      return data.episode.id;
    }

    if (!data.season.id) {
      return undefined;
    }

    const existingEpisodes = await loadEpisodes(data.season.id);
    if (existingEpisodes.length > 0) {
      const existing = existingEpisodes[0];
      onDataUpdate({
        episode: {
          ...data.episode,
          id: existing.id,
          title: existing.title,
          episode_number: existing.episode_number,
          description: existing.description,
          summary: existing.summary || data.episode.summary,
          is_published: existing.is_published ?? data.episode.is_published,
        },
      });
      return existing.id;
    }

    const title = data.episode.title.trim() || 'Episode 1';
    const description = data.episode.description.trim() || 'Episode description';
    const savedEpisode = await createEpisode(data.season.id, {
      title,
      episode_number: data.episode.episode_number || 1,
      description,
      summary: data.episode.summary || '',
      is_published: false,
    });
    onDataUpdate({ episode: { ...data.episode, id: savedEpisode.id } });
    return savedEpisode.id;
  }, [data.episode, data.season.id, loadEpisodes, createEpisode, onDataUpdate]);

  const persistDialoguesAndAdvance = useCallback(async () => {
    if (dialogues.length === 0) {
      setErrors({ general: 'Please add at least one dialogue' });
      return;
    }

    setIsSaving(true);
    try {
      const episodeId = await resolveEpisodeId();
      if (!episodeId) {
        setErrors({ general: 'Episode not found. Please go back and complete the episode setup.' });
        return;
      }

      const savedDialogues = [];
      for (const dialogue of dialogues) {
        if (!dialogue.id || typeof dialogue.id === 'string') {
          if (!dialogue.character || dialogue.character === 0) {
            console.warn('Skipping dialogue with invalid character:', dialogue);
            continue;
          }

          const savedDialogue = await createDialogue(
            episodeId,
            buildDialogueApiPayload(dialogue)
          );
          savedDialogues.push(savedDialogue);
        } else {
          savedDialogues.push(dialogue);
        }
      }

      onDataUpdate({ dialogues: savedDialogues });
      onNext();
    } catch (error) {
      console.error('Error saving dialogues:', error);
      setErrors({ general: 'Failed to save dialogues. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  }, [dialogues, resolveEpisodeId, createDialogue, onDataUpdate, onNext]);

  useLayoutEffect(() => {
    if (!registerFooterNext) {
      return;
    }
    registerFooterNext(() => persistDialoguesAndAdvance());
    return () => registerFooterNext(null);
  }, [registerFooterNext, persistDialoguesAndAdvance]);

  const sortedDialogues = [...dialogues].sort((a, b) => a.order - b.order);

  const previewCharacterName = useMemo(
    () => getCharacterName(currentDialogue.character, data.characters),
    [currentDialogue.character, data.characters]
  );

  return (
    <div className="dialogues-step" data-testid="dialogues-step">
      {errors.general && (
        <div className="dialogues-step__alert" role="alert">
          <i className="fas fa-exclamation-triangle me-2" aria-hidden />
          {errors.general}
        </div>
      )}

      <section className="dialogues-step__section" aria-labelledby="dialogues-form-title">
        <h3 className="dialogues-step__sectionTitle" id="dialogues-form-title">
          {editingIndex !== null ? 'Edit line' : 'New line'}
        </h3>
        <p className="dialogues-step__formatHint">
          Lines use standard screenplay layout — character names centered in caps, dialogue in a
          narrow block below.
        </p>

        <div className="row g-2">
          <div className="col-sm-3 col-md-2">
            <div className="dialogues-step__field">
              <label htmlFor="order" className="form-label subtext-btn-sm mb-1">
                Order <span className="text-danger">*</span>
              </label>
              <input
                type="number"
                className={`form-control form-control-sm ${errors.order ? 'is-invalid' : ''}`}
                id="order"
                name="order"
                min="1"
                value={currentDialogue.order}
                onChange={handleInputChange}
              />
              {errors.order && <div className="invalid-feedback d-block">{errors.order}</div>}
            </div>
          </div>

          <div className="col-sm-9 col-md-4">
            <div className="dialogues-step__field">
              <label htmlFor="character" className="form-label subtext-btn-sm mb-1">
                Character <span className="text-danger">*</span>
              </label>
              <select
                className={`form-select form-select-sm ${errors.character ? 'is-invalid' : ''} font-quicksand`}
                id="character"
                name="character"
                value={currentDialogue.character || ''}
                onChange={handleInputChange}
              >
                <option value="">Select character</option>
                {data.characters.map((character) => (
                  <option key={character.id} value={character.id}>
                    {character.name}
                  </option>
                ))}
              </select>
              {errors.character && <div className="invalid-feedback d-block">{errors.character}</div>}
            </div>
          </div>

          <div className="col-12">
            <div className="dialogues-step__field">
              <label htmlFor="dialogue-text" className="form-label subtext-btn-sm mb-1">
                Dialogue text <span className="text-danger">*</span>
              </label>
              <SimpleRichTextEditor
                id="dialogue-text"
                value={currentDialogue.text}
                onChange={(content) => {
                  setCurrentDialogue((prev) => ({ ...prev, text: content }));
                  if (errors.text) {
                    setErrors((prev) => ({ ...prev, text: '' }));
                  }
                }}
                maxLength={500}
                placeholder="Enter the dialogue text..."
                className={errors.text ? 'is-invalid' : ''}
                rows={3}
              />
              {errors.text && <div className="invalid-feedback d-block">{errors.text}</div>}
            </div>
          </div>
        </div>

        <details className="dialogues-step__sceneFields">
          <summary>Scene heading &amp; action (optional)</summary>
          <div className="dialogues-step__cameraGrid mt-2">
            <div className="dialogues-step__cameraFull">
              <label htmlFor="scene_title" className="form-label subtext-btn-sm mb-1">
                Scene heading
              </label>
              <input
                type="text"
                className="form-control form-control-sm font-monospace"
                id="scene_title"
                name="scene_title"
                value={currentDialogue.scene_title}
                onChange={handleInputChange}
                placeholder="INT. COFFEE SHOP - DAY"
              />
            </div>
            <div className="dialogues-step__cameraFull">
              <label htmlFor="scene_description" className="form-label subtext-btn-sm mb-1">
                Action / direction
              </label>
              <textarea
                className="form-control form-control-sm font-monospace"
                id="scene_description"
                name="scene_description"
                rows={2}
                value={currentDialogue.scene_description}
                onChange={handleInputChange}
                placeholder="Sarah enters, rain-soaked, and scans the room."
              />
            </div>
          </div>
        </details>

        <div className="dialogues-step__preview" aria-live="polite">
          <p className="dialogues-step__previewLabel">Preview</p>
          <ScriptDialogueBlock
            compact
            order={currentDialogue.order}
            characterName={previewCharacterName}
            text={currentDialogue.text}
            sceneTitle={currentDialogue.scene_title}
            sceneDescription={currentDialogue.scene_description}
          />
        </div>

        <details className="dialogues-step__camera">
          <summary>Camera settings (optional)</summary>
          <div className="dialogues-step__cameraGrid">
            <div>
              <label htmlFor="camera_orbit" className="form-label subtext-btn-sm mb-1">
                Orbit
              </label>
              <input
                type="text"
                className="form-control form-control-sm"
                id="camera_orbit"
                name="camera_orbit"
                value={currentDialogue.camera_orbit}
                onChange={handleInputChange}
                placeholder="0deg 75deg 3m"
              />
            </div>
            <div>
              <label htmlFor="camera_target" className="form-label subtext-btn-sm mb-1">
                Target
              </label>
              <input
                type="text"
                className="form-control form-control-sm"
                id="camera_target"
                name="camera_target"
                value={currentDialogue.camera_target}
                onChange={handleInputChange}
                placeholder="0m 1.6m 0m"
              />
            </div>
            <div>
              <label htmlFor="field_of_view" className="form-label subtext-btn-sm mb-1">
                Field of view (°)
              </label>
              <input
                type="number"
                className="form-control form-control-sm"
                id="field_of_view"
                name="field_of_view"
                step="0.1"
                min="0"
                max="180"
                value={currentDialogue.field_of_view}
                onChange={handleInputChange}
              />
            </div>
            <div>
              <label htmlFor="zoom_speed" className="form-label subtext-btn-sm mb-1">
                Zoom speed
              </label>
              <input
                type="number"
                className="form-control form-control-sm"
                id="zoom_speed"
                name="zoom_speed"
                step="0.1"
                min="0"
                value={currentDialogue.zoom_speed}
                onChange={handleInputChange}
              />
            </div>
            <div className="dialogues-step__cameraFull">
              <label htmlFor="rotation" className="form-label subtext-btn-sm mb-1">
                Rotation
              </label>
              <input
                type="text"
                className="form-control form-control-sm"
                id="rotation"
                name="rotation"
                value={currentDialogue.rotation}
                onChange={handleInputChange}
                placeholder="0deg 0deg 0deg"
              />
            </div>
          </div>
        </details>

        <div className="dialogues-step__actions">
          <SmallButton variant="primary" onClick={handleAddDialogue} disabled={isSaving}>
            <i className="fas fa-plus me-1" aria-hidden />
            {editingIndex !== null ? 'Update line' : 'Add line'}
          </SmallButton>

          {editingIndex !== null && (
            <SmallButton
              variant="outline-secondary"
              onClick={() => resetForm(dialogues.length + 1)}
            >
              <i className="fas fa-times me-1" aria-hidden />
              Cancel
            </SmallButton>
          )}
        </div>
      </section>

      {sortedDialogues.length > 0 && (
        <section className="dialogues-step__section" aria-labelledby="dialogues-list-title">
          <h3 className="dialogues-step__sectionTitle" id="dialogues-list-title">
            Script ({sortedDialogues.length})
          </h3>

          <div className="dialogues-step__scriptPage">
            <div className="dialogues-step__list">
              {sortedDialogues.map((dialogue) => {
                const index = dialogues.indexOf(dialogue);
                const characterName = getCharacterName(dialogue.character, data.characters);

                return (
                  <div key={`dialogue-${dialogue.order}-${index}`} className="dialogues-step__card">
                    <ScriptDialogueBlock
                      order={dialogue.order}
                      characterName={characterName}
                      text={dialogue.text}
                      sceneTitle={dialogue.scene_title}
                      sceneDescription={dialogue.scene_description}
                      showActions
                      onEdit={() => handleEditDialogue(index)}
                      onDelete={() => handleDeleteDialogue(index)}
                    />
                    <details className="dialogues-step__camera dialogues-step__camera--inline mt-2 px-2 pb-2">
                      <summary>Camera</summary>
                      <p className="subtext-btn-sm text-muted mb-0 mt-1 font-monospace">
                        Orbit: {dialogue.camera_orbit} · Target: {dialogue.camera_target}
                        <br />
                        FOV: {dialogue.field_of_view}° · Zoom: {dialogue.zoom_speed} · Rot:{' '}
                        {dialogue.rotation}
                      </p>
                    </details>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default DialoguesStep;
