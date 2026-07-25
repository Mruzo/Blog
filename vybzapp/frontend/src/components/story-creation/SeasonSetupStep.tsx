import React, { useState, useEffect } from 'react';
import { StoryCreationData } from '../StoryCreationWizard';
import FormFieldWithLimit from '../FormFieldWithLimit';

interface SeasonSetupStepProps {
  data: StoryCreationData;
  onDataUpdate: (data: Partial<StoryCreationData>) => void;
  onNext: () => void;
  onPrevious: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

const SeasonSetupStep: React.FC<SeasonSetupStepProps> = ({
  data,
  onDataUpdate,
  onNext,
  onPrevious,
  isFirstStep,
  isLastStep
}) => {
  const [formData, setFormData] = useState(data.season);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Sync formData with parent data when it changes
  useEffect(() => {
    setFormData(data.season);
  }, [data.season]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const updatedFormData = { ...formData, [name]: value };
    setFormData(updatedFormData);
    
    // Update parent component with the new data
    onDataUpdate({ season: updatedFormData });
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Season title is required';
    }
    
    if (formData.season_number < 1) {
      newErrors.season_number = 'Season number must be at least 1';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Season description is required';
    }
    
    if (!formData.release_date) {
      newErrors.release_date = 'Release date is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateForm()) {
      onDataUpdate({ season: formData });
      onNext();
    }
  };

  return (
    <div>
      <div className="mb-3 rounded border bg-light p-3">
        <h5 className="subtext-btn-sm mb-2">
          <i className="fas fa-cube me-2" aria-hidden />
          3D Scene
        </h5>
        <p className="subtext-btn-sm mb-0 text-muted">
          This season uses the shared JustVybz 3D model. Focus on your story, cast, script, and camera framing.
        </p>
      </div>

      <div className="row">
      <div className="col-md-4">
          <div className="mb-2">
            <label htmlFor="release_date" className="form-label subtext-btn-sm">
              Release Date <span className="text-danger"></span>
            </label>
            <input
              type="date"
              className={`form-control ${errors.release_date ? 'is-invalid' : ''}`}
              id="release_date"
              name="release_date"
              value={formData.release_date}
              onChange={handleInputChange}
            />
            {errors.release_date && <div className="invalid-feedback">{errors.release_date}</div>}
          </div>
        </div>
        <div className="col-md-4">
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
                placeholder="e.g., The Beginning, Chapter One, etc."
              />
            </FormFieldWithLimit>
            {errors.title && <div className="invalid-feedback">{errors.title}</div>}
          </div>
        </div>

        <div className="col-md-4">
          <div className="mb-2">
            <label htmlFor="season_number" className="form-label subtext-btn-sm">
              Number <span className="text-danger">*</span>
            </label>
            <input
              type="number"
              className={`form-control ${errors.season_number ? 'is-invalid' : ''}`}
              id="season_number"
              name="season_number"
              min="1"
              value={formData.season_number}
              onChange={handleInputChange}
            />
            {errors.season_number && <div className="invalid-feedback">{errors.season_number}</div>}
          </div>
        </div>
      </div>

      <div className="row">
        
      </div>

      <div className="row">
        <div className="col-12">
          <div className="mb-2">
            <label htmlFor="description" className="form-label subtext-btn-sm">
              Season Description <span className="text-danger"></span>
            </label>
            <FormFieldWithLimit value={formData.description} maxLength={150}>
              <textarea
                className={`form-control ${errors.description ? 'is-invalid' : ''}`}
                id="description"
                name="description"
                rows={2}
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Describe what happens in this season, key events, character development, etc."
              />
            </FormFieldWithLimit>
            {errors.description && <div className="invalid-feedback">{errors.description}</div>}
          </div>
        </div>
      </div>

      {/* <div className="row">
        <div className="col-12">
          <div className="alert alert-info">
            <i className="fas fa-info-circle me-2"></i>
            <strong>Note:</strong> This will be Season 1 of your story. You can create additional seasons 
            after publishing this one. Each season can contain multiple episodes.
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-12">
          <div className="card bg-light">
            <div className="card-body">
              <h6 className="subtext-btn-sm mb-3">
                <i className="fas fa-lightbulb me-2"></i>
                Season Planning Tips
              </h6>
              <ul className="subtext-btn-sm mb-0">
                <li>Think about the overall arc for this season</li>
                <li>Consider how many episodes you want in this season</li>
                <li>Plan the main conflicts and resolutions</li>
                <li>Think about character development throughout the season</li>
              </ul>
            </div>
          </div>
        </div>
      </div> */}
    </div>
  );
};

export default SeasonSetupStep;
