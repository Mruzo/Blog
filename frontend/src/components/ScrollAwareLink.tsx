import React from 'react';
import { Link } from 'react-router-dom';
import { useScrollPosition } from '../hooks/useScrollPosition';

interface ScrollAwareLinkProps {
  to: string;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}

const ScrollAwareLink: React.FC<ScrollAwareLinkProps> = ({ 
  to, 
  className, 
  children, 
  onClick 
}) => {
  console.log('ScrollAwareLink: Component rendered for path:', to);
  const { saveCurrentPosition } = useScrollPosition();

  const handleClick = (e: React.MouseEvent) => {
    console.log('ScrollAwareLink: handleClick called for path:', to);
    console.log('ScrollAwareLink: Event type:', e.type);
    console.log('ScrollAwareLink: Event:', e);
    
    // Save current scroll position for the CURRENT page (so we can return to it)
    console.log('ScrollAwareLink: Saving scroll position for current page before navigating to:', to);
    console.log('ScrollAwareLink: Current scroll position:', { x: window.scrollX, y: window.scrollY });
    
    try {
      saveCurrentPosition();
      console.log('ScrollAwareLink: saveCurrentPosition called successfully');
    } catch (error) {
      console.error('ScrollAwareLink: Error saving position:', error);
    }
    
    // Call custom onClick if provided
    if (onClick) {
      console.log('ScrollAwareLink: Calling custom onClick');
      onClick();
    }
    
    console.log('ScrollAwareLink: Letting Link handle navigation naturally');
    // Let Link handle the navigation naturally
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    console.log('ScrollAwareLink: handleTouchStart called for path:', to);
    console.log('ScrollAwareLink: Touch event:', e);
    
    // Save current scroll position for the CURRENT page (so we can return to it)
    console.log('ScrollAwareLink: Saving scroll position for current page before navigating to:', to);
    console.log('ScrollAwareLink: Current scroll position:', { x: window.scrollX, y: window.scrollY });
    
    try {
      saveCurrentPosition();
      console.log('ScrollAwareLink: saveCurrentPosition called successfully');
    } catch (error) {
      console.error('ScrollAwareLink: Error saving position:', error);
    }
    
    // Call custom onClick if provided
    if (onClick) {
      console.log('ScrollAwareLink: Calling custom onClick');
      onClick();
    }
    
    console.log('ScrollAwareLink: Letting Link handle navigation naturally');
    // Let Link handle the navigation naturally
  };

  return (
    <Link 
      to={to} 
      className={className}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
    >
      {children}
    </Link>
  );
};

export default ScrollAwareLink;
