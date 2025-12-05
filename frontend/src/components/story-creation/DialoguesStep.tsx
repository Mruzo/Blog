import React, { useState } from 'react';
import { StoryCreationData } from '../StoryCreationWizard';
import SmallButton from '../SmallButton';
import { useApi } from '../../contexts/ApiContext';
import SimpleRichTextEditor from '../SimpleRichTextEditor';

interface DialoguesStepProps {
  data: StoryCreationData;
  onDataUpdate: (data: Partial<StoryCreationData>) => void;
  onNext: () => void;
  onPrevious: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

interface Dialogue {
  id?: number;
  character: number; // Character ID (who is speaking)
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

const DialoguesStep: React.FC<DialoguesStepProps> = ({
  data,
  onDataUpdate,
  onNext,
  onPrevious,
  isFirstStep,
  isLastStep
}) => {
  const { createDialogue } = useApi();
  const [dialogues, setDialogues] = useState<Dialogue[]>(
    data.dialogues.map(d => ({
      ...d,
      character: d.character || 0
    }))
  );
  const [currentDialogue, setCurrentDialogue] = useState<Dialogue>({
    character: (data.characters.length > 0 && data.characters[0].id !== undefined) ? data.characters[0].id as number : 0, // Use first character's ID as default
    text: '',
    order: dialogues.length + 1,
    scene_title: '',
    scene_description: '',
    shot_type: 'mediumShot',
    camera_orbit: '0deg 75deg 3m',
    camera_target: '0m 1.6m 0m',
    field_of_view: 45.0,
    zoom_speed: 1.0,
    rotation: '0deg 0deg 0deg'
  });
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'character') {
      const character = parseInt(value);
      setCurrentDialogue(prev => ({
        ...prev,
        character: character
      }));
    } else if (name === 'field_of_view' || name === 'zoom_speed') {
      setCurrentDialogue(prev => ({ ...prev, [name]: parseFloat(value) }));
    } else {
      setCurrentDialogue(prev => ({ ...prev, [name]: value }));
    }
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
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
    
    if (Object.keys(newErrors).length === 0) {
      if (editingIndex !== null) {
        // Update existing dialogue
        const updatedDialogues = [...dialogues];
        updatedDialogues[editingIndex] = currentDialogue;
        setDialogues(updatedDialogues);
        onDataUpdate({ dialogues: updatedDialogues });
        setEditingIndex(null);
      } else {
        // Add new dialogue
        const updatedDialogues = [...dialogues, currentDialogue];
        setDialogues(updatedDialogues);
        onDataUpdate({ dialogues: updatedDialogues });
      }
      
      setCurrentDialogue({
        character: (data.characters.length > 0 && data.characters[0].id !== undefined) ? data.characters[0].id as number : 0, // Use first character's ID as default
        text: '',
        order: dialogues.length + 1,
        scene_title: '',
        scene_description: '',
        shot_type: 'mediumShot',
        camera_orbit: '0deg 75deg 3m',
        camera_target: '0m 1.6m 0m',
        field_of_view: 45.0,
        zoom_speed: 1.0,
        rotation: '0deg 0deg 0deg'
      });
      setErrors({});
    } else {
      setErrors(newErrors);
    }
  };

  const handleEditDialogue = (index: number) => {
    setCurrentDialogue(dialogues[index]);
    setEditingIndex(index);
  };

  const handleDeleteDialogue = (index: number) => {
    setDialogues(prev => prev.filter((_, i) => i !== index));
  };

  const handleReorder = (fromIndex: number, toIndex: number) => {
    const newDialogues = [...dialogues];
    const [movedDialogue] = newDialogues.splice(fromIndex, 1);
    newDialogues.splice(toIndex, 0, movedDialogue);
    
    // Update order numbers
    const updatedDialogues = newDialogues.map((dialogue, index) => ({
      ...dialogue,
      order: index + 1
    }));
    
    setDialogues(updatedDialogues);
  };

  const handleNext = async () => {
    if (dialogues.length === 0) {
      setErrors({ general: 'Please add at least one dialogue' });
      return;
    }

    setIsSaving(true);
    try {
      // Ensure we have an episode ID
      if (!data.episode.id) {
        setErrors({ general: 'Episode not found. Please go back and complete the episode setup.' });
        return;
      }

      // Save all dialogues to the database
      const savedDialogues = [];
      for (const dialogue of dialogues) {
        if (!dialogue.id || typeof dialogue.id === 'string') {
          // Skip dialogues with invalid character (0 or null)
          if (!dialogue.character || dialogue.character === 0) {
            console.warn('Skipping dialogue with invalid character:', dialogue);
            continue;
          }
          
          // This is a new dialogue, save it to database
          const savedDialogue = await createDialogue(data.episode.id, {
            character: dialogue.character,
            text: dialogue.text,
            order: dialogue.order,
            scene_title: dialogue.scene_title,
            scene_description: dialogue.scene_description,
            shot_type: dialogue.shot_type,
            camera_orbit: dialogue.camera_orbit,
            camera_target: dialogue.camera_target,
            field_of_view: dialogue.field_of_view,
            zoom_speed: dialogue.zoom_speed,
            rotation: dialogue.rotation,
          });
          savedDialogues.push(savedDialogue);
        } else {
          // Dialogue already exists in database
          savedDialogues.push(dialogue);
        }
      }

      // Update the parent data with saved dialogues
      onDataUpdate({ dialogues: savedDialogues });
      onNext();
    } catch (error) {
      console.error('Error saving dialogues:', error);
      setErrors({ general: 'Failed to save dialogues. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <div className="row">
        <div className="col-12">
          <h4 className="subtext-btn mb-4">Dialogues</h4>
          <p className="subtext-btn-sm text-muted mb-4">
            Add dialogues for Episode {data.episode.episode_number}: "{data.episode.title}".
            Set camera angles, and dialogue order for each speaking part.
          </p>
        </div>
      </div>

      {errors.general && (
        <div className="alert alert-danger">
          <i className="fas fa-exclamation-triangle me-2"></i>
          {errors.general}
        </div>
      )}

      {/* Dialogue Form */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-header bg-light">
          <h6 className="subtext-btn-sm mb-0">
            {editingIndex !== null ? 'Edit Dialogue' : 'Add New Dialogue'}
          </h6>
        </div>
        <div className="card-body px-1">
          <div className="row">
            {/* Left Column: Order and Character */}
            <div className="col-md-2">
              <div className="mb-3">
                <label htmlFor="order" className="form-label subtext-btn-sm">
                  Order <span className="text-danger">*</span>
                </label>
                <input
                  type="number"
                  className={`form-control ${errors.order ? 'is-invalid' : ''}`}
                  id="order"
                  name="order"
                  min="1"
                  value={currentDialogue.order}
                  onChange={handleInputChange}
                />
                {errors.order && <div className="invalid-feedback">{errors.order}</div>}
              </div>

              <div className="mb-3">
                <label htmlFor="character" className="form-label subtext-btn-sm">
                  Character <span className="text-danger">*</span>
                </label>
                <select
                  className={`form-select ${errors.character ? 'is-invalid' : ''} font-quicksand`}
                  id="character"
                  name="character"
                  value={currentDialogue.character || ''}
                  onChange={handleInputChange}
                >
                  <option value="">Select character</option>
                  {data.characters.map((character) => (
                    <option key={character.id} value={character.id}>{character.name}</option>
                  ))}
                </select>
                {errors.character && <div className="invalid-feedback">{errors.character}</div>}
              </div>
            </div>

            {/* Right Column: Dialogue Text */}
            <div className="col-md-10">
              <div className="mb-3">
                <label htmlFor="text" className="form-label subtext-btn-sm">
                  Dialogue Text <span className="text-danger">*</span>
                </label>
                <SimpleRichTextEditor
                  value={currentDialogue.text}
                  onChange={(content) => {
                    setCurrentDialogue(prev => ({ ...prev, text: content }));
                    if (errors.text) {
                      setErrors(prev => ({ ...prev, text: '' }));
                    }
                  }}
                  maxLength={500}
                  placeholder="Enter the dialogue text..."
                  className={errors.text ? 'is-invalid' : ''}
                  rows={3}
                />
                {errors.text && <div className="invalid-feedback">{errors.text}</div>}
              </div>
            </div>
          </div>

          {/* Scene Information */}
          {/* <div className="row">
            <div className="col-md-6">
              <div className="mb-3">
                <label htmlFor="scene_title" className="form-label subtext-btn-sm">
                  Scene Title
                </label>
                <FormFieldWithLimit value={currentDialogue.scene_title} maxLength={100}>
                  <input
                    type="text"
                    className="form-control"
                    id="scene_title"
                    name="scene_title"
                    value={currentDialogue.scene_title}
                    onChange={handleInputChange}
                    placeholder="Optional scene title"
                  />
                </FormFieldWithLimit>
              </div>
            </div>
            <div className="col-md-6">
              <div className="mb-3">
                <label htmlFor="shot_type" className="form-label subtext-btn-sm">
                  Shot Type
                </label>
                <select
                  className="form-select"
                  id="shot_type"
                  name="shot_type"
                  value={currentDialogue.shot_type}
                  onChange={handleInputChange}
                >
                  <option value="closeUp">Close Up</option>
                  <option value="mediumShot">Medium Shot</option>
                  <option value="wideShot">Wide Shot</option>
                  <option value="heroShot">Hero Shot (Low Angle)</option>
                  <option value="vulnerableShot">Vulnerable Shot (High Angle)</option>
                  <option value="overShoulder">Over the Shoulder</option>
                  <option value="confrontation">Confrontation Shot</option>
                </select>
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col-12">
              <div className="mb-3">
                <label htmlFor="scene_description" className="form-label subtext-btn-sm">
                  Scene Description
                </label>
                <FormFieldWithLimit value={currentDialogue.scene_description} maxLength={250}>
                  <textarea
                    className="form-control"
                    id="scene_description"
                    name="scene_description"
                    rows={2}
                    value={currentDialogue.scene_description}
                    onChange={handleInputChange}
                    placeholder="Optional scene description"
                  />
                </FormFieldWithLimit>
              </div>
            </div>
          </div> */}

          {/* Camera Settings */}
          <div className="card bg-light mb-3">
            <div className="card-header">
              <h6 className="subtext-btn-sm mb-0">
                <i className="fas fa-camera me-2"></i>
                Camera Settings
              </h6>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-6">
                  <div className="mb-3">
                    <label htmlFor="camera_orbit" className="form-label subtext-btn-sm">
                      Camera Orbit <span className="text-muted">(e.g., "0deg 75deg 3m")</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      id="camera_orbit"
                      name="camera_orbit"
                      value={currentDialogue.camera_orbit}
                      onChange={handleInputChange}
                      placeholder="0deg 75deg 3m"
                    />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="mb-3">
                    <label htmlFor="camera_target" className="form-label subtext-btn-sm">
                      Camera Target <span className="text-muted">(e.g., "0m 1.6m 0m")</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      id="camera_target"
                      name="camera_target"
                      value={currentDialogue.camera_target}
                      onChange={handleInputChange}
                      placeholder="0m 1.6m 0m"
                    />
                  </div>
                </div>
              </div>

              <div className="row">
                <div className="col-md-4">
                  <div className="mb-3">
                    <label htmlFor="field_of_view" className="form-label subtext-btn-sm">
                      Field of View <span className="text-muted">(degrees)</span>
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      id="field_of_view"
                      name="field_of_view"
                      step="0.1"
                      min="0"
                      max="180"
                      value={currentDialogue.field_of_view}
                      onChange={handleInputChange}
                      placeholder="45.0"
                    />
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="mb-3">
                    <label htmlFor="zoom_speed" className="form-label subtext-btn-sm">
                      Zoom Speed
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      id="zoom_speed"
                      name="zoom_speed"
                      step="0.1"
                      min="0"
                      value={currentDialogue.zoom_speed}
                      onChange={handleInputChange}
                      placeholder="1.0"
                    />
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="mb-3">
                    <label htmlFor="rotation" className="form-label subtext-btn-sm">
                      Rotation <span className="text-muted">(e.g., "0deg 0deg 0deg")</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      id="rotation"
                      name="rotation"
                      value={currentDialogue.rotation}
                      onChange={handleInputChange}
                      placeholder="0deg 0deg 0deg"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="d-flex gap-2">
            <SmallButton
              variant="primary"
              onClick={handleAddDialogue}
            >
              <i className="fas fa-plus me-1"></i>
              {editingIndex !== null ? 'Update Dialogue' : 'Add Dialogue'}
            </SmallButton>
            
            {editingIndex !== null && (
              <SmallButton
                variant="outline-secondary"
                onClick={() => {
                  setCurrentDialogue({
                    character: (data.characters.length > 0 && data.characters[0].id !== undefined) ? data.characters[0].id as number : 0, // Use first character's ID as default
                    text: '',
                    order: dialogues.length + 1,
                    scene_title: '',
                    scene_description: '',
                    shot_type: 'mediumShot',
                    camera_orbit: '0deg 75deg 3m',
                    camera_target: '0m 1.6m 0m',
                    field_of_view: 45.0,
                    zoom_speed: 1.0,
                    rotation: '0deg 0deg 0deg'
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

      {/* Dialogues List */}
      {dialogues.length > 0 && (
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-light">
            <h6 className="subtext-btn-sm mb-0">
              Dialogues ({dialogues.length})
            </h6>
          </div>
          <div className="card-body">
            {dialogues
              .sort((a, b) => a.order - b.order)
              .map((dialogue, index) => (
                <div key={index} className="card border mb-3">
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div className="d-flex align-items-center">
                        <span className="badge bg-primary me-2">#{dialogue.order}</span>
                        <h6 className="subtext-btn-sm mb-0">
                          {data.characters.find(char => char.id === dialogue.character)?.name || `Character ${dialogue.character}`}
                        </h6>
                        {dialogue.scene_title && (
                          <span className="badge bg-secondary ms-2">{dialogue.scene_title}</span>
                        )}
                        <span className="badge bg-info ms-2">{dialogue.shot_type}</span>
                      </div>
                      <div className="d-flex gap-1">
                        <SmallButton
                          variant="outline-primary"
                          onClick={() => handleEditDialogue(index)}
                        >
                          <i className="fas fa-edit"></i>
                        </SmallButton>
                        <SmallButton
                          variant="outline-danger"
                          onClick={() => handleDeleteDialogue(index)}
                        >
                          <i className="fas fa-trash"></i>
                        </SmallButton>
                      </div>
                    </div>
                    <p className="subtext-btn-sm mb-2">{dialogue.text}</p>
                    {dialogue.scene_description && (
                      <p className="subtext-btn-sm text-muted mb-2">
                        <i className="fas fa-info-circle me-1"></i>
                        {dialogue.scene_description}
                      </p>
                    )}
                    <div className="row">
                      <div className="col-md-6">
                        <small className="text-muted">
                          <i className="fas fa-camera me-1"></i>
                          <strong>Orbit:</strong> {dialogue.camera_orbit} | 
                          <strong> Target:</strong> {dialogue.camera_target}
                        </small>
                      </div>
                      <div className="col-md-6">
                        <small className="text-muted">
                          <strong>FOV:</strong> {dialogue.field_of_view}° | 
                          <strong> Zoom:</strong> {dialogue.zoom_speed} | 
                          <strong> Rot:</strong> {dialogue.rotation}
                        </small>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      <div className="row mt-4">
        <div className="col-12">
          <div className="alert alert-info">
            <i className="fas fa-info-circle me-2"></i>
            <strong>Tip:</strong> Good dialogue drives the story forward and reveals character. 
            <br />Camera settings dictate the camera angle and movement for each dialogue.
          </div>
        </div>
      </div>
    </div>
  );
};

export default DialoguesStep;
