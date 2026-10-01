import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithRouter } from '../../testing/testHelpers';
import Documentation from '../Documentation';

describe('Documentation', () => {
  it('covers the how-to sections, collaborator flow, and key links', () => {
    renderWithRouter(<Documentation />);

    [
      'Documentation',
      'Watching a story',
      'Creating a story',
      'Directing the camera',
      'Studios and My Studio',
      'Collaborators',
      'Invite to your studio',
      'Assign teammates to a story',
      'Store and orders',
      'Account',
    ].forEach((name) => {
      expect(screen.getByRole('heading', { name })).toBeInTheDocument();
    });

    expect(screen.getByText(/They get a registration link/i)).toBeInTheDocument();
    expect(screen.getByText(/Your own extra roles show as Me/i)).toBeInTheDocument();
    expect(screen.getByText(/like movie credits/i)).toBeInTheDocument();
    expect(screen.getByText(/tap a name \(or Me\) to open that person/i)).toBeInTheDocument();

    expect(screen.getByRole('link', { name: 'Stories' })).toHaveAttribute('href', '/immersivecomics/');
    expect(screen.getAllByRole('link', { name: 'My Studio' })[0]).toHaveAttribute(
      'href',
      '/immersivecomics/my-studio/',
    );
    expect(screen.getByRole('link', { name: 'Store' })).toHaveAttribute('href', '/product/');
    expect(screen.getByRole('link', { name: 'Contact us' })).toHaveAttribute('href', '/contact/');
  });
});
