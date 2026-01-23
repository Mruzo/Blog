import React, { useState, useContext, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import FeedbackModal from './FeedbackModal';
import { FeedbackContext } from '../contexts/FeedbackContext';

const FloatingActionMenu: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const feedbackContext = useContext(FeedbackContext);
  
  // Track authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const token = localStorage.getItem('authToken');
    return !!token;
  });

  // Listen for token changes
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('authToken');
      setIsAuthenticated(!!token);
    };

    checkAuth();
    window.addEventListener('storage', checkAuth);
    const interval = setInterval(checkAuth, 1000);

    return () => {
      window.removeEventListener('storage', checkAuth);
      clearInterval(interval);
    };
  }, []);

  const handleOpenModal = () => {
    setShowModal(true);
    setIsExpanded(false); // Close menu when opening modal
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const handleCreateStory = () => {
    if (isAuthenticated) {
      navigate('/immersivecomics/story/create/');
    }
    setIsExpanded(false);
  };

  // Build context from FeedbackContext and current location
  const context = feedbackContext ? {
    storyId: feedbackContext.storyId,
    storyTitle: feedbackContext.storyTitle,
    step: feedbackContext.step,
    page: feedbackContext.page || getPageName(location.pathname),
    url: window.location.href
  } : {
    page: getPageName(location.pathname),
    url: window.location.href
  };

  // Check if we're on the Stories page
  const isStoriesPage = location.pathname === '/immersivecomics/' || 
                        location.pathname === '/immersivecomics/dashboard/';

  // Determine positioning based on screen size
  const isMobile = window.innerWidth <= 768;
  
  const getMenuStyle = () => {
    if (isMobile) {
      // Mobile: position behind navbar, 1/3 visible, at 2/3 of navbar width
      // Button is 60px tall: 20px visible above navbar (at bottom: 0), 40px hidden behind
      return {
        position: 'fixed' as const,
        bottom: '20px', // Only 20px (1/3) visible above navbar, 40px hidden behind
        left: '66.67%', // Position at 2/3 of navbar width from left (rising sun effect)
        transform: 'translateX(-50%)', // Center the button horizontally at the 66.67% position
        zIndex: 999, // Behind navbar (z-index 1000)
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center' as const,
        gap: '12px',
        opacity: 0.8 // 80% opacity
      };
    }
    // Desktop: positioned 65% from the left
    return {
      position: 'fixed' as const,
      bottom: '30px',
      left: '90%',
      transform: 'translateX(-50%)', // Center the button at the 65% position
      zIndex: 1030,
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center' as const,
      gap: '12px'
    };
  };

  return (
    <>
      <div 
        className="floating-action-menu"
        style={getMenuStyle()}
        onMouseEnter={() => !isMobile && setIsExpanded(true)}
        onMouseLeave={() => !isMobile && setIsExpanded(false)}
      >
        {/* Expanded Menu Items */}
        {isExpanded && (
          <div 
            className="fab-menu-items"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              marginBottom: '8px',
              animation: 'fadeInUp 0.3s ease-out'
            }}
          >
            {/* Feedback Button */}
            <button
              onClick={handleOpenModal}
              className="btn btn-warning shadow-lg fab-menu-item"
              style={{
                borderRadius: '50%',
                width: '50px',
                height: '50px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#FFBC00',
                borderColor: '#FFBC00',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                border: 'none'
              }}
              title="Need Help? Send Feedback"
              aria-label="Open feedback form"
            >
              <i className="fas fa-question-circle" style={{ fontSize: '24px', color: '#000' }}></i>
            </button>

            {/* Create Story Button (only show on Stories page) */}
            {isStoriesPage && (
              <button
                onClick={handleCreateStory}
                className="btn btn-primary shadow-lg fab-menu-item"
                style={{
                  borderRadius: '50%',
                  width: '50px',
                  height: '50px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isAuthenticated ? '#111e7f' : '#6c757d',
                  borderColor: isAuthenticated ? '#111e7f' : '#6c757d',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                  transition: 'all 0.3s ease',
                  cursor: isAuthenticated ? 'pointer' : 'not-allowed',
                  border: 'none',
                  opacity: isAuthenticated ? 1 : 0.6
                }}
                title={isAuthenticated ? "Create New Story" : "Login to create stories"}
                aria-label="Create new story"
                disabled={!isAuthenticated}
              >
                <i className="fas fa-plus" style={{ fontSize: '24px', color: '#fff' }}></i>
              </button>
            )}
          </div>
        )}

        {/* Main Toggle Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`btn btn-primary shadow-lg fab-main-button ${isExpanded ? 'expanded' : ''}`}
          style={{
            borderRadius: '50%',
            width: isExpanded ? '56px' : '60px',
            height: isExpanded ? '56px' : '60px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#111e7f',
            borderColor: '#111e7f',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
            transition: 'all 0.3s ease',
            cursor: 'pointer',
            border: 'none',
            transform: isExpanded ? 'rotate(45deg)' : 'rotate(0deg)'
          }}
          title={isExpanded ? "Close menu" : "Open menu"}
          aria-label="Toggle action menu"
        >
          <i 
            key={isMobile ? (isExpanded ? 'chevron-down' : 'chevron-up') : 'plus'}
            className={`fas ${isMobile ? (isExpanded ? 'fa-chevron-down' : 'fa-chevron-up') : 'fa-plus'} fab-main-icon`}
            style={{ 
              fontSize: '28px',
              color: '#fff', 
              transition: 'transform 0.3s ease'
            }}
          ></i>
        </button>
      </div>

      <FeedbackModal show={showModal} onClose={handleCloseModal} context={context} />

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
           
          }
          to {
            opacity: 1;
          
          }
        }

        .fab-menu-item {
          animation: fadeInUp 0.3s ease-out;
        }

        .fab-menu-item:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25) !important;
        }

        .fab-main-button:hover {
          transform: ${isExpanded ? 'rotate(45deg) scale(2.05)' : 'rotate(0deg) scale(2.05)'};
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3) !important;
        }

        /* Mobile adjustments - button positioned behind navbar */
        @media (max-width: 768px) {
          .floating-action-menu {
            bottom: 10px !important; /* Only 10px (1/3 of 60px) visible above navbar */
            left: 90% !important; /* Position at 2/3 of navbar width from left */
            transform: translateX(-50%) !important; /* Center button at the 66.67% position */
            z-index: 999 !important; /* Behind navbar (z-index 1000) */
            opacity: 0.9 !important; /* 80% opacity */
          }
          
          /* When expanded on mobile, menu items should appear above navbar */
          .floating-action-menu .fab-menu-items {
            z-index: 1001 !important; /* Above navbar for accessibility */
            margin-bottom: 10px !important; /* Space above navbar */
          }
          
          /* Ensure button maintains color and styling on mobile */
          .fab-main-button {
            background-color: #111e7f !important;
            border-color: #111e7f !important;
            opacity: 0.9 !important; /* 90% opacity */
            padding-top: 20px !important; /* Move icon up to fit in visible 1/3 */
            justify-content: center !important; /* Ensure horizontal centering */
            align-items: center !important; /* Ensure vertical alignment */
          }
          
          /* Prevent button rotation on mobile */
          .fab-main-button,
          .fab-main-button.expanded {
            transform: none !important; /* No rotation on mobile */
          }
          
          /* Smaller icon on mobile, positioned in visible portion */
          .fab-main-button .fab-main-icon {
            font-size: 14px !important; /* Reduced from 28px */
            transform: translateY(-24px) translateX(0) !important; /* Move icon higher and ensure horizontal centering */
            transform-origin: center !important; /* Rotate about icon's center if needed */
            display: block !important; /* Ensure proper centering */
            margin: 0 auto !important; /* Center horizontally */
            animation: fadeIn 0.3s ease !important; /* Fade in animation when icon changes (key prop triggers remount) */
          }
          
          /* When button is expanded on mobile, maintain same styling */
          .fab-main-button.expanded .fab-main-icon {
            transform: translateY(-24px) translateX(0) !important; /* Keep position, no rotation */
          }
        }
      `}</style>
    </>
  );
};

// Helper function to get a readable page name from pathname
const getPageName = (pathname: string): string => {
  // Immersive Comics routes
  if (pathname === '/' || pathname === '/home') return 'Home';
  if (pathname === '/immersivecomics/' || pathname === '/immersivecomics/dashboard/') return 'Stories';
  if (pathname.includes('/immersivecomics/story/create')) return 'Story Creation';
  if (pathname.includes('/immersivecomics/story/') && pathname.includes('/manage')) return 'Story Management';
  if (pathname.includes('/immersivecomics/story/') && pathname.includes('/edit')) return 'Story Edit';
  if (pathname.includes('/immersivecomics/story/') && pathname.includes('/characters')) return 'Character Management';
  if (pathname.includes('/immersivecomics/story/') && pathname.includes('/collaborators')) return 'Story Collaborators';
  if (pathname.includes('/immersivecomics/story/') && pathname.includes('/season/create')) return 'Season Creation';
  if (pathname.includes('/immersivecomics/season/') && pathname.includes('/edit')) return 'Season Edit';
  if (pathname.includes('/immersivecomics/season/') && pathname.includes('/episodes')) return 'Episode Management';
  if (pathname === '/immersivecomics/my-studio/') return 'My Studio';
  if (pathname.includes('/immersivecomics/studios/')) return 'Studios';
  if (pathname.includes('/immersivecomics/studio/') && pathname.includes('/edit')) return 'Studio Edit';
  if (pathname.includes('/immersivecomics/import/')) return 'Story Import';
  if (pathname.includes('/studios/') && !pathname.includes('/edit')) return 'Studio Detail';
  
  // Product/Store routes
  if (pathname === '/product/') return 'Product Store';
  if (pathname === '/product/cart/') return 'Shopping Cart';
  if (pathname.includes('/product/cart/checkout')) return 'Checkout';
  if (pathname.includes('/product/cart/shipping/')) return 'Select Shipping';
  if (pathname.includes('/product/payment/success')) return 'Payment Success';
  if (pathname === '/product/my-orders/') return 'My Orders';
  if (pathname.includes('/product/order/')) return 'Order Detail';
  
  // Authentication routes
  if (pathname === '/login/') return 'Login';
  if (pathname === '/register/') return 'Register';
  if (pathname.includes('/password-reset/')) return 'Password Reset';
  if (pathname.includes('/password-reset-confirm/')) return 'Password Reset Confirm';
  if (pathname.includes('/password-reset-complete/')) return 'Password Reset Complete';
  
  // Other routes
  if (pathname === '/contact/') return 'Contact';
  
  // Fallback: try to extract meaningful name from path
  const segments = pathname.split('/').filter(s => s);
  if (segments.length > 0) {
    const lastSegment = segments[segments.length - 1];
    // Capitalize and format the last segment
    return lastSegment
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  
  return 'Unknown Page';
};

export default FloatingActionMenu;

