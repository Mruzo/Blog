import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useDialogA11y } from '../hooks/useDialogA11y';

const CookieNotification: React.FC = () => {
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    // Check if user has already accepted cookies
    const cookiesAccepted = localStorage.getItem('cookiesAccepted');
    if (!cookiesAccepted) {
      setShowNotification(true);
    }
  }, []);

  const handleAccept = useCallback(() => {
    localStorage.setItem('cookiesAccepted', 'true');
    setShowNotification(false);
  }, []);

  const dialogRef = useDialogA11y(showNotification, handleAccept);

  if (!showNotification) {
    return null;
  }

  return (
    <div
      ref={dialogRef}
      className="cookies-notification font-quicksand"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cookie-notification-title"
      tabIndex={-1}
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: '#333',
        color: '#fff',
        padding: '15px 20px',
        textAlign: 'center',
        zIndex: 1001, // Above navbar (z-index 1000) but below modals
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '15px',
        flexWrap: 'wrap',
        boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.2)'
      }}
    >
      <p id="cookie-notification-title" className="mb-0 subtext-btn-sm" style={{ color: '#fff', margin: 0 }}>
        This website uses cookies to ensure you get the best experience.{' '}
        <Link to="/cookies/" className="text-warning text-decoration-underline">
          Learn more
        </Link>
      </p>
      <button
        id="accept-cookie"
        className="btn btn-primary subtext-btn-sm"
        onClick={handleAccept}
        style={{
          backgroundColor: '#414042',
          borderColor: '#414042',
          color: '#fff',
          whiteSpace: 'nowrap'
        }}
      >
        Accept
      </button>
    </div>
  );
};

export default CookieNotification;
