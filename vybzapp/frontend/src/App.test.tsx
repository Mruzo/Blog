import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

jest.mock('./contexts/ApiContext', () => ({
  ApiProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useApi: () => ({
    currentUser: null,
    authInitialized: true,
  }),
}));

jest.mock('./contexts/CartContext', () => ({
  CartProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useCart: () => ({
    cartCount: 0,
    cartInitialized: true,
  }),
}));

jest.mock('./contexts/FeedbackContext', () => ({
  FeedbackProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('./contexts/GuideContext', () => ({
  GuideProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('./components/InteractiveGuide', () => () => null);

jest.mock('./components/Layout', () => ({ children }: { children: React.ReactNode }) => <>{children}</>);

test('renders home page headline', () => {
  window.history.pushState({}, '', '/');
  render(<App />);
  expect(screen.getAllByText(/IMMERSIVE/i).length).toBeGreaterThan(0);
});
