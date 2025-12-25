import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

/**
 * Renders a React component wrapped in BrowserRouter for testing
 * @param component - The React component to render
 * @param options - Additional render options
 */
export const renderWithRouter = (
  component: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>,
    options
  );
};

// Re-export screen and other testing utilities for convenience
export { screen, fireEvent, waitFor } from '@testing-library/react';

