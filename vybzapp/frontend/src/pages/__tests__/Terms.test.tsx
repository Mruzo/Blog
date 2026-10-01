import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithRouter } from '../../testing/testHelpers';
import Terms from '../Terms';

describe('Terms', () => {
  it('covers the terms page, core sections, and contact email', () => {
    renderWithRouter(<Terms />);

    expect(screen.getByText('Terms of Service')).toBeInTheDocument();
    expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
    ['Platform Overview', 'Account Registration', 'User-Generated Content'].forEach((section) => {
      expect(screen.getByText(new RegExp(section, 'i'))).toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: /Justvybz@justvybz.com/i })).toHaveAttribute(
      'href',
      'mailto:Justvybz@justvybz.com',
    );
  });
});
