import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Login from '../pages/Login';

const mockLogin = jest.fn();

jest.mock('../contexts/ApiContext', () => ({
  useApi: () => ({
    login: mockLogin,
    currentUser: null,
    authInitialized: true,
  }),
}));

const renderLogin = () =>
  render(
    <MemoryRouter initialEntries={['/login/']}>
      <Login />
    </MemoryRouter>,
  );

describe('Login Flow Integration', () => {
  beforeEach(() => {
    mockLogin.mockClear();
    sessionStorage.clear();
  });

  it('renders login form', () => {
    renderLogin();

    expect(screen.getByRole('heading', { name: 'Sign In' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Username or email/i)).toBeInTheDocument();
    expect(document.getElementById('password')).toBeInTheDocument();
  });

  it('submits credentials through login API', async () => {
    mockLogin.mockResolvedValueOnce({
      token: 'test-token',
      user: { id: 1, username: 'testuser', first_name: 'Test' },
    });

    renderLogin();

    fireEvent.change(screen.getByLabelText(/Username or email/i), { target: { value: 'testuser' } });
    fireEvent.change(document.getElementById('password')!, { target: { value: 'testpass123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('testuser', 'testpass123');
    });
  });

  it('shows error on invalid credentials', async () => {
    mockLogin.mockRejectedValueOnce({
      response: {
        data: {
          non_field_errors: ['Invalid username or password.'],
        },
      },
    });

    renderLogin();

    fireEvent.change(screen.getByLabelText(/Username or email/i), { target: { value: 'wronguser' } });
    fireEvent.change(document.getElementById('password')!, { target: { value: 'wrongpass' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/Invalid username or password/i)).toBeInTheDocument();
    });
  });
});
