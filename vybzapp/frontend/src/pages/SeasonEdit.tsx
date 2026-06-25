import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import BackButton from '../components/BackButton';
import LoadingSpinner from '../components/LoadingSpinner';
import MessagePopup from '../components/MessagePopup';
import { useApi } from '../contexts/ApiContext';
import { SeasonCreateData } from '../services/api';

interface SeasonFormData {
  title: string;
  description: string;
  season_number: number;
  release_date: string;
  is_public: boolean;
}

const SeasonEdit: React.FC = () => {
  const { seasonId } = useParams<{ seasonId: string }>();
  const navigate = useNavigate();
  const { seasons, updateSeason } = useApi();
  
  const [formData, setFormData] = useState<SeasonFormData>({
    title: '',
    description: '',
    season_number: 1,
    release_date: new Date().toISOString().split('T')[0],
    is_public: false
  });
  
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'success' | 'danger' | 'warning' | 'info'>('success');
  const [showMessage, setShowMessage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Find the season to edit
  const season = seasons.find(s => s.id === parseInt(seasonId || '0'));

  useEffect(() => {
    if (season) {
      setFormData({
        title: season.title,
        description: season.description,
        season_number: season.season_number,
        release_date: season.release_date,
        is_public: season.is_public || false
      });
      setLoading(false);
    } else if (seasons.length > 0) {
      // Seasons loaded but this season not found
      setError('Season not found');
      setLoading(false);
    }
  }, [season, seasons]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (name === 'season_number' ? parseInt(value) || 1 : value)
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
    
    if (!seasonId) {
      setMessage('Season ID is required');
      setMessageType('danger');
      setShowMessage(true);
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const seasonData: Partial<SeasonCreateData> = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        season_number: formData.season_number,
        release_date: formData.release_date,
        is_public: formData.is_public
      };
      
      const updatedSeason = await updateSeason(parseInt(seasonId), seasonData);
      
      setMessage('Season updated successfully!');
      setMessageType('success');
      setShowMessage(true);
      
      // Navigate back to story management
      setTimeout(() => {
        navigate(`/immersivecomics/story/${updatedSeason.comic}/manage/`);
      }, 1500);
      
    } catch (error: any) {
      console.error('Error updating season:', error);
      setMessage(error.message || 'Failed to update season. Please try again.');
      setMessageType('danger');
      setShowMessage(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseMessage = () => {
    setShowMessage(false);
  };

  if (loading) {
    return (
      <div className="product-landing">
        <section className="product-landing__section">
          <div className="product-landing__container store-page__loadingWrap">
            <LoadingSpinner message="Loading season…" />
          </div>
        </section>
      </div>
    );
  }

  if (error || !season) {
    return (
      <div className="product-landing">
        <section className="product-landing__section">
          <div className="product-landing__container" style={{ maxWidth: '720px' }}>
            <div className="store-page__error" role="alert">
              <i className="fas fa-exclamation-triangle store-page__errorIcon" aria-hidden />
              <span>{error || 'Season not found'}</span>
            </div>
            <div className="store-page__ctaRow mt-3">
              <BackButton to="/immersivecomics/my-studio/" variant="primary" />
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="product-landing">
      <section className="product-landing__section product-landing__hero">
        <div className="product-landing__container" style={{ maxWidth: '800px' }}>
          <p className="product-landing__eyebrow">Season</p>
          <h1 className="product-landing__h1">Edit season</h1>
          <p className="product-landing__lead">
            {season.title} — details, visibility, and 3D model files.
          </p>
        </div>
      </section>

      <section className="product-landing__section">
        <div className="product-landing__container" style={{ maxWidth: '800px' }}>
          <div className="d-flex justify-content-end mb-3">
            <BackButton to={`/immersivecomics/story/${season.comic}/manage/`} />
          </div>

          <div className="my-studio__panel">
            <div className="my-studio__panelHead">
              <h2 className="my-studio__panelTitle">
                <i className="fas fa-layer-group" aria-hidden />
                <span className="my-studio__panelTitleText">{season.title}</span>
              </h2>
            </div>
            <div className="my-studio__panelBody">
          <form onSubmit={handleSubmit}>
            <div className="row">
              <div className="col-md-2">
                <div className="mb-2">
                  <label htmlFor="season_number" className="form-label subtext-btn-sm">
                    Season No. <span className="text-danger">*</span>
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
              
              <div className="col-md-7">
                <div className="mb-2">
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
              </div>
              
              <div className="col-md-3">
                <div className="mb-2">
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
                This season uses the shared JustVybz 3D model.
              </p>
            </div>

            {/* Public/Private Toggle */}
            <div className="mb-3">
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="is_public"
                  name="is_public"
                  checked={formData.is_public}
                  onChange={handleInputChange}
                />
                <label className="form-check-label subtext-btn-sm" htmlFor="is_public">
                  Make this season public
                  <small className="text-muted d-block mt-1">
                    <i className="fas fa-info-circle me-1"></i>
                    &nbsp;Season must be public and story must be public for others to view it
                  </small>
                </label>
              </div>
            </div>

            <div className="d-flex justify-content-end gap-2 flex-wrap pt-2">
              <button
                type="button"
                className="product-landing__ctaGhost"
                onClick={() => navigate(`/immersivecomics/story/${season.comic}/manage/`)}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button type="submit" className="stories-landing__btnPrimary" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden />
                    Updating…
                  </>
                ) : (
                  <>
                    <i className="fas fa-save me-2" aria-hidden />
                    Save season
                  </>
                )}
              </button>
            </div>
          </form>
            </div>
          </div>
        </div>
      </section>

      <MessagePopup
        message={message}
        type={messageType}
        show={showMessage}
        onClose={handleCloseMessage}
        duration={4000}
      />
    </div>
  );
};

export default SeasonEdit;


