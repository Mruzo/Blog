import React, { useState, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import FeedbackModal from './FeedbackModal';
import { FeedbackContext } from '../contexts/FeedbackContext';

const FloatingFeedbackButton: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const location = useLocation();
  const feedbackContext = useContext(FeedbackContext);

  const handleOpenModal = () => {
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

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

  const isStoriesPage =
    location.pathname === '/immersivecomics/' || location.pathname === '/immersivecomics/dashboard/';

  const buttonStyle = isStoriesPage
    ? ({
        position: 'fixed' as const,
        bottom: '90px',
        right: '0',
        zIndex: 1030,
        borderRadius: '50%',
        width: '40px',
        height: '40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFBC00',
        borderColor: '#FFBC00',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        transition: 'all 0.3s ease',
        cursor: 'pointer',
      } as const)
    : ({
        position: 'fixed' as const,
        bottom: '20px',
        right: '0',
        zIndex: 1030,
        borderRadius: '50%',
        width: '40px',
        height: '40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFBC00',
        borderColor: '#FFBC00',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        transition: 'all 0.3s ease',
        cursor: 'pointer',
      } as const);

  return (
    <>
      <button
        onClick={handleOpenModal}
        className="btn btn-warning shadow-lg floating-feedback-btn"
        style={buttonStyle}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)';
          e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.2)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
        }}
        title="Need Help? Send Feedback"
        aria-label="Open feedback form"
      >
        <i className="fas fa-question-circle" style={{ fontSize: '22px', color: '#000' }}></i>
      </button>

      <FeedbackModal show={showModal} onClose={handleCloseModal} context={context} />
    </>
  );
};

const getPageName = (pathname: string): string => {
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
  if (pathname === '/product/') return 'Product Store';
  if (pathname === '/product/cart/') return 'Shopping Cart';
  if (pathname.includes('/product/cart/checkout')) return 'Checkout';
  if (pathname.includes('/product/cart/shipping/')) return 'Select Shipping';
  if (pathname.includes('/product/payment/success')) return 'Payment Success';
  if (pathname === '/product/my-orders/') return 'My Orders';
  if (pathname.includes('/product/order/')) return 'Order Detail';
  if (pathname === '/login/') return 'Login';
  if (pathname === '/register/') return 'Register';
  if (pathname.includes('/password-reset/')) return 'Password Reset';
  if (pathname.includes('/password-reset-confirm/')) return 'Password Reset Confirm';
  if (pathname.includes('/password-reset-complete/')) return 'Password Reset Complete';
  if (pathname === '/contact/') return 'Contact';

  const segments = pathname.split('/').filter((s) => s);
  if (segments.length > 0) {
    const lastSegment = segments[segments.length - 1];
    return lastSegment
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  return 'Unknown Page';
};

export default FloatingFeedbackButton;
