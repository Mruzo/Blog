import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Login from '../Login';
import { ApiProvider, useApi } from '../../contexts/ApiContext';
import { CartProvider } from '../../contexts/CartContext';

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useSearchParams: () => [new URLSearchParams(), jest.fn()],
}));

// Mock useApi
const mockLogin = jest.fn();
const mockCurrentUser = null;

jest.mock('../../contexts/ApiContext', () => ({
  ApiProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useApi: () => ({
    login: mockLogin,
    currentUser: mockCurrentUser
  })
}));

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <MemoryRouter>
      <ApiProvider>
        <CartProvider>
          {component}
        </CartProvider>
      </ApiProvider>
    </MemoryRouter>
  );
};

describe('Login', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockLogin.mockClear();
    sessionStorage.clear();
    jest.restoreAllMocks();
  });

  it('renders login form', () => {
    renderWithProviders(<Login />);
    
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i, { selector: '#password' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('renders login title', () => {
    renderWithProviders(<Login />);
    
    expect(screen.getByRole('heading', { name: 'Sign In' })).toBeInTheDocument();
  });

  it('toggles password visibility', () => {
    renderWithProviders(<Login />);

    fireEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(screen.getByLabelText(/password/i, { selector: '#password' })).toHaveAttribute('type', 'text');
  });

  it('renders forgot password link', () => {
    renderWithProviders(<Login />);
    
    const forgotPasswordLink = screen.getByText(/Forgot your Password/i).closest('a');
    expect(forgotPasswordLink).toHaveAttribute('href', '/password-reset/');
  });

  it('renders register link', () => {
    renderWithProviders(<Login />);
    
    const registerLink = screen.getByText(/Register here/i).closest('a');
    expect(registerLink).toHaveAttribute('href', '/register/');
  });

  it('updates form fields when user types', () => {
    renderWithProviders(<Login />);
    
    const usernameInput = screen.getByLabelText(/username/i);
    const passwordInput = screen.getByLabelText(/password/i, { selector: '#password' });
    
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'testpass123' } });
    
    expect((usernameInput as HTMLInputElement).value).toBe('testuser');
    expect((passwordInput as HTMLInputElement).value).toBe('testpass123');
  });

  it('calls login API on form submit', async () => {
    mockLogin.mockResolvedValueOnce({
      token: 'test-token',
      user: { id: 1, username: 'testuser' }
    });

    renderWithProviders(<Login />);
    
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'testuser' } });
    fireEvent.change(screen.getByLabelText(/password/i, { selector: '#password' }), { target: { value: 'testpass123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('testuser', 'testpass123');
    });
  });

  it('shows loading state while submitting', async () => {
    mockLogin.mockImplementation(() => new Promise(() => {})); // Never resolves

    renderWithProviders(<Login />);
    
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'testuser' } });
    fireEvent.change(screen.getByLabelText(/password/i, { selector: '#password' }), { target: { value: 'testpass123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/Signing In/i)).toBeInTheDocument();
      const submitButton = screen.getByText(/Signing In/i).closest('button');
      expect(submitButton).not.toBeNull();
      expect((submitButton as HTMLButtonElement).disabled).toBe(true);
    });
  });

  it('displays error message on login failure', async () => {
    mockLogin.mockRejectedValueOnce({
      response: {
        data: {
          non_field_errors: ['Unable to log in with provided credentials.']
        }
      }
    });

    renderWithProviders(<Login />);
    
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'testuser' } });
    fireEvent.change(screen.getByLabelText(/password/i, { selector: '#password' }), { target: { value: 'wrongpass' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/Unable to log in/i)).toBeInTheDocument();
    });
  });

  it('navigates to home after successful login', async () => {
    mockLogin.mockResolvedValueOnce({
      token: 'test-token',
      user: { id: 1, username: 'testuser' }
    });

    renderWithProviders(<Login />);
    
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'testuser' } });
    fireEvent.change(screen.getByLabelText(/password/i, { selector: '#password' }), { target: { value: 'testpass123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    }, { timeout: 2000 });
  });

  it('navigates to next parameter after successful login', async () => {
    const mockSearchParams = new URLSearchParams('?next=/immersivecomics/story/create/');
    jest.spyOn(require('react-router-dom'), 'useSearchParams').mockReturnValue([mockSearchParams, jest.fn()]);

    mockLogin.mockResolvedValueOnce({
      token: 'test-token',
      user: { id: 1, username: 'testuser' }
    });

    renderWithProviders(<Login />);
    
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'testuser' } });
    fireEvent.change(screen.getByLabelText(/password/i, { selector: '#password' }), { target: { value: 'testpass123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/immersivecomics/story/create/');
    }, { timeout: 2000 });
  });

  it('uses redirectAfterLogin from sessionStorage if no next parameter', async () => {
    sessionStorage.setItem('redirectAfterLogin', '/product/');

    mockLogin.mockResolvedValueOnce({
      token: 'test-token',
      user: { id: 1, username: 'testuser' }
    });

    renderWithProviders(<Login />);
    
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'testuser' } });
    fireEvent.change(screen.getByLabelText(/password/i, { selector: '#password' }), { target: { value: 'testpass123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/product/');
      expect(sessionStorage.getItem('redirectAfterLogin')).toBeNull();
    }, { timeout: 2000 });
  });

  it('requires username and password fields', () => {
    renderWithProviders(<Login />);
    
    const usernameInput = screen.getByLabelText(/username/i);
    const passwordInput = screen.getByLabelText(/password/i, { selector: '#password' });
    
    expect((usernameInput as HTMLInputElement).required).toBe(true);
    expect((passwordInput as HTMLInputElement).required).toBe(true);
  });
});



