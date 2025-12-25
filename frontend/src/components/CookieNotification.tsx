import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const CookieNotification: React.FC = () => {
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    // Check if user has already accepted cookies
    const cookiesAccepted = localStorage.getItem('cookiesAccepted');
    if (!cookiesAccepted) {
      setShowNotification(true);
    }
  }, []);

  const handleAccept = () => {
    // Store acceptance in localStorage
    localStorage.setItem('cookiesAccepted', 'true');
    // Hide the notification
    setShowNotification(false);
  };

  if (!showNotification) {
    return null;
  }

  return (
    <div 
      className="cookies-notification font-quicksand"
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
      <p className="mb-0 subtext-btn-sm" style={{ color: '#fff', margin: 0 }}>
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

