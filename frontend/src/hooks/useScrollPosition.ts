import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

interface ScrollPosition {
  x: number;
  y: number;
}

// Store scroll positions in sessionStorage
const SCROLL_POSITIONS_KEY = 'scrollPositions';

export const useScrollPosition = () => {
  const location = useLocation();
  const scrollPositions = useRef<Map<string, ScrollPosition>>(new Map());
  
  console.log('useScrollPosition: Hook initialized for path:', location.pathname);

  // Load scroll positions from sessionStorage on mount
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(SCROLL_POSITIONS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        scrollPositions.current = new Map(Object.entries(parsed));
      }
    } catch (error) {
      console.warn('Failed to load scroll positions:', error);
    }
  }, []);

  // Save scroll position when component unmounts or location changes
  useEffect(() => {
    const saveScrollPosition = () => {
      const currentPosition: ScrollPosition = {
        x: window.scrollX,
        y: window.scrollY
      };
      
      scrollPositions.current.set(location.pathname, currentPosition);
      
      try {
        const serialized = Object.fromEntries(scrollPositions.current);
        sessionStorage.setItem(SCROLL_POSITIONS_KEY, JSON.stringify(serialized));
      } catch (error) {
        console.warn('Failed to save scroll position:', error);
      }
    };

    // Save current position before navigation
    return () => {
      saveScrollPosition();
    };
  }, [location.pathname]);

  // Restore scroll position when component mounts
  useEffect(() => {
    const savedPosition = scrollPositions.current.get(location.pathname);
    console.log('useScrollPosition: Checking for saved position for', location.pathname, ':', savedPosition);
    console.log('useScrollPosition: All saved positions in memory:', Array.from(scrollPositions.current.entries()));
    
    // Also check sessionStorage directly
    try {
      const sessionData = sessionStorage.getItem('scrollPositions');
      console.log('useScrollPosition: SessionStorage data:', sessionData);
      if (sessionData) {
        const parsed = JSON.parse(sessionData);
        console.log('useScrollPosition: Parsed sessionStorage:', parsed);
        console.log('useScrollPosition: Position for current path in sessionStorage:', parsed[location.pathname]);
      }
    } catch (error) {
      console.error('useScrollPosition: Error reading sessionStorage:', error);
    }
    
    if (savedPosition) {
      console.log('useScrollPosition: Restoring scroll position to:', savedPosition);
      // Use multiple requestAnimationFrame calls to ensure DOM is ready and other effects have run
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.scrollTo(savedPosition.x, savedPosition.y);
          console.log('useScrollPosition: Scroll position restored to:', { x: window.scrollX, y: window.scrollY });
        });
      });
    } else {
      console.log('useScrollPosition: No saved position found for', location.pathname);
    }
    // Don't scroll to top if no saved position - let the page handle its own scroll
  }, [location.pathname]);

  // Function to manually save current scroll position
  const saveCurrentPosition = () => {
    const currentPosition: ScrollPosition = {
      x: window.scrollX,
      y: window.scrollY
    };
    
    console.log('useScrollPosition: Saving position for', location.pathname, ':', currentPosition);
    scrollPositions.current.set(location.pathname, currentPosition);
    
    try {
      const serialized = Object.fromEntries(scrollPositions.current);
      sessionStorage.setItem(SCROLL_POSITIONS_KEY, JSON.stringify(serialized));
      console.log('useScrollPosition: Saved to sessionStorage:', serialized);
    } catch (error) {
      console.warn('Failed to save scroll position:', error);
    }
  };

  // Function to clear scroll position for current path
  const clearCurrentPosition = () => {
    scrollPositions.current.delete(location.pathname);
    
    try {
      const serialized = Object.fromEntries(scrollPositions.current);
      sessionStorage.setItem(SCROLL_POSITIONS_KEY, JSON.stringify(serialized));
    } catch (error) {
      console.warn('Failed to clear scroll position:', error);
    }
  };

  // Function to clear all scroll positions
  const clearAllPositions = () => {
    scrollPositions.current.clear();
    try {
      sessionStorage.removeItem(SCROLL_POSITIONS_KEY);
    } catch (error) {
      console.warn('Failed to clear all scroll positions:', error);
    }
  };

  return {
    saveCurrentPosition,
    clearCurrentPosition,
    clearAllPositions
  };
};
