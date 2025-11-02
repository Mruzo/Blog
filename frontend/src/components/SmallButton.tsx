import React from 'react';
import { Link } from 'react-router-dom';

interface SmallButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline-primary' | 'outline-secondary' | 'outline-danger' | 'success' | 'danger' | 'warning' | 'info';
  onClick?: (e?: React.MouseEvent) => void;
  to?: string;
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  size?: 'sm' | 'md' | 'lg';
}

const SmallButton: React.FC<SmallButtonProps> = ({ 
  children, 
  variant = 'primary', 
  onClick, 
  to, 
  className = '', 
  disabled = false,
  type = 'button',
  size = 'sm'
}) => {
  const baseClasses = `btn btn-${variant} btn-${size} subtext-btn-sm small-button-icon`;
  const customStyles = { 
    padding: '0.3rem 0.5rem', 
    fontSize: '0.8rem',
    whiteSpace: 'nowrap',
    fontWeight: '900',
  } as React.CSSProperties;
  
  if (to) {
    return (
      <Link to={to} className={`${baseClasses} ${className}`} style={customStyles}>
        {children}
      </Link>
    );
  }

  return (
    <button
      className={`${baseClasses} ${className}`}
      style={customStyles}
      onClick={onClick}
      disabled={disabled}
      type={type}
    >
      {children}
    </button>
  );
};

export default SmallButton;
