import React from 'react';
import { render, screen } from '@testing-library/react';
import LoadingSpinner from '../LoadingSpinner';

const spinnerEl = () =>
  screen.getByTestId('loading-spinner').querySelector('.spinner-border');

describe('LoadingSpinner', () => {
  it('renders default, sized, colored, and accessible variants', () => {
    const { rerender } = render(<LoadingSpinner message="Loading data..." />);

    const spinner = screen.getByTestId('loading-spinner');
    expect(spinner.querySelector('.sr-only')).toHaveTextContent('Loading data...');
    expect(spinnerEl()).toHaveClass('spinner-border', 'text-primary');
    expect(spinnerEl()).toHaveAttribute('role', 'status');

    rerender(<LoadingSpinner size="sm" />);
    expect(spinnerEl()).toHaveClass('spinner-border-sm');

    rerender(<LoadingSpinner size="lg" />);
    expect(spinnerEl()).not.toHaveClass('spinner-border-sm');
    expect(spinnerEl()).not.toHaveClass('spinner-border-lg');

    rerender(<LoadingSpinner size="xl" />);
    expect(spinnerEl()).toHaveClass('spinner-border-lg');

    rerender(<LoadingSpinner customColor="#ff0000" />);
    expect(spinnerEl()).toHaveStyle({ borderColor: '#ff0000' });
  });
});
