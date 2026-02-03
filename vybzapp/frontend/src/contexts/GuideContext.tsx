import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { guides, GuideConfig, findGuideByRoute } from '../config/guides';

interface GuideContextType {
  currentGuide: GuideConfig | null;
  isRunning: boolean;
  startGuide: (guideId: string) => void;
  stopGuide: () => void;
  hasSeenGuide: (guideId: string) => boolean;
  markGuideAsSeen: (guideId: string) => void;
  availableGuide: GuideConfig | null;
}

const GuideContext = createContext<GuideContextType | null>(null);

export const GuideProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const location = useLocation();
  const [currentGuide, setCurrentGuide] = useState<GuideConfig | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  // Check if user has seen a guide
  const hasSeenGuide = (guideId: string): boolean => {
    const seen = localStorage.getItem(`guide_seen_${guideId}`);
    return seen === 'true';
  };

  // Mark guide as seen
  const markGuideAsSeen = (guideId: string): void => {
    localStorage.setItem(`guide_seen_${guideId}`, 'true');
  };

  // Start a guide
  const startGuide = (guideId: string): void => {
    const guide = guides.find(g => g.id === guideId);
    if (guide) {
      // Validate that we're on the correct page for this guide
      const currentPath = location.pathname;
      const guideRoute = guide.route;
      
      const isOnCorrectPage = currentPath === guideRoute ||
        (guide.pathContains && currentPath.startsWith(guideRoute) && currentPath.includes(guide.pathContains)) ||
        (guideRoute.endsWith('/') && (currentPath === guideRoute || currentPath === guideRoute.slice(0, -1))) ||
        (!guideRoute.endsWith('/') && currentPath.startsWith(guideRoute + '/'));
      
      if (!isOnCorrectPage) {
        console.warn(`[Guide] Cannot start guide "${guide.name}" - not on correct page. Current: ${currentPath}, Required: ${guideRoute}`);
        return;
      }
      
      setCurrentGuide(guide);
      setIsRunning(true);
    }
  };

  // Stop current guide
  const stopGuide = (): void => {
    setIsRunning(false);
    if (currentGuide?.showOnce) {
      markGuideAsSeen(currentGuide.id);
    }
    setCurrentGuide(null);
  };

  // Find available guide for current route
  const availableGuide = findGuideByRoute(location.pathname) || null;

  // Auto-trigger guides on route change
  useEffect(() => {
    const matchingGuide = findGuideByRoute(location.pathname);
    
    if (matchingGuide) {
      // Check if should auto-show
      if (matchingGuide.showOnFirstVisit && !hasSeenGuide(matchingGuide.id)) {
        // Small delay to ensure page is rendered
        const timer = setTimeout(() => {
          startGuide(matchingGuide.id);
        }, 800);
        
        return () => clearTimeout(timer);
      }
    }
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <GuideContext.Provider value={{
      currentGuide,
      isRunning,
      startGuide,
      stopGuide,
      hasSeenGuide,
      markGuideAsSeen,
      availableGuide,
    }}>
      {children}
    </GuideContext.Provider>
  );
};

export const useGuide = () => {
  const context = useContext(GuideContext);
  if (!context) {
    throw new Error('useGuide must be used within GuideProvider');
  }
  return context;
};
