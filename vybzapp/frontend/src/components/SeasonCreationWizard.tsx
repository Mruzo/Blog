import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PageHeader from './PageHeader';
import SmallButton from './SmallButton';
import BackButton from './BackButton';
import MessagePopup from './MessagePopup';
import { useApi } from '../contexts/ApiContext';
import { SeasonCreateData } from '../services/api';

interface SeasonFormData {
  title: string;
  description: string;
  season_number: number;
  release_date: string;
}

const SeasonCreationWizard: React.FC = () => {
  const { storyId } = useParams<{ storyId: string }>();
  const navigate = useNavigate();
  const { createSeason, loadSeasons } = useApi();
  
  const [formData, setFormData] = useState<SeasonFormData>({
    title: '',
    description: '',
    season_number: 1,
    release_date: new Date().toISOString().split('T')[0]
  });
  
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'success' | 'danger' | 'warning' | 'info'>('success');
  const [showMessage, setShowMessage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'season_number' ? parseInt(value) || 1 : value
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.title.trim()) {
      setMessage('Please enter a season title');
      setMessageType('warning');
      setShowMessage(true);
      return false;
    }
    
    if (!formData.description.trim()) {
      setMessage('Please enter a season description');
      setMessageType('warning');
      setShowMessage(true);
      return false;
    }
    
    if (formData.season_number < 1) {
      setMessage('Season number must be at least 1');
      setMessageType('warning');
      setShowMessage(true);
      return false;
    }
    
    if (!formData.release_date) {
      setMessage('Please select a release date');
      setMessageType('warning');
      setShowMessage(true);
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    if (!storyId) {
      setMessage('Story ID is required');
      setMessageType('danger');
      setShowMessage(true);
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const seasonData: SeasonCreateData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        season_number: formData.season_number,
        release_date: formData.release_date
      };
      
      console.log('Creating season with data:', seasonData);
      
      const createdSeason = await createSeason(parseInt(storyId), seasonData);
      
      console.log('Season created successfully:', createdSeason);
      
      setMessage('Season created successfully!');
      setMessageType('success');
      setShowMessage(true);
      
      // Refresh seasons list
      await loadSeasons(parseInt(storyId));
      
      // Navigate back to story management
      setTimeout(() => {
        navigate(`/immersivecomics/story/${storyId}/manage/`);
      }, 1500);
      
    } catch (error: any) {
      console.error('Error creating season:', error);
      setMessage(error.message || 'Failed to create season. Please try again.');
      setMessageType('danger');
      setShowMessage(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseMessage = () => {
    setShowMessage(false);
  };

  return (
    <div className="container mt-4" style={{ maxWidth: '800px' }}>
      <PageHeader
        title="Create New Season"
        description="Add a new season to your story"
        actions={
          <BackButton to={`/immersivecomics/story/${storyId}/manage/`} />
        }
      />

      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="row">
              <div className="col-md-6">
                <div className="mb-3">
                  <label htmlFor="title" className="form-label subtext-btn-sm">
                    Season Title <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="Enter season title"
                    required
                  />
                </div>
                
                <div className="mb-3">
                  <label htmlFor="season_number" className="form-label subtext-btn-sm">
                    Season Number <span className="text-danger">*</span>
                  </label>
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    id="season_number"
                    name="season_number"
                    value={formData.season_number}
                    onChange={handleInputChange}
                    min="1"
                    required
                  />
                </div>
              </div>
              
              <div className="col-md-6">
                <div className="mb-3">
                  <label htmlFor="release_date" className="form-label subtext-btn-sm">
                    Release Date <span className="text-danger">*</span>
                  </label>
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    id="release_date"
                    name="release_date"
                    value={formData.release_date}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
            </div>
            
            <div className="mb-3">
              <label htmlFor="description" className="form-label subtext-btn-sm">
                Description <span className="text-danger">*</span>
              </label>
              <textarea
                className="form-control form-control-sm"
                id="description"
                name="description"
                rows={4}
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Describe this season..."
                required
              />
            </div>

            <div className="mb-4 rounded border bg-light p-3">
              <h5 className="subtext-btn-sm mb-2">
                <i className="fas fa-cube me-2" aria-hidden></i>3D Model
              </h5>
              <p className="subtext-btn-sm mb-0 text-muted">
                This season will use the shared JustVybz 3D model.
              </p>
            </div>

            <div className="d-flex justify-content-end gap-2">
              <SmallButton
                type="button"
                variant="outline-secondary"
                onClick={() => navigate(`/immersivecomics/story/${storyId}/manage/`)}
                disabled={isSubmitting}
              >
                Cancel
              </SmallButton>
              <SmallButton
                type="submit"
                variant="primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                    Creating...
                  </>
                ) : (
                  <>
                    <i className="fas fa-plus me-1"></i>Create Season
                  </>
                )}
              </SmallButton>
            </div>
          </form>
        </div>
      </div>

      {/* Message Popup */}
      {showMessage && (
        <MessagePopup
          message={message}
          type={messageType}
          show={showMessage}
          onClose={handleCloseMessage}
        />
      )}
    </div>
  );
};

export default SeasonCreationWizard;
