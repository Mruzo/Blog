import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithRouter, policyPageTestHelpers } from '../../__tests__/testUtils';
import Privacy from '../Privacy';

describe('Privacy', () => {
  beforeEach(() => {
    renderWithRouter(<Privacy />);
  });

  test('renders the privacy policy page with title', () => {
    expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
  });

  test('displays last updated date', () => {
    expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
  });

  test('displays all main sections', () => {
    const sections = [
      'Information We Collect',
      'How We Use Your Information',
      'Information Sharing',
      'Data Security',
      'Your Rights'
    ];
    
    sections.forEach(section => {
      expect(screen.getByText(section)).toBeInTheDocument();
    });
    
    expect(screen.getByText(/Account Information:/)).toBeInTheDocument();
  });

  test('displays contact information with email link', () => {
    expect(screen.getByText('Contact Us')).toBeInTheDocument();
    const emailLink = screen.getByRole('link', { name: /Justvybz@justvybz.com/ });
    expect(emailLink).toBeInTheDocument();
    expect(emailLink).toHaveAttribute('href', 'mailto:Justvybz@justvybz.com');
  });

  test('displays contact page link', () => {
    const contactLink = screen.getByRole('link', { name: /www.justvybz.com\/contact/ });
    expect(contactLink).toBeInTheDocument();
    expect(contactLink).toHaveAttribute('href', '/contact/');
  });

  test('displays back button', () => {
    const backButton = screen.getByRole('button');
    expect(backButton).toBeInTheDocument();
  });
});

