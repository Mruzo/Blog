import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import BackButton from '../components/BackButton';
import LoadingSpinner from '../components/LoadingSpinner';
import MessagePopup from '../components/MessagePopup';
import CharacterCard from '../components/CharacterCard';
import { useApi } from '../contexts/ApiContext';
import {
  MAX_CHARACTERS_PER_STORY,
  SCENE_SLOT_PRESETS,
  matchSceneSlotFromCoords,
  type SceneSlotKey,
} from '../utils/sceneSlots';

interface Character {
  id: number;
  name: string;
  bio: string;
  personality: string;
  love_interest: string;
  user: number;
  scene_slot?: string | null;
  created_at: string;
  updated_at: string;
  pov_data?: {
    id: number;
    head_x: number;
    head_y: number;
    head_z: number;
    default_camera_target: string;
    character: number;
  };
}

interface CharacterFormData {
  name: string;
  bio: string;
  personality: string;
  love_interest: string;
  scene_slot: string;
}

const EMPTY_FORM: CharacterFormData = {
  name: '',
  bio: '',
  personality: '',
  love_interest: '',
  scene_slot: '',
};

const CharacterManage: React.FC = () => {
  const { storyId } = useParams<{ storyId: string }>();
  const {
    characters,
    loadCharacters,
    createCharacter,
    updateCharacter,
    deleteCharacter,
    isLoading,
  } = useApi();

  const [showForm, setShowForm] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);
  const [formData, setFormData] = useState<CharacterFormData>(EMPTY_FORM);
  const [isLegacyCustom, setIsLegacyCustom] = useState(false);
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'success' | 'danger' | 'warning' | 'info'>('success');
  const [showMessage, setShowMessage] = useState(false);

  useEffect(() => {
    if (storyId) {
      loadCharacters(parseInt(storyId));
    }
  }, [storyId, loadCharacters]);

  const storyCharacters = characters as Character[];
  const atCastLimit = storyCharacters.length >= MAX_CHARACTERS_PER_STORY;
  const canOpenNewForm = !atCastLimit || Boolean(editingCharacter);

  const personalityOptions = [
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

  const takenSlots = storyCharacters
    .filter((character) => !editingCharacter || character.id !== editingCharacter.id)
    .map((character) => character.scene_slot)
    .filter((slot): slot is string => Boolean(slot));

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSlotSelect = (slot: SceneSlotKey) => {
    setFormData((prev) => ({ ...prev, scene_slot: slot }));
    setIsLegacyCustom(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!storyId) {
      setMessage('Story ID is required');
      setMessageType('danger');
      setShowMessage(true);
      return;
    }

    if (!editingCharacter && atCastLimit) {
      setMessage(`Stories can have at most ${MAX_CHARACTERS_PER_STORY} characters.`);
      setMessageType('danger');
      setShowMessage(true);
      return;
    }

    if (!formData.scene_slot && !isLegacyCustom) {
      setMessage('Select a scene slot (North_SS, South_SS, East_SS, or West_SS).');
      setMessageType('danger');
      setShowMessage(true);
      return;
    }

    try {
      const payload: Partial<Character> & { scene_slot?: string | null } = {
        name: formData.name,
        bio: formData.bio,
        personality: formData.personality,
        love_interest: formData.love_interest,
      };

      if (formData.scene_slot) {
        payload.scene_slot = formData.scene_slot;
      }

      if (editingCharacter) {
        await updateCharacter(editingCharacter.id, payload);
        setMessage('Character updated successfully!');
      } else {
        await createCharacter(parseInt(storyId), payload);
        setMessage('Character created successfully!');
      }

      setMessageType('success');
      setShowMessage(true);
      resetForm();
      await loadCharacters(parseInt(storyId));
    } catch (error: any) {
      setMessage(error.message || 'Failed to save character');
      setMessageType('danger');
      setShowMessage(true);
    }
  };

  const handleEdit = (character: Character) => {
    const matchedSlot =
      (character.scene_slot as SceneSlotKey | null | undefined) ||
      matchSceneSlotFromCoords(
        character.pov_data?.head_x,
        character.pov_data?.head_y,
        character.pov_data?.head_z
      );

    setEditingCharacter(character);
    setFormData({
      name: character.name,
      bio: character.bio,
      personality: character.personality,
      love_interest: character.love_interest,
      scene_slot: matchedSlot || '',
    });
    setIsLegacyCustom(!matchedSlot && Boolean(character.pov_data));
    setShowForm(true);
  };

  const handleDelete = async (characterId: number) => {
    if (window.confirm('Are you sure you want to delete this character?')) {
      try {
        await deleteCharacter(characterId);
        setMessage('Character deleted successfully!');
        setMessageType('success');
        setShowMessage(true);

        if (storyId) {
          await loadCharacters(parseInt(storyId));
        }
      } catch (error: any) {
        setMessage(error.message || 'Failed to delete character');
        setMessageType('danger');
        setShowMessage(true);
      }
    }
  };

  const resetForm = () => {
    setFormData(EMPTY_FORM);
    setEditingCharacter(null);
    setIsLegacyCustom(false);
    setShowForm(false);
  };

  const handleCloseMessage = () => {
    setShowMessage(false);
  };

  const handleAddClick = () => {
    if (atCastLimit) {
      setMessage(
        `This story already has ${storyCharacters.length} characters. You can edit existing ones, but new adds are limited to ${MAX_CHARACTERS_PER_STORY}.`
      );
      setMessageType('warning');
      setShowMessage(true);
      return;
    }
    setShowForm(true);
  };

  if (isLoading) {
    return (
      <div className="product-landing">
        <section className="product-landing__section">
          <div className="product-landing__container store-page__loadingWrap">
            <LoadingSpinner message="Loading characters…" />
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="product-landing character-manage">
      <MessagePopup
        message={message}
        type={messageType}
        show={showMessage}
        onClose={handleCloseMessage}
        duration={4000}
      />

      <section className="product-landing__section product-landing__hero">
        <div className="product-landing__container character-manage__container">
          <div className="d-flex flex-wrap justify-content-between align-items-start gap-3">
            <div style={{ minWidth: 0, flex: '1 1 auto' }}>
              <p className="product-landing__eyebrow">Story</p>
              <h1 className="product-landing__h1 mb-0">Characters</h1>
              <p className="product-landing__lead mb-0 mt-2">
                Assign each cast member to a shared-scene slot (North_SS, South_SS, East_SS, West_SS).
              </p>
            </div>
            <div className="episode-manage__heroActions">
              <button
                type="button"
                className="stories-landing__btnPrimary"
                onClick={handleAddClick}
                disabled={atCastLimit && !showForm}
              >
                <i className="fas fa-plus me-2" aria-hidden />
                Add character
              </button>
              <BackButton to={`/immersivecomics/story/${storyId}/manage/`} />
            </div>
          </div>
        </div>
      </section>

      <section className="product-landing__section">
        <div className="product-landing__container character-manage__container pb-4">
          {showForm && canOpenNewForm && (
            <div className="my-studio__panel mb-4">
              <div className="my-studio__panelHead">
                <h2 className="my-studio__panelTitle">
                  <i className="fas fa-user-edit" aria-hidden />
                  <span className="my-studio__panelTitleText">
                    {editingCharacter ? 'Edit character' : 'New character'}
                  </span>
                </h2>
                <button
                  type="button"
                  className="product-landing__ctaGhost"
                  onClick={resetForm}
                  aria-label="Close form"
                >
                  <i className="fas fa-times" aria-hidden />
                </button>
              </div>
              <div className="my-studio__panelBody">
                <form onSubmit={handleSubmit}>
                  <div className="row">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label htmlFor="name" className="form-label subtext-btn-sm">
                          Character Name
                        </label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          id="name"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                      <div className="mb-3">
                        <label htmlFor="personality" className="form-label subtext-btn-sm">
                          Personality
                        </label>
                        <select
                          className="form-select form-select-sm"
                          id="personality"
                          name="personality"
                          value={formData.personality}
                          onChange={handleInputChange}
                          required
                        >
                          <option value="">Select a personality</option>
                          {personalityOptions.map((personality) => (
                            <option key={personality} value={personality}>
                              {personality}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label htmlFor="love_interest" className="form-label subtext-btn-sm">
                          Love Interest
                        </label>
                        <textarea
                          className="form-control form-control-sm"
                          id="love_interest"
                          name="love_interest"
                          rows={3}
                          value={formData.love_interest}
                          onChange={handleInputChange}
                          placeholder="Describe love interest, relationships, etc..."
                        />
                      </div>
                    </div>
                  </div>
                  <div className="mb-3">
                    <label htmlFor="bio" className="form-label subtext-btn-sm">
                      Biography
                    </label>
                    <textarea
                      className="form-control form-control-sm"
                      id="bio"
                      name="bio"
                      rows={4}
                      value={formData.bio}
                      onChange={handleInputChange}
                      placeholder="Write a detailed biography for this character..."
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label subtext-btn-sm">
                      <i className="fas fa-cube me-1" aria-hidden />
                      Scene slot
                    </label>
                    <p className="subtext-btn-sm text-muted mb-2" style={{ fontSize: '0.75rem' }}>
                      Camera and speech targets use the slot position on the shared 3D scene.
                    </p>
                    {isLegacyCustom && (
                      <p className="characters-step__povHint" role="status">
                        Custom position (legacy). Choose a scene slot to switch to a preset — existing
                        coordinates stay until you do.
                      </p>
                    )}
                    <div className="characters-step__slots" role="radiogroup" aria-label="Scene slot">
                      {SCENE_SLOT_PRESETS.map((preset) => {
                        const taken = takenSlots.includes(preset.key);
                        const selected = formData.scene_slot === preset.key;
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
                  </div>

                  <div className="d-flex justify-content-end gap-2 flex-wrap pt-2">
                    <button type="button" className="product-landing__ctaGhost" onClick={resetForm}>
                      Cancel
                    </button>
                    <button type="submit" className="stories-landing__btnPrimary">
                      {editingCharacter ? 'Update character' : 'Create character'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="my-studio__panel">
            <div className="my-studio__panelHead">
              <h2 className="my-studio__panelTitle">
                <i className="fas fa-users" aria-hidden />
                <span className="my-studio__panelTitleText">
                  Cast ({storyCharacters.length}
                  {storyCharacters.length <= MAX_CHARACTERS_PER_STORY
                    ? `/${MAX_CHARACTERS_PER_STORY}`
                    : ''}
                  )
                </span>
              </h2>
            </div>
            <div className="my-studio__panelBody">
              {storyCharacters.length === 0 ? (
                <div className="story-manage__inlineEmpty py-3">
                  <div className="stories-landing__emptyIcon" aria-hidden>
                    <i className="fas fa-users" />
                  </div>
                  <p className="product-landing__body mb-0" style={{ fontSize: '0.9rem' }}>
                    No characters yet. Add your cast and assign each a scene slot.
                  </p>
                </div>
              ) : (
                <div className="my-studio__storyGrid">
                  {storyCharacters.map((character) => (
                    <CharacterCard
                      key={character.id}
                      className="characters-step__card"
                      character={{
                        ...character,
                        name: character.scene_slot
                          ? `${character.name} · ${character.scene_slot}`
                          : character.name,
                      }}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      showActions={true}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CharacterManage;
