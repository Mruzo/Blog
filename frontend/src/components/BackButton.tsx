import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useScrollPosition } from '../hooks/useScrollPosition';

interface BackButtonProps {
  to: string;
  autoLabel?: boolean;
  customLabel?: string;
  variant?: 'primary' | 'secondary' | 'outline-primary' | 'outline-secondary' | 'outline-danger';
  className?: string;
  icon?: string;
  size?: 'sm' | 'md' | 'lg';
}

const BackButton: React.FC<BackButtonProps> = ({ 
  to, 
  autoLabel = true, 
  customLabel,
  variant = 'outline-secondary',
  className = '',
  icon = 'fas fa-arrow-left',
  size = 'md'
}) => {
  const navigate = useNavigate();
  const { saveCurrentPosition } = useScrollPosition();
  
  // Auto-generate label from path
  const getAutoLabel = (path: string): string => {
    const pathMap: Record<string, string> = {
      '/immersivecomics/': 'Stories',
      '/product/cart/': 'Cart',
      '/product/': 'Products',
      '/': 'Home'
    };
    
    // Check for story management paths
    if (path.includes('/story/') && path.includes('/manage/')) {
      return 'Back to Story';
    }
    if (path.includes('/story/') && path.includes('/edit/')) {
      return 'Back to Edit';
    }
    if (path.includes('/story/') && path.includes('/create/')) {
      return 'Back to Stories';
    }
    if (path.includes('/season/') && path.includes('/create/')) {
      return 'Back to Story';
    }
    if (path.includes('/episode/') && path.includes('/create/')) {
      return 'Back to Season';
    }
    
    // Check for product-related paths
    if (path.includes('/product/checkout/')) {
      return 'Back to Cart';
    }
    if (path.includes('/product/shipping/')) {
      return 'Back to Checkout';
    }
    if (path.includes('/product/payment/')) {
      return 'Back to Shipping';
    }
    
    // Default fallback
    return pathMap[path] || 'Back';
  };
  
  const label = customLabel || (autoLabel ? getAutoLabel(to) : 'Back');
  
  // Size classes
  const sizeClass = size === 'sm' ? 'btn-sm' : size === 'lg' ? 'btn-lg' : '';
  
  const handleClick = () => {
    // Save current scroll position before navigating
    saveCurrentPosition();
    // Navigate to the target page
    navigate(to);
  };

  return (
    <button 
      className={`btn btn-${variant} ${sizeClass} ${className}`.trim()}
      onClick={handleClick}
    >
      <i className={`${icon} me-1`}></i>{label}
    </button>
  );
};

export default BackButton;

