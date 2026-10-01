import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithRouter } from '../../testing/testHelpers';
import CookiePolicy from '../CookiePolicy';

describe('CookiePolicy', () => {
  it('covers cookie types, browser links, and contact', () => {
    renderWithRouter(<CookiePolicy />);

    expect(screen.getByText('Cookie Policy')).toBeInTheDocument();
    expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
    [
      'What are Cookies?',
      'How We Use Cookies',
      'Types of Cookies We Use',
      'Your Cookie Choices',
      'Browser-Specific Cookie Management',
      'Session Cookies',
      'Persistent Cookies',
      'Analytics Cookies',
      'Contact Us',
    ].forEach((text) => {
      expect(screen.getByText(text)).toBeInTheDocument();
    });

    [/Google Chrome/i, /Mozilla Firefox/i, /Safari/i, /Microsoft Edge/i].forEach((name) => {
      const link = screen.getByRole('link', { name });
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    expect(screen.getByRole('link', { name: /Justvybz@justvybz.com/ })).toHaveAttribute(
      'href',
      'mailto:Justvybz@justvybz.com',
    );
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});
