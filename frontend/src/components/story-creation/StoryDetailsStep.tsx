import React, { useState, useEffect } from 'react';
import { StoryCreationData } from '../StoryCreationWizard';

interface StoryDetailsStepProps {
  data: StoryCreationData;
  onDataUpdate: (data: Partial<StoryCreationData>) => void;
  onNext: () => void;
  onPrevious: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

const StoryDetailsStep: React.FC<StoryDetailsStepProps> = ({
  data,
  onDataUpdate,
  onNext,
  onPrevious,
  isFirstStep,
  isLastStep
}) => {
  const [formData, setFormData] = useState(data.story);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Sync formData with parent data when it changes
  useEffect(() => {
    setFormData(data.story);
  }, [data.story]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const updatedFormData = { ...formData, [name]: value };
    setFormData(updatedFormData);
    
    // Update parent component with the new data
    onDataUpdate({ story: updatedFormData });
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Story title is required';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Story description is required';
    }
    
    // is_public is optional, no validation needed
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };


  const genres = [
    'Action',
    'Adventure',
    'Comedy',
    'Drama',
    'Fantasy',
    'Horror',
    'Mystery',
    'Romance',
    'Sci-Fi',
    'Thriller',
    'Other'
  ];

  const audiences = [
    'Children (5-12)',
    'Teens (13-17)',
    'Young Adults (18-25)',
    'Adults (26-40)',
    'Mature (40+)',
    'All Ages'
  ];

  return (
    <div>
      <div className="row">
        <div className="col-12">
          <h4 className="subtext-btn mb-4">Story Information</h4>
        </div>
      </div>

      <div className="row">
        <div className="col-md-6">
          <div className="mb-3">
            <label htmlFor="title" className="form-label subtext-btn-sm">
              Story Title <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              className={`form-control ${errors.title ? 'is-invalid' : ''}`}
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Enter your story title"
            />
            {errors.title && <div className="invalid-feedback">{errors.title}</div>}
          </div>

          <div className="mb-3">
            <div className="form-check">
              <input
                className="form-check-input"
                type="checkbox"
                id="is_public"
                name="is_public"
                checked={formData.is_public}
                onChange={(e) => {
                  const updatedFormData = { ...formData, is_public: e.target.checked };
                  setFormData(updatedFormData);
                  onDataUpdate({ story: updatedFormData });
                }}
              />
              <label className="form-check-label subtext-btn-sm" htmlFor="is_public">
                Make this story public
              </label>
            </div>
          </div>
        </div>

        <div className="col-md-6">
        </div>
      </div>

      <div className="row">
        <div className="col-12">
          <div className="mb-3">
            <label htmlFor="description" className="form-label subtext-btn-sm">
              Story Description <span className="text-danger">*</span>
            </label>
            <textarea
              className={`form-control ${errors.description ? 'is-invalid' : ''}`}
              id="description"
              name="description"
              rows={6}
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Detailed description of your story, including plot, themes, and key elements"
            />
            {errors.description && <div className="invalid-feedback">{errors.description}</div>}
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-12">
          <div className="alert alert-info">
            <i className="fas fa-info-circle me-2"></i>
            <strong>Tip:</strong> A compelling title and description will help attract readers to your story. 
            Make sure to clearly define your target audience and genre to help with story categorization.
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoryDetailsStep;
