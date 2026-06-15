import React, { useState, useLayoutEffect, useCallback } from 'react';
import { StoryCreationData } from '../StoryCreationWizard';
import SmallButton from '../SmallButton';
import CharacterCard from '../CharacterCard';
import MessagePopup from '../MessagePopup';
import FormFieldWithLimit from '../FormFieldWithLimit';
import { useApi } from '../../contexts/ApiContext';
import { getApiErrorMessage } from '../../utils/getApiErrorMessage';

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
  pov_head_x: 0.0,
  pov_head_y: 1.6,
  pov_head_z: 0.0,
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === 'pov_head_x' || name === 'pov_head_y' || name === 'pov_head_z') {
      const numValue = value === '' ? 0 : parseFloat(value);
      setCurrentCharacter((prev) => ({ ...prev, [name]: isNaN(numValue) ? 0 : numValue }));
    } else {
      setCurrentCharacter((prev) => ({ ...prev, [name]: value }));
    }

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
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
        if (character.id == null) {
          const savedCharacter = await createCharacter(storyId, {
            name: character.name,
            bio: character.bio,
            personality: character.personality,
            love_interest: (character.love_interest || '').trim(),
          });
          savedCharacters.push({
            ...savedCharacter,
            pov_head_x: character.pov_head_x,
            pov_head_y: character.pov_head_y,
            pov_head_z: character.pov_head_z,
          });
        } else {
          savedCharacters.push({
            ...character,
            pov_head_x: character.pov_head_x,
            pov_head_y: character.pov_head_y,
            pov_head_z: character.pov_head_z,
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

        <details className="characters-step__pov">
          <summary>3D head position (optional)</summary>
          <p className="characters-step__povHint">
            Camera targets use these coordinates. Default height is 1.6m (Y).
          </p>
          <div className="characters-step__coords">
            {(['x', 'y', 'z'] as const).map((axis, i) => {
              const field = `pov_head_${axis}` as 'pov_head_x' | 'pov_head_y' | 'pov_head_z';
              const defaults = [0, 1.6, 0];
              return (
                <div key={axis} className="characters-step__coord">
                  <label htmlFor={field}>{axis.toUpperCase()}</label>
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    id={field}
                    name={field}
                    value={currentCharacter[field] ?? defaults[i]}
                    onChange={handleInputChange}
                    step="0.1"
                  />
                </div>
              );
            })}
          </div>
        </details>

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
      </section>

      {characters.length > 0 && (
        <section className="characters-step__section" aria-labelledby="characters-list-title">
          <h3 className="characters-step__sectionTitle" id="characters-list-title">
            Added ({characters.length})
          </h3>
          <div className="characters-step__grid">
            {characters.map((character, index) => (
              <CharacterCard
                key={index}
                className="characters-step__card"
                character={{
                  id: index,
                  name: character.name,
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
