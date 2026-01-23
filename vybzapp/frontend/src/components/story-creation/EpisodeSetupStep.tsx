import React, { useState, useEffect } from 'react';
import { StoryCreationData } from '../StoryCreationWizard';
import { useApi } from '../../contexts/ApiContext';
import FormFieldWithLimit from '../FormFieldWithLimit';

interface EpisodeSetupStepProps {
  data: StoryCreationData;
  onDataUpdate: (data: Partial<StoryCreationData>) => void;
  onNext: () => void;
  onPrevious: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

const EpisodeSetupStep: React.FC<EpisodeSetupStepProps> = ({
  data,
  onDataUpdate,
  onNext,
  onPrevious,
  isFirstStep,
  isLastStep
}) => {
  const { createEpisode } = useApi();
  const [formData, setFormData] = useState(data.episode);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Sync formData with parent data when it changes
  useEffect(() => {
    setFormData(data.episode);
  }, [data.episode]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const updatedFormData = { ...formData, [name]: value };
    setFormData(updatedFormData);
    
    // Update parent component with the new data
    onDataUpdate({ episode: updatedFormData });
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Episode title is required';
    }
    
    if (formData.episode_number < 1) {
      newErrors.episode_number = 'Episode number must be at least 1';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Episode description is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSaving(true);
    try {
      // Ensure we have a season ID
      if (!data.season.id) {
        setErrors({ general: 'Season not found. Please go back and complete the season setup.' });
        return;
      }

      // Create the episode in the database
      const savedEpisode = await createEpisode(data.season.id, {
        title: formData.title,
        episode_number: formData.episode_number,
        description: formData.description,
        summary: formData.summary || '',
        is_published: false,
      });

      // Update the parent data with the saved episode
      onDataUpdate({ episode: { ...formData, id: savedEpisode.id } });
      onNext();
    } catch (error) {
      console.error('Error saving episode:', error);
      setErrors({ general: 'Failed to save episode. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <div className="row">
        <div className="col-12">
          <h4 className="subtext-btn mb-2">Create Episode</h4>
          {/* <p className="subtext-btn-sm text-muted mb-4">
            Create the first episode of your story. This will be Episode 1 of Season {data.season.season_number}.
          </p> */}
        </div>
      </div>

      <div className="row">
        <div className="col-md-8">
          <div className="mb-2">
            <label htmlFor="title" className="form-label subtext-btn-sm">
              Title <span className="text-danger">*</span>
            </label>
            <FormFieldWithLimit value={formData.title} maxLength={50}>
            <input
              type="text"
              className={`form-control ${errors.title ? 'is-invalid' : ''}`}
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
                
            />
            </FormFieldWithLimit>
            {errors.title && <div className="invalid-feedback">{errors.title}</div>}
          </div>
        </div>

        <div className="col-md-4">
          <div className="mb-2">
            <label htmlFor="episode_number" className="form-label subtext-btn-sm">
              Episode Number <span className="text-danger">*</span>
            </label>
            <input
              type="number"
              className={`form-control ${errors.episode_number ? 'is-invalid' : ''}`}
              id="episode_number"
              name="episode_number"
              min="1"
              value={formData.episode_number}
              onChange={handleInputChange}
            />
            {errors.episode_number && <div className="invalid-feedback">{errors.episode_number}</div>}
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-12">
          <div className="mb-3">
            <label htmlFor="description" className="form-label subtext-btn-sm">
              Episode Description <span className="text-danger">*</span>
            </label>
            <FormFieldWithLimit value={formData.description} maxLength={150}>
            <textarea
              className={`form-control ${errors.description ? 'is-invalid' : ''}`}
              id="description"
              name="description"
                rows={3}
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Describe what happens in this episode, key events, character interactions, etc."
            />
            </FormFieldWithLimit>
            {errors.description && <div className="invalid-feedback">{errors.description}</div>}
          </div>
        </div>
      </div>

      {/* <div className="row">
        <div className="col-12">
          <div className="card bg-light">
            <div className="card-body">
              <h6 className="subtext-btn-sm mb-3">
                <i className="fas fa-lightbulb me-2"></i>
                Episode Planning Tips
              </h6>
              <ul className="subtext-btn-sm mb-0">
                <li>This is your first episode - make it engaging to hook readers</li>
                <li>Introduce your main characters and setting</li>
                <li>Establish the main conflict or story premise</li>
                <li>Think about how this episode sets up future episodes</li>
                <li>Consider the pacing - not too fast, not too slow</li>
              </ul>
            </div>
          </div>
        </div>
      </div> */}

      <div className="row mt-2">
        <div className="col-12">
          <div className="alert alert-info">
            <i className="fas fa-info-circle me-2"></i>
            <strong>Note:</strong> After creating this episode, you'll add dialogues in the next step. 
            You can create additional episodes later from the story management page.
          </div>
        </div>
      </div>
    </div>
  );
};

export default EpisodeSetupStep;
