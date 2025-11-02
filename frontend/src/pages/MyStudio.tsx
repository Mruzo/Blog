import React, { useState, useEffect, useCallback } from 'react';
import LoadingSpinner from '../components/LoadingSpinner';
import MessagePopup from '../components/MessagePopup';
import PageHeader from '../components/PageHeader';
// import SmallButton from '../components/SmallButton';
import ScrollAwareLink from '../components/ScrollAwareLink';
import { useApi } from '../contexts/ApiContext';
import { apiService } from '../services/api';


const MyStudio: React.FC = () => {
  const { stories, myStudio, loadStories, loadMyStudio, isLoading, deleteStory } = useApi();
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'success' | 'danger' | 'warning' | 'info'>('success');
  const [showMessage, setShowMessage] = useState(false);
  const [storyCounts, setStoryCounts] = useState<{[key: number]: {seasons: number, episodes: number}}>({});
  const [isLoadingCounts, setIsLoadingCounts] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  // const [hasMoreStories, setHasMoreStories] = useState(true);
  const [storiesPerPage] = useState(10);

  // Load seasons and episodes counts for each story (optimized with pagination)
  const loadStoryCounts = useCallback(async (stories: any[]) => {
    if (stories.length === 0) return;
    
    setIsLoadingCounts(true);
    const counts: {[key: number]: {seasons: number, episodes: number}} = {};
    
    try {
      // Only load counts for visible stories (pagination)
      const startIndex = (currentPage - 1) * storiesPerPage;
      const endIndex = startIndex + storiesPerPage;
      const visibleStories = stories.slice(startIndex, endIndex);
      
      if (visibleStories.length === 0) {
        setStoryCounts(counts);
        return;
      }
      
      // Load all seasons for visible stories in parallel
      const seasonResults = await Promise.all(
        visibleStories.map(async (story) => {
          const storySeasons = await apiService.getSeasons(story.id);
          return { storyId: story.id, seasons: storySeasons };
        })
      );
      
      // Group seasons by story
      const seasonsByStory: {[key: number]: any[]} = {};
      seasonResults.forEach(({ storyId, seasons: storySeasons }) => {
        seasonsByStory[storyId] = storySeasons;
      });
      
      // Load all episodes for all seasons in parallel
      const episodeResults = await Promise.all(
        seasonResults.flatMap(({ seasons: storySeasons }) =>
          storySeasons.map(async (season) => {
            const seasonEpisodes = await apiService.getEpisodes(season.id);
            return { seasonId: season.id, episodes: seasonEpisodes };
          })
        )
      );
      
      // Group episodes by season
      const episodesBySeason: {[key: number]: any[]} = {};
      episodeResults.forEach(({ seasonId, episodes: seasonEpisodes }) => {
        episodesBySeason[seasonId] = seasonEpisodes;
      });
      
      // Calculate counts for visible stories only
      visibleStories.forEach(story => {
        const storySeasons = seasonsByStory[story.id] || [];
        const totalEpisodes = storySeasons.reduce((total, season) => {
          return total + (episodesBySeason[season.id]?.length || 0);
        }, 0);
        
        counts[story.id] = {
          seasons: storySeasons.length,
          episodes: totalEpisodes
        };
      });
      
      setStoryCounts(prev => ({ ...prev, ...counts }));
    } catch (error) {
      console.error('Error loading story counts:', error);
      // Set default counts for visible stories on error
      const startIndex = (currentPage - 1) * storiesPerPage;
      const endIndex = startIndex + storiesPerPage;
      const visibleStories = stories.slice(startIndex, endIndex);
      visibleStories.forEach(story => {
        counts[story.id] = { seasons: 0, episodes: 0 };
      });
      setStoryCounts(prev => ({ ...prev, ...counts }));
    } finally {
      setIsLoadingCounts(false);
    }
  }, [currentPage, storiesPerPage]); // Include pagination dependencies

  // Load data on component mount
  useEffect(() => {
    const fetchMyStudio = async () => {
      try {
        console.log('MyStudio: Loading stories and studio data...');
        setIsInitialLoading(true);
        // Always load fresh stories and studio data for MyStudio page
        await Promise.all([
          loadStories(),
          loadMyStudio()
        ]);
        console.log('MyStudio: Data loaded successfully');
      } catch (error) {
        console.error('Error fetching studio:', error);
        setMessage('Failed to load studio data.');
        setMessageType('danger');
        setShowMessage(true);
      } finally {
        setIsInitialLoading(false);
      }
    };

    fetchMyStudio();
  }, [loadStories, loadMyStudio]); // Include dependencies

  // Load counts when stories change and debug logging
  useEffect(() => {
    // Debug: Log stories when they change
    console.log('MyStudio: Stories updated:', stories);
    console.log('MyStudio: Stories count:', stories?.length || 0);
    console.log('MyStudio: Draft stories:', stories?.filter(s => !s.is_public) || []);
    console.log('MyStudio: Public stories:', stories?.filter(s => s.is_public) || []);
    
    // Load counts asynchronously to not block UI (deferred loading)
    if (stories && stories.length > 0) {
      // Use setTimeout to defer the counts loading
      const timeoutId = setTimeout(() => {
        loadStoryCounts(stories);
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [stories, loadStoryCounts]); // Include loadStoryCounts in dependencies

  // Calculate pagination
  const totalPages = Math.ceil((stories?.length || 0) / storiesPerPage);
  const startIndex = (currentPage - 1) * storiesPerPage;
  const endIndex = startIndex + storiesPerPage;
  const paginatedStories = stories?.slice(startIndex, endIndex) || [];

  // Pagination handlers
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setStoryCounts({}); // Clear counts for new page
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      handlePageChange(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      handlePageChange(currentPage - 1);
    }
  };


  const handleCloseMessage = () => {
    setShowMessage(false);
  };

  // Show loading spinner during initial load
  if (isInitialLoading) {
    return <LoadingSpinner message="Loading studio..." />;
  }


  const handleDeleteStory = async (storyId: number, storyTitle: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${storyTitle || 'Untitled Story'}"? This action cannot be undone.`
    );
    
    if (!confirmed) {
      return;
    }

    try {
      await deleteStory(storyId);
      setMessage(`Story "${storyTitle || 'Untitled Story'}" has been deleted successfully.`);
      setMessageType('success');
      setShowMessage(true);
    } catch (error: any) {
      console.error('Delete story error:', error);
      setMessage('Failed to delete story. Please try again.');
      setMessageType('danger');
      setShowMessage(true);
    }
  };

  // Helper functions for role display (commented out until collaborators are added to API)
  // const getRoleIcon = (role: string) => {
  //   const roleIcons: Record<string, string> = {
  //     'writer': 'fas fa-pen',
  //     '3d_artist': 'fas fa-cube',
  //     'voice_actor': 'fas fa-microphone',
  //     'sound_engineer': 'fas fa-volume-up',
  //     'cinematographer': 'fas fa-video'
  //   };
  //   return roleIcons[role] || 'fas fa-user';
  // };

  // const getRoleColor = (role: string) => {
  //   const roleColors: Record<string, string> = {
  //     'writer': 'primary',
  //     '3d_artist': 'success',
  //     'voice_actor': 'info',
  //     'sound_engineer': 'warning',
  //     'cinematographer': 'danger'
  //   };
  //   return roleColors[role] || 'secondary';
  // };

  // Show loading spinner only if data is not yet loaded
  if (isLoading || (!stories && !myStudio)) {
    return <LoadingSpinner />;
  }

  // Studio data is now loaded from API, no need to check for studio object

  return (
    <div className="container mt-4" style={{ maxWidth: '1200px' }}>
      <PageHeader
        title="My Studio"
        description="Manage your collaborative storytelling workspace"
        actions={null}
      />

      <MessagePopup
        message={message}
        type={messageType}
        show={showMessage}
        onClose={handleCloseMessage}
        duration={3000}
      />


      {/* Studio Overview */}
      <div className="row mb-4">
        <div className="col-lg-10">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-primary text-white">
              <h5 className="mb-0 subtext-btn-xs"><i className="fas fa-building me-2"></i>Studio Overview</h5>
            </div>
            <div className="card-body">
              <h4 className="subtext-btn-md mb-3">{myStudio?.name || "My Studio"}</h4>
              <p className="subtext-btn-sm mb-4">{myStudio?.description || "A collaborative space for immersive 3D storytelling."}</p>
              
              <div className="row text-center">
                <div className="col-3">
                  <div className="subtext-btn-xs text-primary">{stories?.length || 0}</div>
                  <div className="subtext-btn-sm text-muted">Stories</div>
                </div>
                
                <div className="col-3">
                  <div className="subtext-btn-xs text-info">
                    {isLoadingCounts ? (
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    ) : (
                      stories ? stories.reduce((total, story) => total + (storyCounts[story.id]?.seasons || 0), 0) : 0
                    )}
                  </div>
                  <div className="subtext-btn-sm text-muted">Seasons</div>
                </div>
                <div className="col-3">
                  <div className="subtext-btn-xs text-warning">
                    {isLoadingCounts ? (
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    ) : (
                      stories ? stories.reduce((total, story) => total + (storyCounts[story.id]?.episodes || 0), 0) : 0
                    )}
                  </div>
                  <div className="subtext-btn-sm text-muted">Episodes</div>
                </div>
                <div className="col-3">
                  <div className="subtext-btn-xs text-success">1</div>
                  <div className="subtext-btn-sm text-muted">Team</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="col-lg-2">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-info text-white">
              <h5 className="mb-0 subtext-btn-xs"><i className="fas fa-users me-2"></i>Team</h5>
            </div>
            <div className="card-body">
              {/* Owner */}
              <div className="d-flex align-items-center mb-3">
                <i className="fas fa-crown text-warning me-2"></i>
                <div>
                  <div className="subtext-btn-sm fw-bold">Chris</div>
                  <div className="subtext-btn-sm text-muted">Owner</div>
                </div>
              </div>
              
              {/* Collaborators - TODO: Add collaborators to API */}
              {/* {studio.collaborators.map((collaborator) => (
                <div key={collaborator.id} className="d-flex align-items-center mb-2">
                  <span className={`badge bg-${getRoleColor(collaborator.role)} me-2`}>
                    <i className={`${getRoleIcon(collaborator.role)} me-1`}></i>
                    {collaborator.role.replace('_', ' ').toUpperCase()}
                  </span>
                  <div>
                    <div className="subtext-btn-sm">{collaborator.first_name} {collaborator.last_name}</div>
                    <div className="subtext-btn-sm text-muted">@{collaborator.username}</div>
                  </div>
                </div>
              ))} */}
            </div>
          </div>
        </div>
      </div>

      {/* Stories Section */}
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h3 className="subtext-btn-md mb-0">My Stories</h3>
            <div className="d-flex gap-2">
              <ScrollAwareLink 
                to="/immersivecomics/story/create/" 
                className="btn btn-primary subtext-btn-sm"
              >
                <i className="fas fa-plus me-1"></i> Create
              </ScrollAwareLink>
              <ScrollAwareLink 
                to="/immersivecomics/import/" 
                className="btn btn-success subtext-btn-sm"
              >
                <i className="fas fa-download me-1"></i> Import
              </ScrollAwareLink>
              
            </div>
          </div>
          
          {paginatedStories && paginatedStories.length > 0 ? (
            <div>
              <div className="row">
                {paginatedStories.map((story) => (
                <div key={story.id} className="col-lg-6 col-md-6 mb-4">
                  <div className="card h-100 border-0 shadow-sm">
                    {/* Cover Image */}
                    {story.comic_image && typeof story.comic_image === 'string' && (
                      <div className="card-img-top" style={{ height: '200px', overflow: 'hidden' }}>
                        <img 
                          src={story.comic_image} 
                          alt={story.title || 'Story cover'} 
                          className="w-100 h-100"
                          style={{ objectFit: 'cover' }}
                        />
                      </div>
                    )}
                    
                    <div className="card-body">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <h5 className="subtext-btn-xs mb-0">{story.title || 'Untitled Story'}</h5>
                          <div className="d-flex gap-2">
                            <ScrollAwareLink 
                              to={`/immersivecomics/story/${story.id}/manage/`} 
                              className="btn btn-primary subtext-btn-sm"
                            >
                              <i className="fas fa-cog me-1"></i>
                            </ScrollAwareLink>
                            <button 
                              className="btn btn-sm btn-outline-danger" 
                              type="button" 
                              onClick={() => handleDeleteStory(story.id, story.title)}
                              title="Delete story"
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        </div>
                      
                      <p className="subtext-btn-sm text-muted mb-3">
                        {story.description}
                      </p>
                      
                      {/* Story Collaborators - TODO: Add collaborators to API */}
                      {/* <div className="mb-3">
                        <div className="subtext-btn-sm fw-bold mb-2">Collaborators:</div>
                        <div className="d-flex flex-wrap gap-1">
                          {story.collaborators?.map((collaborator) => (
                            <span key={collaborator.id} className={`badge bg-${getRoleColor(collaborator.role)}`}>
                              <i className={`${getRoleIcon(collaborator.role)} me-1`}></i>
                              {collaborator.first_name}
                            </span>
                          ))}
                        </div>
                      </div> */}
                      
                      <div className="d-flex gap-2 mb-3">
                        <span className={`badge ${story.is_public ? 'bg-success' : 'bg-secondary'}`}>
                          {story.is_public ? 'Public' : 'Private'}
                        </span>
                        <span className="badge bg-success">
                          approved
                        </span>
                      </div>
                      
                      <div className="text-muted subtext-btn-sm">
                        <div>Created: {new Date(story.created_at).toLocaleDateString()}</div>
                        <div>Updated: {new Date(story.updated_at).toLocaleDateString()}</div>
                        <div>
                          Seasons: {isLoadingCounts ? (
                            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                          ) : (
                            storyCounts[story.id]?.seasons || 0
                          )} | Episodes: {isLoadingCounts ? (
                            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                          ) : (
                            storyCounts[story.id]?.episodes || 0
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="card-footer bg-transparent border-0 pt-0">
                      <div className="d-flex gap-2">
                        
                        <button 
                          className="btn btn-outline-secondary subtext-btn-sm"
                          onClick={() => {
                            setMessage('Story collaboration settings opened!');
                            setMessageType('info');
                            setShowMessage(true);
                          }}
                        >
                          <i className="fas fa-users me-1"></i>Team
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-5">
              <div className="card border-0 shadow-sm">
                <div className="card-body py-5">
                  <i className="fas fa-book-open fa-4x text-muted mb-3"></i>
                  <h5 className="subtext-btn-xs text-muted mb-3">No stories yet</h5>
                  <p className="subtext-btn-sm text-muted mb-4">
                    Start creating your first collaborative story.
                  </p>
                  <ScrollAwareLink 
                    to="/immersivecomics/story/create/" 
                    className="btn btn-primary subtext-btn-sm"
                  >
                    <i className="fas fa-plus me-1"></i>Create Your First Story
                  </ScrollAwareLink>
                </div>
              </div>
              
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="d-flex justify-content-center mt-4">
                  <nav aria-label="Stories pagination">
                    <ul className="pagination">
                      <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                        <button 
                          className="page-link" 
                          onClick={handlePrevPage}
                          disabled={currentPage === 1}
                        >
                          <i className="fas fa-chevron-left"></i> Previous
                        </button>
                      </li>
                      
                      {/* Page numbers */}
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <li key={page} className={`page-item ${currentPage === page ? 'active' : ''}`}>
                          <button 
                            className="page-link" 
                            onClick={() => handlePageChange(page)}
                          >
                            {page}
                          </button>
                        </li>
                      ))}
                      
                      <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                        <button 
                          className="page-link" 
                          onClick={handleNextPage}
                          disabled={currentPage === totalPages}
                        >
                          Next <i className="fas fa-chevron-right"></i>
                        </button>
                      </li>
                    </ul>
                  </nav>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyStudio;
