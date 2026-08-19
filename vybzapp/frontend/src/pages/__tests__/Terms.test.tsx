import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithRouter } from '../../testing/testHelpers';
import Terms from '../Terms';

describe('Terms', () => {
  it('renders the terms of service page', () => {
    renderWithRouter(<Terms />);
    expect(screen.getByText('Terms of Service')).toBeInTheDocument();
    expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
  });

  it('includes core policy sections', () => {
    renderWithRouter(<Terms />);
    expect(screen.getByText(/Platform Overview/i)).toBeInTheDocument();
    expect(screen.getByText(/Account Registration/i)).toBeInTheDocument();
    expect(screen.getByText(/User-Generated Content/i)).toBeInTheDocument();
  });

  it('displays contact email link', () => {
    renderWithRouter(<Terms />);
    const emailLink = screen.getByRole('link', { name: /Justvybz@justvybz.com/i });
    expect(emailLink).toHaveAttribute('href', 'mailto:Justvybz@justvybz.com');
  });
});
