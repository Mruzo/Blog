import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import BackButton from '../components/BackButton';
import LoadingSpinner from '../components/LoadingSpinner';
import { useApi } from '../contexts/ApiContext';
import { Studio, apiService } from '../services/api';

const StudioEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { myStudio, loadMyStudio, updateStudio, loadCurrentUser } = useApi();
  const [studio, setStudio] = useState<Studio | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_public: true,
    first_name: '',
    last_name: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStudio = async () => {
      try {
        const studioId = parseInt(id || '0');
        if (!studioId) {
          setError('Invalid studio ID');
          setLoading(false);
          return;
        }
        
        let foundStudio: Studio | null = null;
        
        // First check if myStudio is already loaded and matches
        if (myStudio && myStudio.id === studioId) {
          foundStudio = myStudio;
        } else {
          // Load myStudio directly using the API
          try {
            const loadedStudio = await apiService.getMyStudio();
            if (loadedStudio && loadedStudio.id === studioId) {
              foundStudio = loadedStudio;
              // Also update the context
              await loadMyStudio();
            }
          } catch (err) {
            console.error('Error loading my studio:', err);
            // Try to fetch the studio directly by ID as fallback
            // (This might fail if user doesn't have permission)
            try {
              const studio = await apiService.getStudio(studioId);
              foundStudio = studio;
            } catch (fetchErr: any) {
              // If 403/404, user doesn't have permission or studio doesn't exist
              if (fetchErr?.response?.status === 403 || fetchErr?.response?.status === 404) {
                // Not accessible or missing
              } else {
                console.error('Error fetching studio by ID:', fetchErr);
              }
            }
          }
        }
        
        if (foundStudio) {
          setStudio(foundStudio);
          // Get current user info for first_name and last_name
          const user = await apiService.getCurrentUser();
          setFormData({
            name: foundStudio.name || '',
            description: foundStudio.description || '',
            is_public: foundStudio.is_public !== undefined ? foundStudio.is_public : true,
            first_name: user?.first_name || '',
            last_name: user?.last_name || ''
          });
        } else {
          setError('Studio not found or you do not have permission to edit this studio');
        }
      } catch (err) {
        setError('Failed to load studio');
        console.error('Error loading studio:', err);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchStudio();
    }
  }, [id, myStudio, loadMyStudio]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const studioId = parseInt(id || '0');
      const updateData: Partial<Studio> = {
        name: formData.name || '',
        description: formData.description || '',
        is_public: formData.is_public
      };
      
      const updatedStudio = await updateStudio(studioId, updateData);
      
      // Update user profile (first_name and last_name)
      try {
        await apiService.updateUser({
          first_name: formData.first_name,
          last_name: formData.last_name
        });
        // Reload current user to reflect changes in the UI
        await loadCurrentUser();
      } catch (userErr: any) {
        console.error('Error updating user profile:', userErr);
        // Don't fail the whole operation if user update fails
        // Just log the error
      }
      
      // Update local studio state
      setStudio(updatedStudio);
      
      navigate(`/immersivecomics/my-studio/`);
    } catch (err: any) {
      // Extract detailed error message from API response
      let errorMessage = 'An error occurred. Please try again.';
      if (err.response?.data) {
        // Handle Django REST Framework validation errors
        if (typeof err.response.data === 'object' && err.response.data !== null) {
          // Extract field errors
          const fieldErrors = Object.entries(err.response.data)
            .map(([field, messages]: [string, any]) => {
              let messageList: string;
              if (Array.isArray(messages) && messages.length > 0) {
                messageList = messages.join(', ');
              } else if (typeof messages === 'object' && messages !== null) {
                // Handle nested object errors
                messageList = JSON.stringify(messages);
              } else {
                messageList = String(messages);
              }
              return `${field}: ${messageList}`;
            })
            .join('; ');
          
          // Use field errors if available, otherwise check for detail/error keys
          if (fieldErrors.trim()) {
            errorMessage = fieldErrors;
          } else if (err.response.data.detail) {
            errorMessage = err.response.data.detail;
          } else if (err.response.data.error) {
            errorMessage = err.response.data.error;
          }
        } else {
          errorMessage = String(err.response.data);
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
      console.error('Studio update error:', {
        status: err.response?.status,
        data: err.response?.data,
        fullError: err
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="product-landing">
        <section className="product-landing__section">
          <div className="product-landing__container store-page__loadingWrap">
            <LoadingSpinner message="Loading studio…" />
          </div>
        </section>
      </div>
    );
  }

  if (error && !studio) {
    return (
      <div className="product-landing">
        <section className="product-landing__section">
          <div className="product-landing__container" style={{ maxWidth: '720px' }}>
            <BackButton to="/immersivecomics/my-studio/" />
            <div className="store-page__error mt-3" role="alert">
              <i className="fas fa-exclamation-triangle store-page__errorIcon" aria-hidden />
              <span>{error}</span>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="product-landing">
      <section className="product-landing__section product-landing__hero">
        <div className="product-landing__container" style={{ maxWidth: '720px' }}>
          <p className="product-landing__eyebrow">Studio</p>
          <h1 className="product-landing__h1">Edit studio</h1>
          <p className="product-landing__lead">Update your studio profile and visibility.</p>
        </div>
      </section>

      <section className="product-landing__section">
        <div className="product-landing__container" style={{ maxWidth: '720px' }}>
          <div className="d-flex justify-content-end mb-3">
            <BackButton to="/immersivecomics/my-studio/" />
          </div>

          <div className="my-studio__panel">
            <div className="my-studio__panelHead">
              <h2 className="my-studio__panelTitle">
                <i className="fas fa-clapperboard" aria-hidden />
                <span>{studio?.name || 'Studio'}</span>
              </h2>
            </div>
            <div className="my-studio__panelBody">
          {error && (
            <div className="store-page__error mb-3" role="alert">
              <i className="fas fa-exclamation-triangle store-page__errorIcon" aria-hidden />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label htmlFor="name" className="form-label subtext-btn-sm">
                Studio Name <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                className="form-control"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="Enter studio name"
              />
            </div>

            <div className="mb-3">
              <label htmlFor="description" className="form-label subtext-btn-sm">
                Description
              </label>
              <textarea
                className="form-control"
                id="description"
                name="description"
                rows={4}
                value={formData.description}
                onChange={handleChange}
                placeholder="Enter studio description"
              />
            </div>

            <div className="row mb-3">
              <div className="col-6">
                <label htmlFor="first_name" className="form-label subtext-btn-sm">
                  First Name
                </label>
                <input
                  type="text"
                  className="form-control"
                  id="first_name"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  placeholder="Enter first name"
                />
              </div>
              <div className="col-6">
                <label htmlFor="last_name" className="form-label subtext-btn-sm">
                  Last Name
                </label>
                <input
                  type="text"
                  className="form-control"
                  id="last_name"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  placeholder="Enter last name"
                />
              </div>
            </div>

            <div className="mb-3">
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="is_public"
                  name="is_public"
                  checked={formData.is_public}
                  onChange={handleChange}
                />
                <label className="form-check-label subtext-btn-sm" htmlFor="is_public">
                  Make studio public (visible to others)
                </label>
              </div>
            </div>

            <div className="d-flex gap-2 justify-content-end flex-wrap pt-2">
              <button
                type="button"
                className="product-landing__ctaGhost"
                onClick={() => navigate(`/immersivecomics/my-studio/`)}
                disabled={saving}
              >
                Cancel
              </button>
              <button type="submit" className="stories-landing__btnPrimary" disabled={saving}>
                {saving ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden />
                    Saving…
                  </>
                ) : (
                  <>
                    <i className="fas fa-save me-2" aria-hidden />
                    Save changes
                  </>
                )}
              </button>
            </div>
          </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default StudioEdit;

