import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useScrollPosition } from '../hooks/useScrollPosition';

interface BackButtonProps {
  to?: string; // Deprecated: kept for backward compatibility, but always uses browser history
  variant?: 'primary' | 'secondary' | 'outline-primary' | 'outline-secondary' | 'outline-danger';
  className?: string;
  icon?: string;
  size?: 'sm' | 'md' | 'lg';
}

const BackButton: React.FC<BackButtonProps> = ({ 
  to, // Deprecated: kept for backward compatibility but not used
  variant = 'outline-secondary',
  className = '',
  icon = 'fas fa-arrow-left',
  size = 'md'
}) => {
  const navigate = useNavigate();
  const { saveCurrentPosition } = useScrollPosition();
  
  // Size classes
  const sizeClass = size === 'sm' ? 'btn-sm' : size === 'lg' ? 'btn-lg' : '';
  
  const handleClick = () => {
    // Save current scroll position before navigating
    saveCurrentPosition();
    
    // Always go back in browser history (like browser's back button)
    // This will take the user to the previous page they visited
    navigate(-1);
  };

  return (
    <button 
      className={`btn btn-${variant} ${sizeClass} ${className}`.trim()}
      onClick={handleClick}
      style={{ padding: '0.1rem 0.4rem' }}
    >
      <i className={`${icon} me-1`}></i>     </button>
  );
};

export default BackButton;

