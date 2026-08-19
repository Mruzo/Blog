import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Login from '../pages/Login';
import PasswordReset from '../pages/PasswordReset';

const mockNavigate = jest.fn();
const mockPasswordReset = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('../contexts/ApiContext', () => ({
  useApi: () => ({
    login: jest.fn(),
    currentUser: null,
    authInitialized: true,
  }),
}));

jest.mock('../services/api', () => ({
  __esModule: true,
  default: {
    passwordReset: (...args: unknown[]) => mockPasswordReset(...args),
  },
}));

describe('Forgot Password Flow Integration', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockPasswordReset.mockClear();
    mockPasswordReset.mockResolvedValue(undefined);
  });

  it('shows forgot password link on login page', () => {
    render(
      <MemoryRouter initialEntries={['/login/']}>
        <Login />
      </MemoryRouter>,
    );

    const forgotPasswordLink = screen.getByText(/Forgot your Password/i).closest('a');
    expect(forgotPasswordLink).toHaveAttribute('href', '/password-reset/');
  });

  it('submits email through password reset API', async () => {
    render(
      <MemoryRouter initialEntries={['/password-reset/']}>
        <PasswordReset />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      expect(mockPasswordReset).toHaveBeenCalledWith('test@example.com');
      expect(mockNavigate).toHaveBeenCalledWith('/password-reset/done/');
    });
  });

  it('uses email input validation on password reset form', () => {
    render(
      <MemoryRouter initialEntries={['/password-reset/']}>
        <PasswordReset />
      </MemoryRouter>,
    );

    const emailInput = screen.getByLabelText(/email address/i);
    expect(emailInput).toHaveAttribute('type', 'email');
    expect(emailInput).toHaveAttribute('required');
  });
});
