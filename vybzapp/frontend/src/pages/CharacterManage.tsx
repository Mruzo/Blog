import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import BackButton from '../components/BackButton';
import LoadingSpinner from '../components/LoadingSpinner';
import MessagePopup from '../components/MessagePopup';
import CharacterCard from '../components/CharacterCard';
import { useApi } from '../contexts/ApiContext';

interface Character {
  id: number;
  name: string;
  bio: string;
  personality: string;
  love_interest: string;
  user: number;
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
  pov_head_x?: number;
  pov_head_y?: number;
  pov_head_z?: number;
}

const CharacterManage: React.FC = () => {
  const { storyId } = useParams<{ storyId: string }>();
  const { 
    characters, 
    loadCharacters, 
    createCharacter, 
    updateCharacter, 
    deleteCharacter, 
    isLoading
  } = useApi();
  
  const [showForm, setShowForm] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);
  const [formData, setFormData] = useState<CharacterFormData>({
    name: '',
    bio: '',
    personality: '',
    love_interest: '',
    pov_head_x: 0.0,
    pov_head_y: 1.6,
    pov_head_z: 0.0
  });
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'success' | 'danger' | 'warning' | 'info'>('success');
  const [showMessage, setShowMessage] = useState(false);

  // Load characters when component mounts
  useEffect(() => {
    if (storyId) {
      loadCharacters(parseInt(storyId));
    }
  }, [storyId, loadCharacters]);

  // Get all characters for the current user
  const storyCharacters = characters;

  // Personality options
  const personalityOptions = [
    'Brave', 'Shy', 'Confident', 'Mysterious', 'Funny', 'Serious',
    'Optimistic', 'Pessimistic', 'Loyal', 'Independent', 'Other'
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Handle numeric fields for POV head positions
    if (name === 'pov_head_x' || name === 'pov_head_y' || name === 'pov_head_z') {
      const numValue = value === '' ? 0 : parseFloat(value);
      setFormData(prev => ({
        ...prev,
        [name]: isNaN(numValue) ? 0 : numValue
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!storyId) {
      setMessage('Story ID is required');
      setMessageType('danger');
      setShowMessage(true);
      return;
    }

    try {
      if (editingCharacter) {
        await updateCharacter(editingCharacter.id, formData);
        setMessage('Character updated successfully!');
      } else {
        await createCharacter(parseInt(storyId), formData);
        setMessage('Character created successfully!');
      }
      
      setMessageType('success');
      setShowMessage(true);
      resetForm();
      
      // Reload characters
      await loadCharacters(parseInt(storyId));
    } catch (error: any) {
      setMessage(error.message || 'Failed to save character');
      setMessageType('danger');
      setShowMessage(true);
    }
  };

  const handleEdit = (character: Character) => {
    setEditingCharacter(character);
    setFormData({
      name: character.name,
      bio: character.bio,
      personality: character.personality,
      love_interest: character.love_interest,
      pov_head_x: character.pov_data?.head_x ?? 0.0,
      pov_head_y: character.pov_data?.head_y ?? 1.6,
      pov_head_z: character.pov_data?.head_z ?? 0.0
    });
    setShowForm(true);
  };

  const handleDelete = async (characterId: number) => {
    if (window.confirm('Are you sure you want to delete this character?')) {
      try {
        await deleteCharacter(characterId);
        setMessage('Character deleted successfully!');
        setMessageType('success');
        setShowMessage(true);
        
        // Reload characters
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
    setFormData({
      name: '',
      bio: '',
      personality: '',
      love_interest: '',
      pov_head_x: 0.0,
      pov_head_y: 1.6,
      pov_head_z: 0.0
    });
    setEditingCharacter(null);
    setShowForm(false);
  };

  const handleCloseMessage = () => {
    setShowMessage(false);
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
    <div className="product-landing">
      <MessagePopup
        message={message}
        type={messageType}
        show={showMessage}
        onClose={handleCloseMessage}
        duration={4000}
      />

      <section className="product-landing__section product-landing__hero">
        <div className="product-landing__container" style={{ maxWidth: '1200px' }}>
          <div className="d-flex flex-wrap justify-content-between align-items-start gap-3">
            <div style={{ minWidth: 0, flex: '1 1 auto' }}>
              <p className="product-landing__eyebrow">Story</p>
              <h1 className="product-landing__h1 mb-0">Characters</h1>
              <p className="product-landing__lead mb-0 mt-2">
                Create and manage cast, bios, and 3D head positions for camera and dialogue.
              </p>
            </div>
            <div className="episode-manage__heroActions">
              <button type="button" className="stories-landing__btnPrimary" onClick={() => setShowForm(true)}>
                <i className="fas fa-plus me-2" aria-hidden />
                Add character
              </button>
              <BackButton to={`/immersivecomics/story/${storyId}/manage/`} />
            </div>
          </div>
        </div>
      </section>

      <section className="product-landing__section">
        <div className="product-landing__container px-2 px-md-3 pb-4" style={{ maxWidth: '1200px' }}>
      {showForm && (
        <div className="my-studio__panel mb-4">
          <div className="my-studio__panelHead">
            <h2 className="my-studio__panelTitle">
              <i className="fas fa-user-edit" aria-hidden />
              <span className="my-studio__panelTitleText">
                {editingCharacter ? 'Edit character' : 'New character'}
              </span>
            </h2>
            <button type="button" className="product-landing__ctaGhost" onClick={resetForm} aria-label="Close form">
              <i className="fas fa-times" aria-hidden />
            </button>
          </div>
          <div className="my-studio__panelBody">
            <form onSubmit={handleSubmit}>
              <div className="row">
                <div className="col-md-6">
                  <div className="mb-3">
                    <label htmlFor="name" className="form-label subtext-btn-sm">Character Name</label>
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
                    <label htmlFor="personality" className="form-label subtext-btn-sm">Personality</label>
                    <select
                      className="form-select form-select-sm"
                      id="personality"
                      name="personality"
                      value={formData.personality}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Select a personality</option>
                      {personalityOptions.map(personality => (
                        <option key={personality} value={personality}>{personality}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="mb-3">
                    <label htmlFor="love_interest" className="form-label subtext-btn-sm">Love Interest</label>
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
                <label htmlFor="bio" className="form-label subtext-btn-sm">Biography</label>
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
              
              {/* POV Head Position Fields */}
              <div className="mb-3">
                <label className="form-label subtext-btn-sm">
                  <i className="fas fa-cube me-1"></i>3D Head Position (for speech bubbles and camera targeting)
                </label>
                <p className="subtext-btn-sm text-muted mb-2" style={{ fontSize: '0.75rem' }}>
                  Set the character's head position in 3D space. These coordinates determine where speech bubbles point to and where the camera targets.
                </p>
              </div>
              
              <div className="row">
                <div className="col-md-4">
                  <div className="mb-3">
                    <label htmlFor="pov_head_x" className="form-label subtext-btn-sm">
                      Head X Position
                    </label>
                    <input
                      type="number"
                      className="form-control form-control-sm"
                      id="pov_head_x"
                      name="pov_head_x"
                      value={formData.pov_head_x ?? 0.0}
                      onChange={handleInputChange}
                      step="0.1"
                      placeholder="0.0"
                    />
                    <small className="form-text text-muted" style={{ fontSize: '0.7rem' }}>X coordinate in world space</small>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="mb-3">
                    <label htmlFor="pov_head_y" className="form-label subtext-btn-sm">
                      Head Y Position
                    </label>
                    <input
                      type="number"
                      className="form-control form-control-sm"
                      id="pov_head_y"
                      name="pov_head_y"
                      value={formData.pov_head_y ?? 1.6}
                      onChange={handleInputChange}
                      step="0.1"
                      placeholder="1.6"
                    />
                    <small className="form-text text-muted" style={{ fontSize: '0.7rem' }}>Y coordinate (head height, default: 1.6m)</small>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="mb-3">
                    <label htmlFor="pov_head_z" className="form-label subtext-btn-sm">
                      Head Z Position
                    </label>
                    <input
                      type="number"
                      className="form-control form-control-sm"
                      id="pov_head_z"
                      name="pov_head_z"
                      value={formData.pov_head_z ?? 0.0}
                      onChange={handleInputChange}
                      step="0.1"
                      placeholder="0.0"
                    />
                    <small className="form-text text-muted" style={{ fontSize: '0.7rem' }}>Z coordinate in world space</small>
                  </div>
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
            <span className="my-studio__panelTitleText">Cast ({storyCharacters.length})</span>
          </h2>
        </div>
        <div className="my-studio__panelBody">
          {storyCharacters.length === 0 ? (
            <div className="story-manage__inlineEmpty py-3">
              <div className="stories-landing__emptyIcon" aria-hidden>
                <i className="fas fa-users" />
              </div>
              <p className="product-landing__body mb-0" style={{ fontSize: '0.9rem' }}>
                No characters yet. Add your cast to attach dialogues and POV targets.
              </p>
            </div>
          ) : (
            <div className="row g-3">
              {storyCharacters.map((character) => (
                <div key={character.id} className="col-md-6 col-lg-4">
                  <CharacterCard
                    character={character}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    showActions={true}
                  />
                </div>
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
