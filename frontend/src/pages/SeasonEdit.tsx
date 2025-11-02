import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import SmallButton from '../components/SmallButton';
import BackButton from '../components/BackButton';
import LoadingSpinner from '../components/LoadingSpinner';
import MessagePopup from '../components/MessagePopup';
import { useApi } from '../contexts/ApiContext';
import { Season, SeasonCreateData } from '../services/api';

interface SeasonFormData {
  title: string;
  description: string;
  season_number: number;
  release_date: string;
  model_gltf?: File;
  model_usdz?: File;
}

const SeasonEdit: React.FC = () => {
  const { seasonId } = useParams<{ seasonId: string }>();
  const navigate = useNavigate();
  const { seasons, updateSeason, loadSeasons } = useApi();
  
  const [formData, setFormData] = useState<SeasonFormData>({
    title: '',
    description: '',
    season_number: 1,
    release_date: new Date().toISOString().split('T')[0],
    model_gltf: undefined,
    model_usdz: undefined
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
        model_gltf: undefined, // Don't pre-populate file inputs
        model_usdz: undefined
      });
      setLoading(false);
    } else if (seasons.length > 0) {
      // Seasons loaded but this season not found
      setError('Season not found');
      setLoading(false);
    }
  }, [season, seasons]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'season_number' ? parseInt(value) || 1 : value
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, files } = e.target;
    if (files && files[0]) {
      setFormData(prev => ({
        ...prev,
        [name]: files[0]
      }));
    }
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
    
    // Validate file types and sizes
    if (formData.model_gltf) {
      const file = formData.model_gltf;
      if (!file.name.toLowerCase().endsWith('.glb') && !file.name.toLowerCase().endsWith('.gltf')) {
        setMessage('GLTF model must be a .glb or .gltf file');
        setMessageType('warning');
        setShowMessage(true);
        return false;
      }
      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        setMessage('GLTF model file size cannot exceed 50MB');
        setMessageType('warning');
        setShowMessage(true);
        return false;
      }
    }
    
    if (formData.model_usdz) {
      const file = formData.model_usdz;
      if (!file.name.toLowerCase().endsWith('.usdz')) {
        setMessage('USDZ model must be a .usdz file');
        setMessageType('warning');
        setShowMessage(true);
        return false;
      }
      if (file.size > 25 * 1024 * 1024) { // 25MB limit
        setMessage('USDZ model file size cannot exceed 25MB');
        setMessageType('warning');
        setShowMessage(true);
        return false;
      }
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
        model_gltf: formData.model_gltf,
        model_usdz: formData.model_usdz
      };
      
      console.log('Updating season with data:', seasonData);
      
      const updatedSeason = await updateSeason(parseInt(seasonId), seasonData);
      
      console.log('Season updated successfully:', updatedSeason);
      
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

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return <LoadingSpinner message="Loading season..." />;
  }

  if (error || !season) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger" role="alert">
          <i className="fas fa-exclamation-triangle me-2"></i>
          {error || 'Season not found'}
        </div>
        <div className="mt-3">
          <BackButton to="/immersivecomics/my-studio/" variant="primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-4" style={{ maxWidth: '800px' }}>
      <PageHeader
        title={`Edit Season: ${season.title}`}
        description="Update season details and 3D models"
        actions={
          <BackButton to={`/immersivecomics/story/${season.comic}/manage/`} />
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

            {/* 3D Model Upload Section */}
            <div className="mb-4">
              <h5 className="subtext-btn-sm mb-3">
                <i className="fas fa-cube me-2"></i>3D Models (Optional)
              </h5>
              
              <div className="row">
                <div className="col-md-6">
                  <div className="mb-3">
                    <label htmlFor="model_gltf" className="form-label subtext-btn-sm">
                      GLTF/GLB Model
                    </label>
                    <input
                      type="file"
                      className="form-control form-control-sm"
                      id="model_gltf"
                      name="model_gltf"
                      accept=".glb,.gltf"
                      onChange={handleFileChange}
                    />
                    <div className="form-text subtext-btn-sm">
                      <i className="fas fa-info-circle me-1"></i>
                      Maximum 50MB. Supports .glb and .gltf formats.
                    </div>
                    {formData.model_gltf && (
                      <div className="mt-2">
                        <small className="text-success">
                          <i className="fas fa-check-circle me-1"></i>
                          Selected: {formData.model_gltf.name} ({formatFileSize(formData.model_gltf.size)})
                        </small>
                      </div>
                    )}
                    {season.model_gltf && !formData.model_gltf && (
                      <div className="mt-2">
                        <small className="text-info">
                          <i className="fas fa-info-circle me-1"></i>
                          Current: {season.model_gltf.split('/').pop()}
                        </small>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="col-md-6">
                  <div className="mb-3">
                    <label htmlFor="model_usdz" className="form-label subtext-btn-sm">
                      USDZ Model
                    </label>
                    <input
                      type="file"
                      className="form-control form-control-sm"
                      id="model_usdz"
                      name="model_usdz"
                      accept=".usdz"
                      onChange={handleFileChange}
                    />
                    <div className="form-text subtext-btn-sm">
                      <i className="fas fa-info-circle me-1"></i>
                      Maximum 25MB. Supports .usdz format for AR/VR.
                    </div>
                    {formData.model_usdz && (
                      <div className="mt-2">
                        <small className="text-success">
                          <i className="fas fa-check-circle me-1"></i>
                          Selected: {formData.model_usdz.name} ({formatFileSize(formData.model_usdz.size)})
                        </small>
                      </div>
                    )}
                    {season.model_usdz && !formData.model_usdz && (
                      <div className="mt-2">
                        <small className="text-info">
                          <i className="fas fa-info-circle me-1"></i>
                          Current: {season.model_usdz.split('/').pop()}
                        </small>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="d-flex justify-content-end gap-2">
              <SmallButton
                type="button"
                variant="outline-secondary"
                onClick={() => navigate(`/immersivecomics/story/${season.comic}/manage/`)}
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
                    Updating...
                  </>
                ) : (
                  <>
                    <i className="fas fa-save me-1"></i>Update Season
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

export default SeasonEdit;


