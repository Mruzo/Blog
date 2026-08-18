import React, { useState, useContext, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import FeedbackModal from './FeedbackModal';
import { FeedbackContext } from '../contexts/FeedbackContext';
import { useGuide } from '../contexts/GuideContext';
import { getPageName, isViewerPage } from '../utils/pageNames';
import './FloatingHelpRail.css';

const FloatingFeedbackButton: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth <= 768
  );
  const location = useLocation();
  const feedbackContext = useContext(FeedbackContext);
  const { startGuide, availableGuide } = useGuide();

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const context = feedbackContext
    ? {
        storyId: feedbackContext.storyId,
        storyTitle: feedbackContext.storyTitle,
        step: feedbackContext.step,
        page: feedbackContext.page || getPageName(location.pathname),
        url: window.location.href,
      }
    : {
        page: getPageName(location.pathname),
        url: window.location.href,
      };

  const viewerPage = isViewerPage(location.pathname);
  const railClass = [
    'floating-help-rail',
    viewerPage ? 'floating-help-rail--viewer' : '',
    availableGuide ? 'floating-help-rail--has-guide' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <>
      <div className={railClass} data-testid="floating-help-rail">
        <div className="floating-help-rail__feedbackHost">
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="floating-help-rail__feedback"
            title="Send feedback"
            aria-label="Open feedback form"
          >
            {!isMobile && (
              <i className="fas fa-comment-dots floating-help-rail__feedbackIcon" aria-hidden />
            )}
            <span className="floating-help-rail__feedbackLabel">Feedback</span>
          </button>
        </div>

        {availableGuide && (
          <button
            type="button"
            onClick={() => startGuide(availableGuide.id)}
            className="floating-help-rail__guide floating-help-rail__guide--glow"
            title={`Page tip: ${availableGuide.name}`}
            aria-label={`Start guide: ${availableGuide.name}`}
          >
            <i className="fas fa-info floating-help-rail__guideIcon" aria-hidden />
          </button>
        )}
      </div>

      <FeedbackModal show={showModal} onClose={() => setShowModal(false)} context={context} />
    </>
  );
};

export default FloatingFeedbackButton;
