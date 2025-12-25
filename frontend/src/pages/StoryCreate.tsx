import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BackButton from '../components/BackButton';
import LoadingSpinner from '../components/LoadingSpinner';
import ImageUpload from '../components/ImageUpload';
import { useApi } from '../contexts/ApiContext';

const StoryCreate: React.FC = () => {
  const navigate = useNavigate();
  const { createStory } = useApi();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    is_public: false,
    comic_image: undefined as File | undefined
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Initialize form on component mount
  useEffect(() => {
    // Reset form when component mounts
    setFormData({
      title: '',
      description: '',
      is_public: false,
      comic_image: undefined
    });
    setError('');
  }, []);

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
    setLoading(true);
    setError('');

    try {
      const story = await createStory(formData);
      navigate(`/immersivecomics/story/${story.id}/manage/`);
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Creating story..." />;
  }

  return (
    <div className="container mt-4" style={{ maxWidth: '800px' }}>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="subtext-btn mb-1">Create New Story</h1>
          <p className="subtext-btn-sm text-muted mb-0">Start building your 3D comic story</p>
        </div>
        <BackButton to="/immersivecomics/" />
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
              <ImageUpload
                value={formData.comic_image}
                onChange={handleImageChange}
                placeholder="Choose a cover image for your story..."
                className="mt-2"
              />
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
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Creating...
                  </>
                ) : (
                  <>
                    <i className="fas fa-plus me-1"></i>Create Story
                  </>
                )}
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary subtext-btn-sm"
                onClick={() => navigate('/immersivecomics/')}
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

export default StoryCreate;