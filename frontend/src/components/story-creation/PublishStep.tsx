import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StoryCreationData } from '../StoryCreationWizard';
import SmallButton from '../SmallButton';
import { apiService } from '../../services/api';
import MessagePopup from '../MessagePopup';
import { useApi } from '../../contexts/ApiContext';

interface PublishStepProps {
  data: StoryCreationData;
  onDataUpdate: (data: Partial<StoryCreationData>) => void;
  onNext: () => void;
  onPrevious: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

const PublishStep: React.FC<PublishStepProps> = ({
  data,
  onDataUpdate,
  onNext,
  onPrevious,
  isFirstStep,
  isLastStep
}) => {
  const navigate = useNavigate();
  const { loadStories } = useApi();
  const [publishData, setPublishData] = useState(data.publish);
  const [isPublishing, setIsPublishing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'success' | 'danger' | 'warning' | 'info'>('success');
  const [showMessage, setShowMessage] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setPublishData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (publishData.is_published && !publishData.publish_date) {
      newErrors.publish_date = 'Please select a publish date';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePublish = async () => {
    if (!validateForm()) {
      return;
    }
    
    setIsPublishing(true);
    try {
      // TODO: Implement actual publishing logic
      console.log('Publishing story:', data);
      
      // Simulate publishing delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      onDataUpdate({ publish: publishData });
      
      // Navigate to story management page
      // This would typically be handled by the parent component
      console.log('Story published successfully!');
    } catch (error) {
      setErrors({ publish: 'Failed to publish story. Please try again.' });
    } finally {
      setIsPublishing(false);
    }
  };

  const handleSaveDraft = async () => {
    setIsPublishing(true);
    try {
      // Validate that we have at least a story title
      if (!data.story.title.trim()) {
        setMessage('Please enter a story title before saving as draft.');
        setMessageType('warning');
        setShowMessage(true);
        setIsPublishing(false);
        return;
      }
      
      // Create story as draft (not published)
      const storyData = {
        ...data.story,
        title: data.story.title.trim(), // Ensure no leading/trailing spaces
        description: data.story.description.trim() || 'No description provided',
        is_public: false // Always save as draft
      };
      
      // Ensure season has a valid release_date and title
      const seasonData = {
        ...data.season,
        title: data.season.title.trim() || `Season 1 of ${storyData.title}`,
        release_date: data.season.release_date || '2024-01-01' // Default date if empty
      };
      
      // Ensure episode has a title
      const episodeData = {
        ...data.episode,
        title: data.episode.title.trim() || `Episode 1 of ${storyData.title}`
      };
      
      console.log('PublishStep: Creating complete story with data:', {
        story: storyData,
        season: seasonData,
        characters: data.characters,
        episode: episodeData,
        dialogues: data.dialogues
      });

      const result = await apiService.createCompleteStory({
        story: storyData,
        season: seasonData,
        characters: data.characters,
        episode: episodeData,
        dialogues: data.dialogues,
        model: data.model.file || undefined
      });
      
      console.log('PublishStep: Story created successfully:', result);
      
      setMessage('Draft saved successfully! You can continue editing later.');
      setMessageType('success');
      setShowMessage(true);
      
      // Refresh the stories list in the global context so MyStudio shows the new story
      await loadStories();
      
      // Don't navigate - stay on the same page
      // The user can continue editing or navigate manually
    } catch (error: any) {
      console.error('Save draft error:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText
      });
      setMessage(error.message || 'Failed to save draft. Please try again.');
      setMessageType('danger');
      setShowMessage(true);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleCloseMessage = () => {
    setShowMessage(false);
  };

  const getStorySummary = () => {
    return {
      title: data.story.title,
      season: data.season.title,
      episode: data.episode.title,
      characters: data.characters.length,
      dialogues: data.dialogues.length,
      hasModel: !!data.model.file_url,
      format: data.model.format
    };
  };

  const summary = getStorySummary();

  return (
    <div>
      <MessagePopup
        message={message}
        type={messageType}
        show={showMessage}
        onClose={handleCloseMessage}
      />
      <div className="row">
        <div className="col-12">
          <h4 className="subtext-btn mb-4">Publish Your Story</h4>
          <p className="subtext-btn-sm text-muted mb-4">
            Review your story and choose whether to publish it now or save it as a draft.
          </p>
        </div>
      </div>

      <div className="row">
        <div className="col-md-8">
          {/* Story Summary */}
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-header bg-light">
              <h6 className="subtext-btn-sm mb-0">Story Summary</h6>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-6">
                  <h6 className="subtext-btn-sm mb-3">Basic Information</h6>
                  <div className="subtext-btn-sm mb-2">
                    <strong>Title:</strong> {summary.title}
                  </div>
                  <div className="subtext-btn-sm mb-2">
                    <strong>Season:</strong> {summary.season}
                  </div>
                  <div className="subtext-btn-sm mb-2">
                    <strong>Episode:</strong> {summary.episode}
                  </div>
                </div>
                <div className="col-md-6">
                  <h6 className="subtext-btn-sm mb-3">Content</h6>
                  <div className="subtext-btn-sm mb-2">
                    <strong>Characters:</strong> {summary.characters}
                  </div>
                  <div className="subtext-btn-sm mb-2">
                    <strong>Dialogues:</strong> {summary.dialogues}
                  </div>
                  <div className="subtext-btn-sm mb-2">
                    <strong>3D Model:</strong> {summary.hasModel ? `Yes (${summary.format.toUpperCase()})` : 'No'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Publishing Options */}
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-light">
              <h6 className="subtext-btn-sm mb-0">Publishing Options</h6>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="is_published"
                    name="is_published"
                    checked={publishData.is_published}
                    onChange={handleInputChange}
                  />
                  <label className="form-check-label subtext-btn-sm" htmlFor="is_published">
                    Publish this story now
                  </label>
                </div>
                <div className="form-text">
                  If checked, your story will be visible to all users immediately.
                </div>
              </div>

              {publishData.is_published && (
                <div className="mb-3">
                  <label htmlFor="publish_date" className="form-label subtext-btn-sm">
                    Publish Date <span className="text-danger">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    className={`form-control ${errors.publish_date ? 'is-invalid' : ''}`}
                    id="publish_date"
                    name="publish_date"
                    value={publishData.publish_date}
                    onChange={handleInputChange}
                  />
                  {errors.publish_date && <div className="invalid-feedback">{errors.publish_date}</div>}
                </div>
              )}

              {errors.publish && (
                <div className="alert alert-danger">
                  <i className="fas fa-exclamation-triangle me-2"></i>
                  {errors.publish}
                </div>
              )}

              {errors.save && (
                <div className="alert alert-danger">
                  <i className="fas fa-exclamation-triangle me-2"></i>
                  {errors.save}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-md-4">
          {/* Action Buttons */}
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-header bg-light">
              <h6 className="subtext-btn-sm mb-0">Actions</h6>
            </div>
            <div className="card-body">
              <div className="d-grid gap-2">
                <SmallButton
                  variant="success"
                  onClick={handlePublish}
                  disabled={isPublishing}
                >
                  {isPublishing ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                      Publishing...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-rocket me-1"></i>
                      Publish Story
                    </>
                  )}
                </SmallButton>
                
                <SmallButton
                  variant="outline-primary"
                  onClick={handleSaveDraft}
                  disabled={isPublishing}
                >
                  {isPublishing ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                      Saving...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-save me-1"></i>
                      Save as Draft
                    </>
                  )}
                </SmallButton>
              </div>
            </div>
          </div>

          {/* Publishing Tips */}
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-light">
              <h6 className="subtext-btn-sm mb-0">Publishing Tips</h6>
            </div>
            <div className="card-body">
              <ul className="subtext-btn-sm mb-0">
                <li>Review your story carefully before publishing</li>
                <li>Make sure all dialogues are properly set up</li>
                <li>Test your 3D model to ensure it loads correctly</li>
                <li>Consider publishing as a draft first for review</li>
                <li>You can always edit your story after publishing</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Story Preview */}
      <div className="row mt-4">
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-light">
              <h6 className="subtext-btn-sm mb-0">Story Preview</h6>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-6">
                  <h6 className="subtext-btn-sm mb-3">Story Description</h6>
                  <p className="subtext-btn-sm text-muted">{data.story.description}</p>
                </div>
                <div className="col-md-6">
                  <h6 className="subtext-btn-sm mb-3">Episode Description</h6>
                  <p className="subtext-btn-sm text-muted">{data.episode.description}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublishStep;



