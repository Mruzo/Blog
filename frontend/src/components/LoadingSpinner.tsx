import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark' | 'custom';
  className?: string;
  customColor?: string; // For custom colors
  borderWidth?: string; // Custom border width
  animationDuration?: string; // Custom animation speed
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  message = '', 
  size = 'md',
  color = 'primary',
  className = '',
  customColor = '#0d6efd', // Default to blue
  borderWidth,
  animationDuration
}) => {
  // Size classes
  const sizeClass = size === 'sm' ? 'spinner-border-sm' : 
                   size === 'lg' ? '' : 
                   size === 'xl' ? 'spinner-border-lg' : '';
  
  // Color classes (only apply if not custom)
  const colorClass = color === 'custom' ? '' : `text-${color}`;
  
  // Custom styles
  const customStyles: React.CSSProperties = {
    ...(customColor && { borderColor: customColor }),
    ...(borderWidth && { borderWidth }),
    ...(animationDuration && { animationDuration }),
  };
  
  return (
    <div className={`container text-center p-5 ${className}`} data-testid="loading-spinner">
      <div 
        className={`spinner-border ${sizeClass} ${colorClass}`} 
        role="status"
        style={customStyles}
      >
        <span 
          className="sr-only" 
          style={{
            position: 'absolute',
            width: '1px',
            height: '1px',
            padding: '0',
            margin: '-1px',
            overflow: 'hidden',
            clip: 'rect(0, 0, 0, 0)',
            whiteSpace: 'nowrap',
            border: '0'
          }}
        >
          {message}
        </span>
      </div>
    </div>
  );
};

export default LoadingSpinner;
