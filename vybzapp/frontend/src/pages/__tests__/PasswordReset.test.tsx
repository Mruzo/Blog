import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter, useNavigate } from 'react-router-dom';
import PasswordReset from '../PasswordReset';

const mockNavigate = jest.fn();
const mockPasswordReset = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('../../services/api', () => ({
  __esModule: true,
  default: {
    passwordReset: (...args: unknown[]) => mockPasswordReset(...args),
  },
}));

const renderPasswordReset = () =>
  render(
    <BrowserRouter>
      <PasswordReset />
    </BrowserRouter>,
  );

describe('PasswordReset', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockPasswordReset.mockClear();
    mockPasswordReset.mockResolvedValue(undefined);
  });

  it('renders password reset form', () => {
    renderPasswordReset();

    expect(screen.getByText('Reset Your Password')).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
  });

  it('updates email field when user types', () => {
    renderPasswordReset();

    const emailInput = screen.getByLabelText(/email address/i) as HTMLInputElement;
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    expect(emailInput.value).toBe('test@example.com');
  });

  it('calls password reset API on form submit', async () => {
    renderPasswordReset();

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      expect(mockPasswordReset).toHaveBeenCalledWith('test@example.com');
    });
  });

  it('navigates to done page after successful submit', async () => {
    renderPasswordReset();

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/password-reset/done/');
    });
  });

  it('displays error message on API failure', async () => {
    mockPasswordReset.mockRejectedValueOnce(new Error('Network error'));
    renderPasswordReset();

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      expect(screen.getByText(/An error occurred/i)).toBeInTheDocument();
    });
  });

  it('requires email field', () => {
    renderPasswordReset();

    expect(screen.getByLabelText(/email address/i)).toHaveAttribute('required');
  });
});
