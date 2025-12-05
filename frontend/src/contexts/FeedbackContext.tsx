import React, { createContext, useState, ReactNode } from 'react';

interface FeedbackContextType {
  storyId?: number;
  storyTitle?: string;
  step?: string;
  page?: string;
  setContext: (context: Partial<FeedbackContextType>) => void;
  clearContext: () => void;
}

export const FeedbackContext = createContext<FeedbackContextType | null>(null);

interface FeedbackProviderProps {
  children: ReactNode;
}

export const FeedbackProvider: React.FC<FeedbackProviderProps> = ({ children }) => {
  const [context, setContextState] = useState<Partial<FeedbackContextType>>({});

  const setContext = (newContext: Partial<FeedbackContextType>) => {
    setContextState(prev => ({ ...prev, ...newContext }));
  };

  const clearContext = () => {
    setContextState({});
  };

  return (
    <FeedbackContext.Provider value={{
      ...context,
      setContext,
      clearContext
    }}>
      {children}
    </FeedbackContext.Provider>
  );
};

