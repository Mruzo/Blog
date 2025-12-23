import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithRouter } from '../../__tests__/testUtils';
import About from '../About';

describe('About', () => {
  it('renders the about page with title', () => {
    renderWithRouter(<About />);
    expect(screen.getByText('Our Story')).toBeInTheDocument();
  });

  it('displays Christopher Uzoewulu introduction', () => {
    renderWithRouter(<About />);
    expect(screen.getByText(/Hello there, I'm Christopher Uzoewulu/)).toBeInTheDocument();
  });

  it('displays professional background information', () => {
    renderWithRouter(<About />);
    expect(screen.getByText(/My professional background is pretty diverse/)).toBeInTheDocument();
  });

  it('displays information about building the web app', () => {
    renderWithRouter(<About />);
    expect(screen.getByText(/I built this web app primarily as a side project/)).toBeInTheDocument();
  });

  it('displays back button', () => {
    renderWithRouter(<About />);
    // BackButton renders as a button with an icon
    const backButton = screen.getByRole('button');
    expect(backButton).toBeInTheDocument();
  });

  it('displays about image', () => {
    renderWithRouter(<About />);
    const image = screen.getByAltText('Christopher Uzoewulu');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', '/static/snmov/img/about.png');
  });
});

