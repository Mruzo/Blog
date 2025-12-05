import React, { useState } from 'react';
import { StoryCreationData } from '../StoryCreationWizard';
import SmallButton from '../SmallButton';
import CharacterCard from '../CharacterCard';
import MessagePopup from '../MessagePopup';
import FormFieldWithLimit from '../FormFieldWithLimit';
import { useApi } from '../../contexts/ApiContext';

interface CharactersStepProps {
  data: StoryCreationData;
  onDataUpdate: (data: Partial<StoryCreationData>) => void;
  onNext: () => void;
  onPrevious: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
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

const CharactersStep: React.FC<CharactersStepProps> = ({
  data,
  onDataUpdate,
  onNext,
  onPrevious,
  isFirstStep,
  isLastStep
}) => {
  const { createStory, createSeason, createCharacter } = useApi();
  const [characters, setCharacters] = useState<Character[]>(data.characters);
  const [currentCharacter, setCurrentCharacter] = useState<Character>({
    name: '',
    bio: '',
    personality: '',
    love_interest: '',
    pov_head_x: 0.0,
    pov_head_y: 1.6,
    pov_head_z: 0.0
  });
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'success' | 'danger' | 'warning' | 'info'>('success');
  const [showMessage, setShowMessage] = useState(false);

  const handleCloseMessage = () => {
    setShowMessage(false);
  };

  // Override the onNext prop to call our custom handleNext
  const customOnNext = async () => {
    await handleNext();
  };

  // Override the onNext prop passed from the wizard
  onNext = customOnNext;

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
    'Other'
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Handle numeric fields for POV head positions
    if (name === 'pov_head_x' || name === 'pov_head_y' || name === 'pov_head_z') {
      const numValue = value === '' ? 0 : parseFloat(value);
      setCurrentCharacter(prev => ({ ...prev, [name]: isNaN(numValue) ? 0 : numValue }));
    } else {
      setCurrentCharacter(prev => ({ ...prev, [name]: value }));
    }
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
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
    
    if (!character.love_interest.trim()) {
      newErrors.love_interest = 'Character love interest is required';
    }
    
    return newErrors;
  };

  const handleAddCharacter = async () => {
    const newErrors = validateCharacter(currentCharacter);
    
    if (Object.keys(newErrors).length === 0) {
      try {
        if (editingIndex !== null) {
          // Update existing character
          const updatedCharacters = [...characters];
          updatedCharacters[editingIndex] = currentCharacter;
          setCharacters(updatedCharacters);
          // Update the parent data
          onDataUpdate({ characters: updatedCharacters });
          setEditingIndex(null);
        } else {
          // Add new character to local state
          const newCharacter = { ...currentCharacter, id: Date.now() }; // Temporary ID
          const updatedCharacters = [...characters, newCharacter];
          setCharacters(updatedCharacters);
          // Update the parent data
          onDataUpdate({ characters: updatedCharacters });
        }
        
              setCurrentCharacter({
                name: '',
                bio: '',
                personality: '',
                love_interest: '',
                pov_head_x: 0.0,
                pov_head_y: 1.6,
                pov_head_z: 0.0
              });
        setErrors({});
      } catch (error) {
        console.error('Error saving character:', error);
        setErrors({ general: 'Failed to save character. Please try again.' });
      } finally {
        // Character saved
      }
    } else {
      setErrors(newErrors);
    }
  };

  const handleEditCharacter = (index: number) => {
    setCurrentCharacter(characters[index]);
    setEditingIndex(index);
  };

  const handleDeleteCharacter = (index: number) => {
    const updatedCharacters = characters.filter((_, i) => i !== index);
    setCharacters(updatedCharacters);
    // Update the parent data
    onDataUpdate({ characters: updatedCharacters });
  };

  const handleNext = async () => {
    if (characters.length === 0) {
      setErrors({ general: 'Please add at least one character' });
      return;
    }
    
    try {
      // First, create the story if it doesn't exist yet
      let storyId = data.story.id;
      if (!storyId) {
        // Validate that we have at least a story title
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

      // Create the season if it doesn't exist yet
      let seasonId = data.season.id;
      if (!seasonId) {
        const season = await createSeason(storyId, {
          title: data.season.title,
          season_number: data.season.season_number,
          description: data.season.description,
          release_date: data.season.release_date,
        });
        seasonId = season.id;
        onDataUpdate({ season: { ...data.season, id: seasonId } });
      }

      // Create all characters in the database
      const savedCharacters = [];
      for (const character of characters) {
        if (!character.id || typeof character.id === 'string') {
          // This is a new character, save it to database
          const savedCharacter = await createCharacter(storyId, {
            name: character.name,
            bio: character.bio,
            personality: character.personality,
            love_interest: character.love_interest,
          });
          // Preserve POV data for the complete story creation
          const characterWithPOV = {
            ...savedCharacter,
            pov_head_x: character.pov_head_x,
            pov_head_y: character.pov_head_y,
            pov_head_z: character.pov_head_z
          };
          savedCharacters.push(characterWithPOV);
        } else {
          // Character already exists in database, preserve POV data
          const characterWithPOV = {
            ...character,
            pov_head_x: character.pov_head_x,
            pov_head_y: character.pov_head_y,
            pov_head_z: character.pov_head_z
          };
          savedCharacters.push(characterWithPOV);
        }
      }

      // Update the parent data with saved characters
      onDataUpdate({ characters: savedCharacters });
      onNext();
    } catch (error) {
      console.error('Error saving story data:', error);
      setErrors({ general: 'Failed to save story data. Please try again.' });
    } finally {
      // Saving completed
    }
  };

  return (
    <div>
      <MessagePopup
        message={message}
        type={messageType}
        show={showMessage}
        onClose={handleCloseMessage}
      />
      {/* <div className="row">
        <div className="col-12">
          <h4 className="subtext-btn mb-2">Characters</h4>
          <p className="subtext-btn-sm text-muted mb-2">
            Add, edit, and remove characters as needed.
          </p>
        </div>
      </div> */}

      {errors.general && (
        <div className="alert alert-danger">
          <i className="fas fa-exclamation-triangle me-2"></i>
          {errors.general}
        </div>
      )}

      {/* Character Form */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-header bg-light p-1">
          <h4 className="subtext-btn mb-0">
            {editingIndex !== null ? 'Edit Character' : 'New Character'}
          </h4>
        </div>
        <div className="card-body pt-2 px-0">
        <p className="subtext-btn-sm text-muted mb-2">
            Add, edit, and remove characters as needed.
          </p>
          <div className="row">
            <div className="col-md-6">
              <div className="mb-3">
                <label htmlFor="name" className="form-label subtext-btn-sm">
                  Character Name <span className="text-danger">*</span>
                </label>
                <FormFieldWithLimit value={currentCharacter.name} maxLength={50}>
                  <input
                    type="text"
                    className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                    id="name"
                    name="name"
                    value={currentCharacter.name}
                    onChange={handleInputChange}
                    placeholder="Enter character name"
                  />
                </FormFieldWithLimit>
                {errors.name && <div className="invalid-feedback">{errors.name}</div>}
              </div>

              
            </div>

            <div className="col-md-6">
            <div className="mb-3">
                <label htmlFor="bio" className="form-label subtext-btn-sm">
                  Character Bio <span className="text-danger">*</span>
                </label>
                <FormFieldWithLimit value={currentCharacter.bio} maxLength={500}>
                  <textarea
                    className={`form-control ${errors.bio ? 'is-invalid' : ''}`}
                    id="bio"
                    name="bio"
                    rows={4}
                    value={currentCharacter.bio}
                    onChange={handleInputChange}
                    placeholder="Describe the character's personality, background, motivations, etc."
                  />
                </FormFieldWithLimit>
                {errors.bio && <div className="invalid-feedback">{errors.bio}</div>}
              </div>
            
              {/* <div className="mb-3">
                <label htmlFor="love_interest" className="form-label subtext-btn-sm">
                  Love Interest <span className="text-danger">*</span>
                </label>
                <FormFieldWithLimit value={currentCharacter.love_interest} maxLength={50}>
                  <textarea
                    className={`form-control ${errors.love_interest ? 'is-invalid' : ''}`}
                    id="love_interest"
                    name="love_interest"
                    rows={3}
                    value={currentCharacter.love_interest}
                    onChange={handleInputChange}
                    placeholder="Describe love interest, relationships, etc."
                  />
                </FormFieldWithLimit>
                {errors.love_interest && <div className="invalid-feedback">{errors.love_interest}</div>}
              </div> */}
            </div>
          </div>

          <div className="row">
            <div className="col-12">
            <div className="mb-3">
                <label htmlFor="personality" className="form-label subtext-btn-sm">
                  Personality <span className="text-danger">*</span>
                </label>
                <select
                  className={`form-select ${errors.personality ? 'is-invalid' : ''} font-quicksand`}
                  id="personality"
                  name="personality"
                  value={currentCharacter.personality}
                  onChange={handleInputChange}
                >
                  <option value="">Select personality</option>
                  {personalities.map(personality => (
                    <option key={personality} value={personality}>{personality}</option>
                  ))}
                </select>
                {errors.personality && <div className="invalid-feedback">{errors.personality}</div>}
              </div>
            </div>
          </div>

          {/* POV Head Position Fields */}
          <div className="row">
            <div className="col-12">
              <div className="mb-3">
                <label className="form-label subtext-btn-sm">
                  <i className="fas fa-cube me-1"></i> Character Location (Can be set later)
                </label>
                <p className="subtext-btn-sm text-muted mb-2" style={{ fontSize: '0.75rem' }}>
                  Set the character's head position in 3D space. These coordinates determine the camera targets.
                </p>
              </div>
            </div>
          </div>
          
          <div className="row">
            <div className="col-4">
              <div className="mb-2">
                <div className="d-flex align-items-center gap-2">
                  <label htmlFor="pov_head_x" className="form-label subtext-btn-sm mb-0" style={{ minWidth: '20px' }}>
                    X:
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    id="pov_head_x"
                    name="pov_head_x"
                    value={currentCharacter.pov_head_x ?? 0.0}
                    onChange={handleInputChange}
                    step="0.1"
                    placeholder="0.0"
                  />
                </div>
              </div>
            </div>
            <div className="col-4">
              <div className="mb-2">
                <div className="d-flex align-items-center gap-2">
                  <label htmlFor="pov_head_y" className="form-label subtext-btn-sm mb-0" style={{ minWidth: '20px' }}>
                    Y:
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    id="pov_head_y"
                    name="pov_head_y"
                    value={currentCharacter.pov_head_y ?? 1.6}
                    onChange={handleInputChange}
                    step="0.1"
                    placeholder="1.6"
                  />
                </div>
              </div>
            </div>
            <div className="col-4">
              <div className="mb-2">
                <div className="d-flex align-items-center gap-2">
                  <label htmlFor="pov_head_z" className="form-label subtext-btn-sm mb-0" style={{ minWidth: '20px' }}>
                    Z:
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    id="pov_head_z"
                    name="pov_head_z"
                    value={currentCharacter.pov_head_z ?? 0.0}
                    onChange={handleInputChange}
                    step="0.1"
                    placeholder="0.0"
                  />
                </div>
              </div>
            </div>
          </div>
          
          {/* Help text row below */}
          <div className="row">
            <div className="col-12 mb-2">
              <strong className="form-text text-muted m-0 font-quicksand" style={{ fontSize: '0.7rem' }}>3D Coordinates (default height: 1.6m)</strong>
            </div>
            
          </div>

          <div className="d-flex gap-2">
            <SmallButton
              variant="primary"
              onClick={handleAddCharacter}
            >
              <i className="fas fa-plus me-1"></i>
              {editingIndex !== null ? 'Update Character' : 'Add Character'}
            </SmallButton>
            
            {editingIndex !== null && (
              <SmallButton
                variant="outline-secondary"
                onClick={() => {
              setCurrentCharacter({
                name: '',
                bio: '',
                personality: '',
                love_interest: '',
                pov_head_x: 0.0,
                pov_head_y: 1.6,
                pov_head_z: 0.0
              });
                  setEditingIndex(null);
                  setErrors({});
                }}
              >
                <i className="fas fa-times me-1"></i>Cancel
              </SmallButton>
            )}
          </div>
        </div>
      </div>

      {/* Characters List */}
      {characters.length > 0 && (
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-light">
            <h6 className="subtext-btn-sm mb-0">
              Characters ({characters.length})
            </h6>
          </div>
          <div className="card-body">
            <div className="row">
              {characters.map((character, index) => (
                <div key={index} className="col-md-6 col-lg-4 mb-3">
                  <CharacterCard
                    character={{
                      id: index,
                      name: character.name,
                      bio: character.bio,
                      personality: character.personality,
                      love_interest: character.love_interest,
                      user: 0,
                      created_at: new Date().toISOString(),
                      updated_at: new Date().toISOString()
                    }}
                    onEdit={(character) => handleEditCharacter(index)}
                    onDelete={() => handleDeleteCharacter(index)}
                    showActions={true}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* <div className="row mt-4">
        <div className="col-12">
          <div className="alert alert-info">
            <i className="fas fa-info-circle me-2"></i>
            <strong>Tip:</strong> Well-developed characters are essential for engaging stories. 
            Think about their motivations, flaws, and how they'll grow throughout your story.
          </div>
        </div>
      </div> */}
    </div>
  );
};

export default CharactersStep;
