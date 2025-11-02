import React from 'react';
import { render, screen } from '@testing-library/react';
import LoadingSpinner from '../LoadingSpinner';

describe('LoadingSpinner', () => {
  it('should render with default blue color', () => {
    render(<LoadingSpinner />);
    
    const spinner = screen.getByTestId('loading-spinner');
    expect(spinner).toBeInTheDocument();
    
    // Check that the spinner has the correct classes
    const spinnerElement = spinner.querySelector('.spinner-border');
    expect(spinnerElement).toHaveClass('spinner-border');
    expect(spinnerElement).toHaveClass('text-primary');
  });

  it('should render with custom message', () => {
    render(<LoadingSpinner message="Loading data..." />);
    
    const spinner = screen.getByTestId('loading-spinner');
    const hiddenText = spinner.querySelector('.sr-only');
    expect(hiddenText).toHaveTextContent('Loading data...');
  });

  it('should render with different sizes', () => {
    const { rerender } = render(<LoadingSpinner size="sm" />);
    let spinnerElement = screen.getByTestId('loading-spinner').querySelector('.spinner-border');
    expect(spinnerElement).toHaveClass('spinner-border-sm');

    rerender(<LoadingSpinner size="lg" />);
    spinnerElement = screen.getByTestId('loading-spinner').querySelector('.spinner-border');
    expect(spinnerElement).not.toHaveClass('spinner-border-sm');
    expect(spinnerElement).not.toHaveClass('spinner-border-lg');

    rerender(<LoadingSpinner size="xl" />);
    spinnerElement = screen.getByTestId('loading-spinner').querySelector('.spinner-border');
    expect(spinnerElement).toHaveClass('spinner-border-lg');
  });

  it('should use blue color by default', () => {
    render(<LoadingSpinner />);
    
    const spinnerElement = screen.getByTestId('loading-spinner').querySelector('.spinner-border');
    // The color should be applied via CSS, but we can check the class
    expect(spinnerElement).toHaveClass('text-primary');
  });

  it('should apply custom color when provided', () => {
    render(<LoadingSpinner customColor="#ff0000" />);
    
    const spinnerElement = screen.getByTestId('loading-spinner').querySelector('.spinner-border');
    expect(spinnerElement).toHaveStyle({ borderColor: '#ff0000' });
  });

  it('should have proper accessibility attributes', () => {
    render(<LoadingSpinner message="Loading content..." />);
    
    const spinnerElement = screen.getByTestId('loading-spinner').querySelector('.spinner-border');
    expect(spinnerElement).toHaveAttribute('role', 'status');
    
    const hiddenText = screen.getByTestId('loading-spinner').querySelector('.sr-only');
    expect(hiddenText).toHaveTextContent('Loading content...');
  });
});
