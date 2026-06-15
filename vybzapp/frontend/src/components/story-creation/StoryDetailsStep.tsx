import React, { useState, useEffect, useLayoutEffect, useCallback } from 'react';
import { StoryCreationData } from '../StoryCreationWizard';
import FormFieldWithLimit from '../FormFieldWithLimit';

interface StoryDetailsStepProps {
  data: StoryCreationData;
  onDataUpdate: (data: Partial<StoryCreationData>) => void;
  onNext: () => void;
  onPrevious: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
  registerFooterNext?: (fn: (() => Promise<void>) | null) => void;
}

const StoryDetailsStep: React.FC<StoryDetailsStepProps> = ({
  data,
  onDataUpdate,
  onNext,
  onPrevious,
  isFirstStep,
  isLastStep,
  registerFooterNext,
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

  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Story title is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Story description is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData.title, formData.description]);

  const validateAndAdvance = useCallback(async () => {
    if (!validateForm()) {
      return;
    }
    onNext();
  }, [validateForm, onNext]);

  useLayoutEffect(() => {
    if (!registerFooterNext) {
      return;
    }
    registerFooterNext(validateAndAdvance);
    return () => registerFooterNext(null);
  }, [registerFooterNext, validateAndAdvance]);

  return (
    <div data-testid="story-details-step">
      <div className="row">
        <div className="col-md-6">
          <div className="mb-3">
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
                placeholder="Story title"
              />
            </FormFieldWithLimit>
            {errors.title && <div className="invalid-feedback d-block">{errors.title}</div>}
          </div>

          
        </div>

        <div className="col-md-6">
        <div className="mb-2">
            <label htmlFor="description" className="form-label subtext-btn-sm">
              Description <span className="text-danger">*</span>
            </label>
            <FormFieldWithLimit value={formData.description} maxLength={200}>
              <textarea
                className={`form-control ${errors.description ? 'is-invalid' : ''}`}
                id="description"
                name="description"
                rows={6}
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Story plot, theme, and key elements"
              />
            </FormFieldWithLimit>
            {errors.description && <div className="invalid-feedback d-block">{errors.description}</div>}
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-12">
        <div className="mb-2">
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
              <div className="form-text subtext-btn-sm text-muted">
                You can change visibility again on the publish step.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoryDetailsStep;
