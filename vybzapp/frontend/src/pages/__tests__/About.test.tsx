import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithRouter } from '../../testing/testHelpers';
import About from '../About';

describe('About', () => {
  it('covers the story, background, image, and back control', () => {
    renderWithRouter(<About />);

    expect(screen.getByText('Our Story')).toBeInTheDocument();
    expect(screen.getByText(/Hello there, I'm Christopher Uzoewulu/)).toBeInTheDocument();
    expect(screen.getByText(/My professional background is pretty diverse/)).toBeInTheDocument();
    expect(screen.getByText(/I built this web app primarily as a side project/)).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(screen.getByAltText('Christopher Uzoewulu')).toHaveAttribute(
      'src',
      '/static/snmov/img/about.png',
    );
  });
});
