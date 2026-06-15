import React, { useState, useEffect, useLayoutEffect, useCallback } from 'react';
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
  registerFooterNext?: (fn: (() => Promise<void>) | null) => void;
}

const EpisodeSetupStep: React.FC<EpisodeSetupStepProps> = ({
  data,
  onDataUpdate,
  onNext,
  registerFooterNext,
}) => {
  const { createEpisode, loadEpisodes } = useApi();
  const [formData, setFormData] = useState(data.episode);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setFormData(data.episode);
  }, [data.episode]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const updatedFormData = {
      ...formData,
      [name]: name === 'episode_number' ? parseInt(value, 10) || 1 : value,
    };
    setFormData(updatedFormData);
    onDataUpdate({ episode: updatedFormData });

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = useCallback(() => {
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
  }, [formData.title, formData.episode_number, formData.description]);

  const persistEpisodeAndAdvance = useCallback(async () => {
    if (!validateForm()) {
      return;
    }

    if (data.episode.id) {
      onNext();
      return;
    }

    setIsSaving(true);
    try {
      if (!data.season.id) {
        setErrors({ general: 'Season not found. Please go back and complete the season setup.' });
        return;
      }

      const existingEpisodes = await loadEpisodes(data.season.id);
      if (existingEpisodes.length > 0) {
        const existing = existingEpisodes[0];
        onDataUpdate({
          episode: {
            ...formData,
            id: existing.id,
            title: existing.title,
            episode_number: existing.episode_number,
            description: existing.description,
            summary: existing.summary || formData.summary,
            is_published: existing.is_published ?? formData.is_published,
          },
        });
        onNext();
        return;
      }

      const savedEpisode = await createEpisode(data.season.id, {
        title: formData.title.trim(),
        episode_number: formData.episode_number,
        description: formData.description.trim(),
        summary: formData.summary || '',
        is_published: false,
      });

      onDataUpdate({ episode: { ...formData, id: savedEpisode.id } });
      onNext();
    } catch (error) {
      console.error('Error saving episode:', error);
      setErrors({ general: 'Failed to save episode. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  }, [
    validateForm,
    data.episode.id,
    data.season.id,
    formData,
    loadEpisodes,
    createEpisode,
    onDataUpdate,
    onNext,
  ]);

  useLayoutEffect(() => {
    if (!registerFooterNext) {
      return;
    }
    registerFooterNext(() => persistEpisodeAndAdvance());
    return () => registerFooterNext(null);
  }, [registerFooterNext, persistEpisodeAndAdvance]);

  return (
    <div className="episode-setup-step" data-testid="episode-setup-step">
      {errors.general && (
        <div className="alert alert-danger" role="alert">
          <i className="fas fa-exclamation-triangle me-2" aria-hidden />
          {errors.general}
        </div>
      )}

      <div className="row">
        <div className="col-12">
          <h4 className="subtext-btn mb-2">Create Episode</h4>
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
                disabled={isSaving}
              />
            </FormFieldWithLimit>
            {errors.title && <div className="invalid-feedback d-block">{errors.title}</div>}
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
              disabled={isSaving}
            />
            {errors.episode_number && (
              <div className="invalid-feedback d-block">{errors.episode_number}</div>
            )}
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
                disabled={isSaving}
              />
            </FormFieldWithLimit>
            {errors.description && <div className="invalid-feedback d-block">{errors.description}</div>}
          </div>
        </div>
      </div>

      <div className="row mt-2">
        <div className="col-12">
          <div className="alert alert-info">
            <i className="fas fa-info-circle me-2" aria-hidden />
            <strong>Note:</strong> After creating this episode, you&apos;ll add dialogues in the next step.
            You can create additional episodes later from the story management page.
          </div>
        </div>
      </div>
    </div>
  );
};

export default EpisodeSetupStep;
