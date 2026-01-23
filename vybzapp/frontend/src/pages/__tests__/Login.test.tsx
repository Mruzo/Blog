import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Login from '../Login';
import { ApiProvider, useApi } from '../../contexts/ApiContext';
import { CartProvider } from '../../contexts/CartContext';

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useSearchParams: () => [new URLSearchParams(), jest.fn()]
}));

// Mock useApi
const mockLogin = jest.fn();
const mockCurrentUser = null;

jest.mock('../../contexts/ApiContext', () => ({
  ...jest.requireActual('../../contexts/ApiContext'),
  useApi: () => ({
    login: mockLogin,
    currentUser: mockCurrentUser
  })
}));

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <ApiProvider>
        <CartProvider>
          {component}
        </CartProvider>
      </ApiProvider>
    </BrowserRouter>
  );
};

describe('Login', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockLogin.mockClear();
    sessionStorage.clear();
  });

  it('renders login form', () => {
    renderWithProviders(<Login />);
    
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('renders login title and description', () => {
    renderWithProviders(<Login />);
    
    expect(screen.getByText('Sign In')).toBeInTheDocument();
    expect(screen.getByText(/Enter your credentials/i)).toBeInTheDocument();
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
    const passwordInput = screen.getByLabelText(/password/i);
    
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'testpass123' } });
    
    expect(usernameInput).toHaveValue('testuser');
    expect(passwordInput).toHaveValue('testpass123');
  });

  it('calls login API on form submit', async () => {
    mockLogin.mockResolvedValueOnce({
      token: 'test-token',
      user: { id: 1, username: 'testuser' }
    });

    renderWithProviders(<Login />);
    
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'testuser' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'testpass123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('testuser', 'testpass123');
    });
  });

  it('shows loading state while submitting', async () => {
    mockLogin.mockImplementation(() => new Promise(() => {})); // Never resolves

    renderWithProviders(<Login />);
    
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'testuser' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'testpass123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/Signing In/i)).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeDisabled();
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
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrongpass' } });
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
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'testpass123' } });
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
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'testpass123' } });
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
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'testpass123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/product/');
      expect(sessionStorage.getItem('redirectAfterLogin')).toBeNull();
    }, { timeout: 2000 });
  });

  it('requires username and password fields', () => {
    renderWithProviders(<Login />);
    
    const usernameInput = screen.getByLabelText(/username/i);
    const passwordInput = screen.getByLabelText(/password/i);
    
    expect(usernameInput).toBeRequired();
    expect(passwordInput).toBeRequired();
  });
});



