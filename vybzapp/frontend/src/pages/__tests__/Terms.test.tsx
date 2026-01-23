import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithRouter } from '../../__tests__/testUtils';
import Terms from '../Terms';

describe('Terms', () => {
  beforeEach(() => {
    renderWithRouter(<Terms />);
  });

  test('renders the terms of service page with title', () => {
    expect(screen.getByText('Terms of Service')).toBeInTheDocument();
  });

  test('displays last updated date', () => {
    expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
  });

  test('displays all main sections', () => {
    const sections = [
      '1. Platform Overview',
      '2. Account Registration',
      '3. User-Generated Content',
      '4. Content Guidelines',
      '5. Collaboration Features',
      '6. E-Commerce Terms (If Applicable)',
      '7. Intellectual Property',
      '8. Prohibited Activities'
    ];
    
    sections.forEach(section => {
      expect(screen.getByText(section)).toBeInTheDocument();
    });
  });

  test('displays contact information with email link', () => {
    expect(screen.getByText('13. Contact Information')).toBeInTheDocument();
    const emailLink = screen.getByRole('link', { name: /Justvybz@justvybz.com/ });
    expect(emailLink).toBeInTheDocument();
    expect(emailLink).toHaveAttribute('href', 'mailto:Justvybz@justvybz.com');
  });

  test('displays back button', () => {
    const backButton = screen.getByRole('button');
    expect(backButton).toBeInTheDocument();
  });
});

