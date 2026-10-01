import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithRouter } from '../../testing/testHelpers';
import Documentation from '../Documentation';

describe('Documentation', () => {
  it('renders the documentation page', () => {
    renderWithRouter(<Documentation />);
    expect(screen.getByRole('heading', { name: 'Documentation' })).toBeInTheDocument();
  });

  it('includes the main how-to sections', () => {
    renderWithRouter(<Documentation />);
    expect(screen.getByRole('heading', { name: 'Watching a story' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Creating a story' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Directing the camera' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Studios and My Studio' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Collaborators' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Store and orders' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Account' })).toBeInTheDocument();
  });

  it('links to stories, studio, store, and contact', () => {
    renderWithRouter(<Documentation />);
    expect(screen.getByRole('link', { name: 'Stories' })).toHaveAttribute('href', '/immersivecomics/');
    expect(screen.getAllByRole('link', { name: 'My Studio' })[0]).toHaveAttribute(
      'href',
      '/immersivecomics/my-studio/'
    );
    expect(screen.getByRole('link', { name: 'Store' })).toHaveAttribute('href', '/product/');
    expect(screen.getByRole('link', { name: 'Contact us' })).toHaveAttribute('href', '/contact/');
  });

  it('explains studio invites, extra owner roles, and story assignment', () => {
    renderWithRouter(<Documentation />);
    expect(screen.getByRole('heading', { name: 'Invite to your studio' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Assign teammates to a story' })).toBeInTheDocument();
    expect(
      screen.getByText(/They get a registration link/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Your own extra roles show as Me/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/tap a name \(or Me\) to open that person/i)
    ).toBeInTheDocument();
  });
});
