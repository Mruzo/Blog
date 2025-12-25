import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import BackButton from '../components/BackButton';
import LoadingSpinner from '../components/LoadingSpinner';
import ImageUpload from '../components/ImageUpload';
import { useApi } from '../contexts/ApiContext';
import { Story } from '../services/api';

const StoryEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { loadStory, updateStory } = useApi();
  const [story, setStory] = useState<Story | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    is_public: false,
    comic_image: undefined as File | undefined
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStory = async () => {
      try {
        const storyId = parseInt(id || '0');
        const foundStory = await loadStory(storyId);
        
        if (foundStory) {
          setStory(foundStory);
          setFormData({
            title: foundStory.title,
            description: foundStory.description,
            is_public: foundStory.is_public,
            comic_image: undefined // Don't load existing image as File object
          });
        } else {
          setError('Story not found');
        }
      } catch (err) {
        setError('Failed to load story');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchStory();
    }
  }, [id, loadStory]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleImageChange = (file: File | null) => {
    setFormData(prev => ({
      ...prev,
      comic_image: file || undefined
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const storyId = parseInt(id || '0');
      const updateData: Partial<Story> = {
        title: formData.title || '', // Ensure title is never undefined
        description: formData.description || '', // Ensure description is never undefined
        is_public: formData.is_public
      };
      
      // Include comic_image only if a new file is selected AND it's actually a File object
      if (formData.comic_image && formData.comic_image instanceof File) {
        updateData.comic_image = formData.comic_image;
      }
      
      const updatedStory = await updateStory(storyId, updateData);
      
      // Update local story state
      setStory(updatedStory);
      
      navigate(`/immersivecomics/story/${id}/manage/`);
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
          
          // Special handling for comic_image errors
          if (err.response.data.comic_image) {
            const imageErrors = Array.isArray(err.response.data.comic_image) 
              ? err.response.data.comic_image.join(', ')
              : String(err.response.data.comic_image);
            errorMessage = `Cover image error: ${imageErrors}`;
          }
        } else {
          errorMessage = String(err.response.data);
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
      console.error('Story update error:', {
        status: err.response?.status,
        data: err.response?.data,
        fullError: err
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading story..." />;
  }

  if (error && !story) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger" role="alert">
          <i className="fas fa-exclamation-triangle me-2"></i>
          {error}
        </div>
        <BackButton to="/immersivecomics/" variant="primary" />
      </div>
    );
  }

  return (
    <div className="container mt-4" style={{ maxWidth: '800px' }}>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="subtext-btn mb-1">Edit Story: {story?.title}</h1>
          <p className="subtext-btn-sm text-muted mb-0">Update your story details</p>
        </div>
        <BackButton to={`/immersivecomics/story/${id}/manage/`} />
      </div>
      
      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            {error && (
              <div className="alert alert-danger" role="alert">
                <i className="fas fa-exclamation-triangle me-2"></i>
                {error}
              </div>
            )}
            
            <div className="mb-4">
              <label htmlFor="title" className="form-label subtext-btn-sm">
                Story Title
              </label>
              <input
                type="text"
                className="form-control"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                placeholder="Enter your story title"
              />
            </div>
            
            <div className="mb-4">
              <label htmlFor="description" className="form-label subtext-btn-sm">
                Description
              </label>
              <textarea
                className="form-control"
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                placeholder="Describe your story..."
              />
            </div>

            <div className="mb-4">
              <label className="form-label subtext-btn-sm">
                Cover Image
              </label>
              {/* Show current image if exists */}
              {story?.comic_image && typeof story.comic_image === 'string' && (
                <div className="mb-2">
                  <small className="text-muted subtext-btn-sm">Current cover:</small>
                  <div className="mt-1">
                    <img 
                      src={story.comic_image} 
                      alt="Current cover" 
                      className="img-thumbnail" 
                      style={{ maxWidth: '150px', maxHeight: '150px', objectFit: 'cover' }}
                    />
                  </div>
                </div>
              )}
              <ImageUpload
                value={formData.comic_image}
                onChange={handleImageChange}
                placeholder="Choose a new cover image for your story..."
                className="mt-2"
              />
              <div className="form-text subtext-btn-sm mt-1">
                {story?.comic_image && typeof story.comic_image === 'string' 
                  ? 'Upload a new image to replace the current cover, or leave empty to keep the current one.' 
                  : 'Upload a cover image for your story (JPG, PNG)'}
              </div>
            </div>
            
            <div className="form-check mb-4">
              <input
                className="form-check-input"
                type="checkbox"
                id="is_public"
                name="is_public"
                checked={formData.is_public}
                onChange={handleChange}
              />
                <label className="form-check-label subtext-btn-sm" htmlFor="is_public">
                Make this story public
              </label>
            </div>
            
            <div className="d-flex gap-2">
              <button
                type="submit"
                className="btn btn-primary subtext-btn-sm"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Saving...
                  </>
                ) : (
                  <>
                    <i className="fas fa-save me-1"></i>Save Changes
                  </>
                )}
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary subtext-btn-sm"
                onClick={() => navigate(`/immersivecomics/story/${id}/manage/`)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default StoryEdit;