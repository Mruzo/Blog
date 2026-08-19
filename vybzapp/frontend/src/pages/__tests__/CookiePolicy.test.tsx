import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithRouter } from '../../testing/testHelpers';
import CookiePolicy from '../CookiePolicy';

describe('CookiePolicy', () => {
  beforeEach(() => {
    renderWithRouter(<CookiePolicy />);
  });

  test('renders the cookie policy page with title', () => {
    expect(screen.getByText('Cookie Policy')).toBeInTheDocument();
  });

  test('displays last updated date', () => {
    expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
  });

  test('displays all main sections', () => {
    const sections = [
      'What are Cookies?',
      'How We Use Cookies',
      'Types of Cookies We Use',
      'Your Cookie Choices',
      'Browser-Specific Cookie Management'
    ];
    
    sections.forEach(section => {
      expect(screen.getByText(section)).toBeInTheDocument();
    });
  });

  test('displays cookie types table', () => {
    const cookieTypes = ['Session Cookies', 'Persistent Cookies', 'Analytics Cookies'];
    cookieTypes.forEach(type => {
      expect(screen.getByText(type)).toBeInTheDocument();
    });
  });

  test('displays browser management links with correct attributes', () => {
    const browsers = [
      { name: /Google Chrome/i, link: 'chromeLink' },
      { name: /Mozilla Firefox/i, link: 'firefoxLink' },
      { name: /Safari/i, link: 'safariLink' },
      { name: /Microsoft Edge/i, link: 'edgeLink' }
    ];
    
    browsers.forEach(({ name }) => {
      const link = screen.getByRole('link', { name });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  test('displays contact information with email link', () => {
    expect(screen.getByText('Contact Us')).toBeInTheDocument();
    const emailLink = screen.getByRole('link', { name: /Justvybz@justvybz.com/ });
    expect(emailLink).toBeInTheDocument();
    expect(emailLink).toHaveAttribute('href', 'mailto:Justvybz@justvybz.com');
  });

  test('displays back button', () => {
    const backButton = screen.getByRole('button');
    expect(backButton).toBeInTheDocument();
  });
});

