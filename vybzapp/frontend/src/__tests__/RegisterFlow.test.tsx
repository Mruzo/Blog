import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Register from '../pages/Register';

const mockRegister = jest.fn();

jest.mock('../contexts/ApiContext', () => ({
  useApi: () => ({
    register: mockRegister,
    currentUser: null,
    authInitialized: true,
  }),
}));

const renderRegister = () =>
  render(
    <MemoryRouter initialEntries={['/register/']}>
      <Register />
    </MemoryRouter>,
  );

describe('Register Flow Integration', () => {
  beforeEach(() => {
    mockRegister.mockClear();
  });

  it('renders registration form', () => {
    renderRegister();

    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('submits registration data through register API', async () => {
    mockRegister.mockResolvedValueOnce({
      token: 'test-token',
      user: {
        id: 1,
        username: 'newuser',
        email: 'newuser@example.com',
        first_name: 'New',
        last_name: 'User',
      },
      message: 'Registration successful. Please check your email to verify your account.',
      email_verification_required: true,
    });

    renderRegister();

    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'newuser' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'newuser@example.com' } });
    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'New' } });
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'User' } });
    fireEvent.change(document.getElementById('password')!, { target: { value: 'newpass123' } });
    fireEvent.change(document.getElementById('password2')!, { target: { value: 'newpass123' } });
    fireEvent.click(screen.getByLabelText(/I agree to the/i));
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'newpass123',
        password2: 'newpass123',
        first_name: 'New',
        last_name: 'User',
        accept_terms: true,
      });
    });

    await waitFor(() => {
      expect(screen.getByText(/Registration successful/i)).toBeInTheDocument();
    });
  });

  it('shows error when passwords do not match', async () => {
    renderRegister();

    fireEvent.change(document.getElementById('password')!, { target: { value: 'pass123' } });
    fireEvent.change(document.getElementById('password2')!, { target: { value: 'different' } });
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });
  });

  it('shows error when terms are not accepted', async () => {
    renderRegister();

    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'newuser' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'new@example.com' } });
    fireEvent.change(document.getElementById('password')!, { target: { value: 'newpass123' } });
    fireEvent.change(document.getElementById('password2')!, { target: { value: 'newpass123' } });
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/You must accept the Terms of Service/i)).toBeInTheDocument();
    });
  });

  it('shows error on API failure', async () => {
    mockRegister.mockRejectedValueOnce({
      response: { data: { error: 'Username already taken.' } },
    });

    renderRegister();

    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'existing' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'existing@example.com' } });
    fireEvent.change(document.getElementById('password')!, { target: { value: 'newpass123' } });
    fireEvent.change(document.getElementById('password2')!, { target: { value: 'newpass123' } });
    fireEvent.click(screen.getByLabelText(/I agree to the/i));
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/Username already taken/i)).toBeInTheDocument();
    });
  });
});
