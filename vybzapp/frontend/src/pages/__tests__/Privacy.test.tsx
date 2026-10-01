import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithRouter } from '../../testing/testHelpers';
import Privacy from '../Privacy';

const mockUseApi = jest.fn();

jest.mock('../../contexts/ApiContext', () => ({
  useApi: () => mockUseApi(),
}));

describe('Privacy', () => {
  const renderPrivacy = () => renderWithRouter(<Privacy />);

  beforeEach(() => {
    mockUseApi.mockReturnValue({ currentUser: null });
  });

  it('covers policy sections, processors, and logged-out self-service copy', () => {
    renderPrivacy();

    expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
    expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
    [
      'Information We Collect',
      'How We Use Your Information',
      'Information Sharing',
      'Content Moderation',
      'Data Security',
      'Your Rights',
      'GDPR (European Economic Area & UK)',
      'CCPA / CPRA (California Residents)',
      'Contact Us',
    ].forEach((section) => {
      expect(screen.getByText(section)).toBeInTheDocument();
    });

    expect(screen.getByText(/Account Information:/)).toBeInTheDocument();
    expect(screen.getByText(/Stripe:/)).toBeInTheDocument();
    expect(screen.getByText(/Canada Post:/)).toBeInTheDocument();
    expect(screen.getByText(/Amazon Web Services \(AWS\):/)).toBeInTheDocument();
    expect(screen.getByText(/Email delivery \(PapaMail\):/)).toBeInTheDocument();
    expect(screen.getByText(/We do not sell your personal information/)).toBeInTheDocument();
    expect(screen.getByText(/Submit requests to/)).toBeInTheDocument();
    expect(screen.getByText(/California Privacy Request/)).toBeInTheDocument();
    expect(screen.getByText(/Privacy & Data section at the bottom of this page/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Manage my data/i })).toBeNull();
    expect(screen.getAllByRole('link', { name: /Justvybz@justvybz.com/ })[0]).toHaveAttribute(
      'href',
      'mailto:Justvybz@justvybz.com',
    );
    expect(screen.getByRole('link', { name: /www.justvybz.com\/contact/ })).toHaveAttribute(
      'href',
      '/contact/',
    );
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('shows Privacy & Data self-service when logged in', () => {
    mockUseApi.mockReturnValue({
      currentUser: { id: 1, username: 'testuser', first_name: 'Test' },
    });
    renderPrivacy();

    expect(screen.getByRole('heading', { name: /Privacy & Data/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Manage my data/i })).toHaveAttribute(
      'href',
      '/account/privacy/',
    );
  });
});
