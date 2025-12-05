import React, { useEffect } from 'react';

interface MessagePopupProps {
  message: string;
  type: 'success' | 'danger' | 'warning' | 'info';
  show: boolean;
  onClose: () => void;
  duration?: number; // Auto-hide duration in milliseconds (0 = no auto-hide)
  position?: 'top' | 'center' | 'bottom';
  className?: string;
}

const MessagePopup: React.FC<MessagePopupProps> = ({
  message,
  type,
  show,
  onClose,
  duration = 3000, // Default 3 seconds
  position = 'top',
  className = ''
}) => {
  // Auto-hide functionality
  useEffect(() => {
    if (show && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [show, duration, onClose]);

  // Don't render if not showing
  if (!show) return null;

  // Position styles
  const positionStyles: React.CSSProperties = {
    position: 'fixed',
    left: '10%',
    width: '80%',
    zIndex: 1050,
    margin: 0,
    borderRadius: 0,
  };

  // Add position-specific styles
  switch (position) {
    case 'top':
      // Position below navbar (navbar ~60px + nav buttons ~50px = ~110px, add small margin)
      positionStyles.top = 120;
      break;
    case 'center':
      positionStyles.top = '50%';
      positionStyles.transform = 'translateY(-50%)';
      break;
    case 'bottom':
      positionStyles.bottom = 20;
      break;
  }

  return (
    <div
      className={`alert alert-${type} subtext-sm text-center ${className}`}
      style={positionStyles}
      role="alert"
    >
      <div className="d-flex justify-content-between align-items-center">
        <span>{message}</span>
        <button
          type="button"
          className="btn btn-link p-0"
          aria-label="Close"
          onClick={onClose}
          style={{ 
            marginLeft: '10px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            color: 'inherit',
            opacity: 0.8,
            transition: 'opacity 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '0.8'}
        >
          <i className="fas fa-times" style={{ fontSize: '1.5rem' }}></i>
        </button>
      </div>
    </div>
  );
};

export default MessagePopup;









