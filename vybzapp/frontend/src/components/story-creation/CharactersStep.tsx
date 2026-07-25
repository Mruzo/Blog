import React, { useState, useLayoutEffect, useCallback } from 'react';
import { StoryCreationData } from '../StoryCreationWizard';
import SmallButton from '../SmallButton';
import CharacterCard from '../CharacterCard';
import MessagePopup from '../MessagePopup';
import FormFieldWithLimit from '../FormFieldWithLimit';
import { useApi } from '../../contexts/ApiContext';
import { getApiErrorMessage } from '../../utils/getApiErrorMessage';
import {
  MAX_CHARACTERS_PER_STORY,
  SCENE_SLOT_PRESETS,
  coordsForSceneSlot,
  type SceneSlotKey,
} from '../../utils/sceneSlots';

interface CharactersStepProps {
  data: StoryCreationData;
  onDataUpdate: (data: Partial<StoryCreationData>) => void;
  onNext: () => void;
  onPrevious: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
  /** Wizard footer Next calls this to persist characters before advancing */
  registerFooterNext?: (fn: (() => Promise<void>) | null) => void;
}

interface Character {
  id?: number;
  name: string;
  bio: string;
  personality: string;
  love_interest: string;
  scene_slot?: string | null;
  pov_head_x?: number;
  pov_head_y?: number;
  pov_head_z?: number;
  user?: number;
  created_at?: string;
  updated_at?: string;
}

const EMPTY_CHARACTER: Character = {
  name: '',
  bio: '',
  personality: '',
  love_interest: '',
  scene_slot: '',
};

const CharactersStep: React.FC<CharactersStepProps> = ({
  data,
  onDataUpdate,
  onNext,
  registerFooterNext,
}) => {
  const { createStory, createSeason, createCharacter, loadSeasons } = useApi();
  const [characters, setCharacters] = useState<Character[]>(data.characters);
  const [currentCharacter, setCurrentCharacter] = useState<Character>(EMPTY_CHARACTER);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'success' | 'danger' | 'warning' | 'info'>('success');
  const [showMessage, setShowMessage] = useState(false);

  const personalities = [
    'Brave',
    'Shy',
    'Confident',
    'Mysterious',
    'Funny',
    'Serious',
    'Optimistic',
    'Pessimistic',
    'Loyal',
    'Independent',
    'Other',
  ];

  const takenSlots = characters
    .map((character, index) => (index === editingIndex ? null : character.scene_slot))
    .filter((slot): slot is string => Boolean(slot));

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCurrentCharacter((prev) => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSlotSelect = (slot: SceneSlotKey) => {
    const coords = coordsForSceneSlot(slot);
    setCurrentCharacter((prev) => ({
      ...prev,
      scene_slot: slot,
      pov_head_x: coords?.head_x,
      pov_head_y: coords?.head_y,
      pov_head_z: coords?.head_z,
    }));
    if (errors.scene_slot) {
      setErrors((prev) => ({ ...prev, scene_slot: '' }));
    }
  };

  const validateCharacter = (character: Character) => {
    const newErrors: Record<string, string> = {};

    if (!character.name.trim()) {
      newErrors.name = 'Character name is required';
    }

    if (!character.bio.trim()) {
      newErrors.bio = 'Character bio is required';
    }

    if (!character.personality) {
      newErrors.personality = 'Please select a personality';
    }

    if (!character.scene_slot) {
      newErrors.scene_slot = 'Select a scene slot';
    } else if (takenSlots.includes(character.scene_slot)) {
      newErrors.scene_slot = `${character.scene_slot} is already used by another character`;
    }

    return newErrors;
  };

  const resetForm = () => {
    setCurrentCharacter(EMPTY_CHARACTER);
    setEditingIndex(null);
    setErrors({});
  };

  const handleAddCharacter = () => {
    const newErrors = validateCharacter(currentCharacter);

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (editingIndex !== null) {
      const updatedCharacters = [...characters];
      updatedCharacters[editingIndex] = currentCharacter;
      setCharacters(updatedCharacters);
      onDataUpdate({ characters: updatedCharacters });
    } else {
      if (characters.length >= MAX_CHARACTERS_PER_STORY) {
        setErrors({
          general: `Stories can have at most ${MAX_CHARACTERS_PER_STORY} characters.`,
        });
        return;
      }
      const newCharacter = { ...currentCharacter };
      delete (newCharacter as { id?: number }).id;
      const updatedCharacters = [...characters, newCharacter];
      setCharacters(updatedCharacters);
      onDataUpdate({ characters: updatedCharacters });
    }

    setCurrentCharacter(EMPTY_CHARACTER);
    setEditingIndex(null);
    setErrors({});
  };

  const handleEditCharacter = (index: number) => {
    setCurrentCharacter(characters[index]);
    setEditingIndex(index);
  };

  const handleDeleteCharacter = (index: number) => {
    const updatedCharacters = characters.filter((_, i) => i !== index);
    setCharacters(updatedCharacters);
    onDataUpdate({ characters: updatedCharacters });
    if (editingIndex === index) {
      resetForm();
    }
  };

  const persistCharactersAndAdvance = useCallback(async () => {
    if (characters.length === 0) {
      setErrors({ general: 'Please add at least one character' });
      return;
    }

    try {
      let storyId = data.story.id;
      if (!storyId) {
        if (!data.story.title.trim()) {
          setMessage('Please enter a story title before saving.');
          setMessageType('warning');
          setShowMessage(true);
          return;
        }

        const story = await createStory({
          title: data.story.title.trim(),
          description: data.story.description.trim() || 'No description provided',
          is_public: data.story.is_public,
        });
        storyId = story.id;
        onDataUpdate({ story: { ...data.story, id: storyId } });
      }

      let seasonId = data.season.id;
      if (!seasonId) {
        const existingSeasons = await loadSeasons(storyId);
        if (existingSeasons.length > 0) {
          const existing = existingSeasons[0];
          seasonId = existing.id;
          onDataUpdate({
            season: {
              ...data.season,
              id: seasonId,
              title: existing.title,
              season_number: existing.season_number,
              description: existing.description,
              release_date: existing.release_date,
            },
          });
        } else {
          const season = await createSeason(storyId, {
            title: data.season.title.trim() || 'Season 1',
            season_number: data.season.season_number || 1,
            description: data.season.description.trim() || '',
            release_date:
              data.season.release_date ||
              new Date().toISOString().split('T')[0],
          });
          seasonId = season.id;
          onDataUpdate({ season: { ...data.season, id: seasonId } });
        }
      }

      const savedCharacters = [];
      for (const character of characters) {
        const coords = coordsForSceneSlot(character.scene_slot);
        if (character.id == null) {
          const savedCharacter = await createCharacter(storyId, {
            name: character.name,
            bio: character.bio,
            personality: character.personality,
            love_interest: (character.love_interest || '').trim(),
            scene_slot: character.scene_slot || null,
          });
          savedCharacters.push({
            ...savedCharacter,
            scene_slot: character.scene_slot,
            pov_head_x: coords?.head_x ?? character.pov_head_x,
            pov_head_y: coords?.head_y ?? character.pov_head_y,
            pov_head_z: coords?.head_z ?? character.pov_head_z,
          });
        } else {
          savedCharacters.push({
            ...character,
            scene_slot: character.scene_slot,
            pov_head_x: coords?.head_x ?? character.pov_head_x,
            pov_head_y: coords?.head_y ?? character.pov_head_y,
            pov_head_z: coords?.head_z ?? character.pov_head_z,
          });
        }
      }

      onDataUpdate({ characters: savedCharacters });
      onNext();
    } catch (error) {
      console.error('Error saving story data:', error);
      setErrors({
        general: getApiErrorMessage(error, 'Failed to save story data. Please try again.'),
      });
    }
  }, [
    characters,
    data.story,
    data.season,
    createStory,
    createSeason,
    createCharacter,
    loadSeasons,
    onDataUpdate,
    onNext,
  ]);

  useLayoutEffect(() => {
    if (!registerFooterNext) {
      return;
    }
    registerFooterNext(() => persistCharactersAndAdvance());
    return () => registerFooterNext(null);
  }, [registerFooterNext, persistCharactersAndAdvance]);

  const canAddMore = characters.length < MAX_CHARACTERS_PER_STORY || editingIndex !== null;

  return (
    <div className="characters-step" data-testid="characters-step">
      <MessagePopup
        message={message}
        type={messageType}
        show={showMessage}
        onClose={() => setShowMessage(false)}
      />

      {errors.general && (
        <div className="characters-step__alert" role="alert">
          <i className="fas fa-exclamation-triangle me-2" aria-hidden />
          {errors.general}
        </div>
      )}

      <section className="characters-step__section" aria-labelledby="characters-form-title">
        <h3 className="characters-step__sectionTitle" id="characters-form-title">
          {editingIndex !== null ? 'Edit character' : 'New character'}
        </h3>

        {!canAddMore && editingIndex === null ? (
          <p className="characters-step__povHint" role="status">
            Cast is full ({MAX_CHARACTERS_PER_STORY}/{MAX_CHARACTERS_PER_STORY}). Edit or remove a
            character to change slots.
          </p>
        ) : (
          <>
            <div className="row g-2">
              <div className="col-md-6">
                <div className="characters-step__field">
                  <label htmlFor="name" className="form-label subtext-btn-sm mb-1">
                    Name <span className="text-danger">*</span>
                  </label>
                  <FormFieldWithLimit value={currentCharacter.name} maxLength={50}>
                    <input
                      type="text"
                      className={`form-control form-control-sm ${errors.name ? 'is-invalid' : ''}`}
                      id="name"
                      name="name"
                      value={currentCharacter.name}
                      onChange={handleInputChange}
                      placeholder="Character name"
                    />
                  </FormFieldWithLimit>
                  {errors.name && <div className="invalid-feedback d-block">{errors.name}</div>}
                </div>
              </div>

              <div className="col-md-6">
                <div className="characters-step__field">
                  <label htmlFor="personality" className="form-label subtext-btn-sm mb-1">
                    Personality <span className="text-danger">*</span>
                  </label>
                  <select
                    className={`form-select form-select-sm ${errors.personality ? 'is-invalid' : ''} font-quicksand`}
                    id="personality"
                    name="personality"
                    value={currentCharacter.personality}
                    onChange={handleInputChange}
                  >
                    <option value="">Select personality</option>
                    {personalities.map((personality) => (
                      <option key={personality} value={personality}>
                        {personality}
                      </option>
                    ))}
                  </select>
                  {errors.personality && <div className="invalid-feedback d-block">{errors.personality}</div>}
                </div>
              </div>

              <div className="col-12">
                <div className="characters-step__field">
                  <label htmlFor="bio" className="form-label subtext-btn-sm mb-1">
                    Bio <span className="text-danger">*</span>
                  </label>
                  <FormFieldWithLimit value={currentCharacter.bio} maxLength={500}>
                    <textarea
                      className={`form-control form-control-sm ${errors.bio ? 'is-invalid' : ''}`}
                      id="bio"
                      name="bio"
                      rows={3}
                      value={currentCharacter.bio}
                      onChange={handleInputChange}
                      placeholder="Personality, background, motivations…"
                    />
                  </FormFieldWithLimit>
                  {errors.bio && <div className="invalid-feedback d-block">{errors.bio}</div>}
                </div>
              </div>
            </div>

            <div className="characters-step__field">
              <span className="form-label subtext-btn-sm mb-1 d-block">
                Scene slot <span className="text-danger">*</span>
              </span>
              <p className="characters-step__povHint">
                Each character stands in one shared-scene position. One slot per cast member.
              </p>
              <div className="characters-step__slots" role="radiogroup" aria-label="Scene slot">
                {SCENE_SLOT_PRESETS.map((preset) => {
                  const taken = takenSlots.includes(preset.key);
                  const selected = currentCharacter.scene_slot === preset.key;
                  return (
                    <button
                      key={preset.key}
                      type="button"
                      className={`characters-step__slot${selected ? ' is-selected' : ''}`}
                      onClick={() => handleSlotSelect(preset.key)}
                      disabled={taken}
                      aria-pressed={selected}
                      title={
                        taken
                          ? `${preset.label} is already taken`
                          : `${preset.label} (${preset.head_x}, ${preset.head_y}, ${preset.head_z})`
                      }
                    >
                      <span className="characters-step__slotLabel">{preset.label}</span>
                      <span className="characters-step__slotCoords">
                        {preset.head_x}, {preset.head_y}, {preset.head_z}
                      </span>
                    </button>
                  );
                })}
              </div>
              {errors.scene_slot && <div className="invalid-feedback d-block">{errors.scene_slot}</div>}
            </div>

            <div className="characters-step__actions">
              <SmallButton variant="primary" onClick={handleAddCharacter}>
                <i className="fas fa-plus me-1" aria-hidden />
                {editingIndex !== null ? 'Update' : 'Add character'}
              </SmallButton>
              {editingIndex !== null && (
                <SmallButton variant="outline-secondary" onClick={resetForm}>
                  <i className="fas fa-times me-1" aria-hidden />
                  Cancel
                </SmallButton>
              )}
            </div>
          </>
        )}
      </section>

      {characters.length > 0 && (
        <section className="characters-step__section" aria-labelledby="characters-list-title">
          <h3 className="characters-step__sectionTitle" id="characters-list-title">
            Added ({characters.length}/{MAX_CHARACTERS_PER_STORY})
          </h3>
          <div className="characters-step__grid">
            {characters.map((character, index) => (
              <CharacterCard
                key={index}
                className="characters-step__card"
                character={{
                  id: index,
                  name: character.scene_slot
                    ? `${character.name} · ${character.scene_slot}`
                    : character.name,
                  bio: character.bio,
                  personality: character.personality,
                  love_interest: character.love_interest,
                  user: 0,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                }}
                onEdit={() => handleEditCharacter(index)}
                onDelete={() => handleDeleteCharacter(index)}
                showActions
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default CharactersStep;
