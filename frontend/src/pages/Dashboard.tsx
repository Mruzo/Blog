import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import PageHeader from '../components/PageHeader';
import SmallButton from '../components/SmallButton';
import { useApi } from '../contexts/ApiContext';

interface Comic {
  id: number;
  title: string;
  description: string;
  comic_image: string | null;
  is_public: boolean;
  moderation_status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
  user: number; // User ID
}

const Stories: React.FC = () => {
  const { stories, loadStories, isLoading, error } = useApi();
  const [comics, setComics] = useState<Comic[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchComics = async () => {
      setLoading(true);
      try {
        await loadStories();
        // Convert stories to comics format for display, filtering for published stories
        const comicsData = stories
          .filter(story => story.is_public) // Only show published stories
          .map(story => ({
            id: story.id,
            title: story.title,
            description: story.description,
            comic_image: "/api/placeholder/300/200", // TODO: Add image field to story
            is_public: story.is_public,
            moderation_status: 'approved' as const, // Published stories are considered approved
            created_at: story.created_at,
            updated_at: story.updated_at,
            user: story.user
          }));
        setComics(comicsData);
      } catch (err) {
        console.error('Failed to load stories:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchComics();
  }, [loadStories, stories]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger" role="alert">
          <i className="fas fa-exclamation-triangle me-2"></i>
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-4" style={{ maxWidth: '1200px' }}>
      <PageHeader
        title="Published Stories"
        description="Browse all published 3D comic stories"
        actions={
          <SmallButton to="/immersivecomics/story/create/">
            <i className="fas fa-plus me-1"></i>Create New Story
          </SmallButton>
        }
      />

      {comics.length === 0 ? (
        <div className="text-center py-5">
          <div className="card border-0 shadow-sm">
            <div className="card-body py-5">
              <i className="fas fa-book-open fa-4x text-muted mb-3"></i>
              <h5 className="subtext-btn-sm text-muted mb-3">No published stories yet</h5>
              <p className="subtext-btn-sm text-muted mb-4">
                No published stories are available. Create and publish your first 3D comic story.
              </p>
              <Link 
                to="/immersivecomics/story/create/" 
                className="btn btn-primary subtext-btn-sm"
              >
                <i className="fas fa-plus me-1"></i>Create Your First Story
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="row">
          {comics.map((comic) => (
            <div key={comic.id} className="col-lg-4 col-md-6 mb-4">
              <div className="card h-100 border-0 shadow-sm">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <h5 className="subtext-btn-sm mb-1">{comic.title}</h5>
                    <div className="dropdown">
                      <button 
                        className="btn btn-sm btn-outline-secondary" 
                        type="button" 
                        data-bs-toggle="dropdown"
                      >
                        <i className="fas fa-ellipsis-v"></i>
                      </button>
                      <ul className="dropdown-menu">
                        <li>
                          <Link className="dropdown-item" to={`/immersivecomics/story/${comic.id}/edit/`}>
                            <i className="fas fa-edit me-2"></i>Edit
                          </Link>
                        </li>
                        <li>
                          <Link className="dropdown-item" to={`/immersivecomics/story/${comic.id}/manage/`}>
                            <i className="fas fa-cog me-2"></i>Manage
                          </Link>
                        </li>
                      </ul>
                    </div>
                  </div>
                  
                  <p className="subtext-btn-sm text-muted mb-3">
                    {comic.description}
                  </p>
                  
                  {/* Comic Image */}
                  {comic.comic_image && (
                    <div className="mb-3">
                      <img 
                        src={comic.comic_image} 
                        alt={comic.title}
                        className="img-fluid rounded"
                        style={{ maxHeight: '120px', width: '100%', objectFit: 'cover' }}
                      />
                    </div>
                  )}
                  
                  <div className="d-flex gap-2 mb-3">
                    <span className={`badge ${comic.is_public ? 'bg-success' : 'bg-secondary'}`}>
                      {comic.is_public ? 'Public' : 'Private'}
                    </span>
                    <span className={`badge ${
                      comic.moderation_status === 'approved' ? 'bg-success' : 
                      comic.moderation_status === 'pending' ? 'bg-warning' : 'bg-danger'
                    }`}>
                      {comic.moderation_status}
                    </span>
                  </div>
                  
                  <div className="text-muted subtext-btn-sm">
                    <div>Created: {new Date(comic.created_at).toLocaleDateString()}</div>
                    <div>Updated: {new Date(comic.updated_at).toLocaleDateString()}</div>
                  </div>
                </div>
                
                <div className="card-footer bg-transparent border-0 pt-0">
                  <div className="d-flex gap-2">
                    <Link 
                      to={`/immersivecomics/story/${comic.id}/manage/`}
                      className="btn btn-outline-primary btn-sm subtext-btn-sm flex-fill"
                    >
                      <i className="fas fa-cog me-1"></i>Manage
                    </Link>
                    <Link 
                      to={`/immersivecomics/story/${comic.id}/edit/`}
                      className="btn btn-outline-secondary btn-sm subtext-btn-sm flex-fill"
                    >
                      <i className="fas fa-edit me-1"></i>Edit
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Floating Action Button */}
      <Link 
        to="/immersivecomics/story/create/"
        className="btn btn-primary rounded-circle position-fixed"
        style={{ 
          bottom: '20px', 
          right: '20px', 
          width: '60px', 
          height: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}
      >
        <i className="fas fa-plus fa-lg"></i>
      </Link>
    </div>
  );
};

export default Stories;