import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import MessagePopup from './MessagePopup';
import { apiService } from '../services/api';
import { DRAFT_STORY_LIMIT_MESSAGE, isAtDraftStoryLimit } from '../utils/draftStoryLimit';
import './FloatingCreateStory.css';

/**
 * Standalone create-story (+) control on the Stories page.
 * Anchored to the bottom-right screen edge; larger than Feedback / Guide tabs.
 */
const FloatingActionMenu: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return !!localStorage.getItem('authToken');
  });
  const [showDraftLimit, setShowDraftLimit] = useState(false);

  useEffect(() => {
    const checkAuth = () => setIsAuthenticated(!!localStorage.getItem('authToken'));
    checkAuth();
    window.addEventListener('storage', checkAuth);
    const interval = setInterval(checkAuth, 1000);
    return () => {
      window.removeEventListener('storage', checkAuth);
      clearInterval(interval);
    };
  }, []);

  const isStoriesPage =
    location.pathname === '/immersivecomics/' || location.pathname === '/immersivecomics/dashboard/';

  if (!isStoriesPage) {
    return null;
  }

  const handleCreateStory = async () => {
    if (!isAuthenticated) return;
    try {
      const list = await apiService.getStories();
      if (isAtDraftStoryLimit(list)) {
        setShowDraftLimit(true);
        return;
      }
    } catch (err) {
      console.error('Failed to check draft story limit:', err);
    }
    navigate('/immersivecomics/story/create/');
  };

  return (
    <div className="floating-create-story">
      <MessagePopup
        message={DRAFT_STORY_LIMIT_MESSAGE}
        type="info"
        show={showDraftLimit}
        onClose={() => setShowDraftLimit(false)}
        duration={6000}
      />
      <button
        type="button"
        onClick={handleCreateStory}
        className={`floating-create-story__btn${isAuthenticated ? '' : ' floating-create-story__btn--disabled'}`}
        title={isAuthenticated ? 'Create New Story' : 'Login to create stories'}
        aria-label="Create new story"
        disabled={!isAuthenticated}
      >
        <i className="fas fa-plus floating-create-story__icon" aria-hidden />
      </button>
    </div>
  );
};

export default FloatingActionMenu;
