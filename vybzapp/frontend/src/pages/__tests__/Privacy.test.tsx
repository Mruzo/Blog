import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithRouter } from '../../__tests__/testUtils';
import Privacy from '../Privacy';

const mockUseApi = jest.fn();

jest.mock('../../contexts/ApiContext', () => ({
  useApi: () => mockUseApi(),
}));

describe('Privacy', () => {
  beforeEach(() => {
    mockUseApi.mockReturnValue({ currentUser: null });
  });

  const renderPrivacy = () => renderWithRouter(<Privacy />);

  test('renders the privacy policy page with title', () => {
    renderPrivacy();
    expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
  });

  test('displays last updated date', () => {
    renderPrivacy();
    expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
  });

  test('displays all main sections', () => {
    renderPrivacy();
    const sections = [
      'Information We Collect',
      'How We Use Your Information',
      'Information Sharing',
      'Content Moderation',
      'Data Security',
      'Your Rights',
      'GDPR (European Economic Area & UK)',
      'CCPA / CPRA (California Residents)',
    ];

    sections.forEach((section) => {
      expect(screen.getByText(section)).toBeInTheDocument();
    });

    expect(screen.getByText(/Account Information:/)).toBeInTheDocument();
  });

  test('displays contact information with email link', () => {
    renderPrivacy();
    expect(screen.getByText('Contact Us')).toBeInTheDocument();
    const emailLinks = screen.getAllByRole('link', { name: /Justvybz@justvybz.com/ });
    expect(emailLinks.length).toBeGreaterThan(0);
    expect(emailLinks[0]).toHaveAttribute('href', 'mailto:Justvybz@justvybz.com');
  });

  test('displays GDPR and CCPA email contact for all visitors', () => {
    renderPrivacy();
    expect(screen.getByText(/Submit requests to/)).toBeInTheDocument();
    expect(screen.getByText(/California Privacy Request/)).toBeInTheDocument();
  });

  test('does not show Privacy & Data self-service section when logged out', () => {
    renderPrivacy();
    expect(screen.queryByRole('link', { name: /Manage my data/i })).toBeNull();
    expect(screen.getByText(/Privacy & Data section at the bottom of this page/)).toBeInTheDocument();
  });

  test('shows Privacy & Data self-service section when logged in', () => {
    mockUseApi.mockReturnValue({
      currentUser: { id: 1, username: 'testuser', first_name: 'Test' },
    });
    renderPrivacy();

    expect(screen.getByRole('heading', { name: /Privacy & Data/i })).toBeInTheDocument();
    const manageLink = screen.getByRole('link', { name: /Manage my data/i });
    expect(manageLink).toHaveAttribute('href', '/account/privacy/');
  });

  test('displays contact page link', () => {
    renderPrivacy();
    const contactLink = screen.getByRole('link', { name: /www.justvybz.com\/contact/ });
    expect(contactLink).toBeInTheDocument();
    expect(contactLink).toHaveAttribute('href', '/contact/');
  });

  test('displays back button', () => {
    renderPrivacy();
    const backButton = screen.getByRole('button');
    expect(backButton).toBeInTheDocument();
  });
});
