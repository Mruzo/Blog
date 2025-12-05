import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import Register from '../Register';
import { ApiProvider } from '../../contexts/ApiContext';
import { CartProvider } from '../../contexts/CartContext';

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock useApi
const mockRegister = jest.fn();
const mockCurrentUser = null;

jest.mock('../../contexts/ApiContext', () => ({
  ...jest.requireActual('../../contexts/ApiContext'),
  useApi: () => ({
    register: mockRegister,
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

describe('Register', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockRegister.mockClear();
  });

  it('renders registration form', () => {
    renderWithProviders(<Register />);
    
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('renders registration title and description', () => {
    renderWithProviders(<Register />);
    
    expect(screen.getByText('Create Account')).toBeInTheDocument();
    expect(screen.getByText(/Join Justvybz/i)).toBeInTheDocument();
  });

  it('renders login link', () => {
    renderWithProviders(<Register />);
    
    const loginLink = screen.getByText(/Log in here/i).closest('a');
    expect(loginLink).toHaveAttribute('href', '/login/');
  });

  it('updates form fields when user types', () => {
    renderWithProviders(<Register />);
    
    const usernameInput = screen.getByLabelText(/username/i);
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/^password$/i);
    const password2Input = screen.getByLabelText(/confirm password/i);
    
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'testpass123' } });
    fireEvent.change(password2Input, { target: { value: 'testpass123' } });
    
    expect(usernameInput).toHaveValue('testuser');
    expect(emailInput).toHaveValue('test@example.com');
    expect(passwordInput).toHaveValue('testpass123');
    expect(password2Input).toHaveValue('testpass123');
  });

  it('updates optional fields when user types', () => {
    renderWithProviders(<Register />);
    
    const firstNameInput = screen.getByLabelText(/first name/i);
    const lastNameInput = screen.getByLabelText(/last name/i);
    
    fireEvent.change(firstNameInput, { target: { value: 'John' } });
    fireEvent.change(lastNameInput, { target: { value: 'Doe' } });
    
    expect(firstNameInput).toHaveValue('John');
    expect(lastNameInput).toHaveValue('Doe');
  });

  it('updates accept_terms checkbox', () => {
    renderWithProviders(<Register />);
    
    const termsCheckbox = screen.getByLabelText(/I agree to the/i);
    
    expect(termsCheckbox).not.toBeChecked();
    fireEvent.click(termsCheckbox);
    expect(termsCheckbox).toBeChecked();
  });

  it('calls register API on form submit with correct data', async () => {
    mockRegister.mockResolvedValueOnce({
      token: 'test-token',
      user: { id: 1, username: 'testuser', email: 'test@example.com' },
      message: 'Registration successful. Please check your email to verify your account.',
      email_verification_required: true
    });

    renderWithProviders(<Register />);
    
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'testuser' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'testpass123' } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'testpass123' } });
    fireEvent.click(screen.getByLabelText(/I agree to the/i));
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        username: 'testuser',
        email: 'test@example.com',
        password: 'testpass123',
        password2: 'testpass123',
        first_name: undefined,
        last_name: undefined,
        accept_terms: true
      });
    });
  });

  it('calls register API with optional fields when provided', async () => {
    mockRegister.mockResolvedValueOnce({
      token: 'test-token',
      user: { id: 1, username: 'testuser', email: 'test@example.com' },
      message: 'Registration successful.',
      email_verification_required: true
    });

    renderWithProviders(<Register />);
    
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'testuser' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'John' } });
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Doe' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'testpass123' } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'testpass123' } });
    fireEvent.click(screen.getByLabelText(/I agree to the/i));
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        username: 'testuser',
        email: 'test@example.com',
        password: 'testpass123',
        password2: 'testpass123',
        first_name: 'John',
        last_name: 'Doe',
        accept_terms: true
      });
    });
  });

  it('shows loading state while submitting', async () => {
    mockRegister.mockImplementation(() => new Promise(() => {})); // Never resolves

    renderWithProviders(<Register />);
    
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'testuser' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'testpass123' } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'testpass123' } });
    fireEvent.click(screen.getByLabelText(/I agree to the/i));
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/Creating Account/i)).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeDisabled();
    });
  });

  it('displays error message when passwords do not match', async () => {
    renderWithProviders(<Register />);
    
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'testuser' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'testpass123' } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'differentpass' } });
    fireEvent.click(screen.getByLabelText(/I agree to the/i));
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/Passwords do not match/i)).toBeInTheDocument();
      expect(mockRegister).not.toHaveBeenCalled();
    });
  });

  it('displays error message when terms are not accepted', async () => {
    renderWithProviders(<Register />);
    
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'testuser' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'testpass123' } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'testpass123' } });
    // Don't check terms checkbox
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/You must accept the Terms/i)).toBeInTheDocument();
      expect(mockRegister).not.toHaveBeenCalled();
    });
  });

  it('displays error message on registration failure', async () => {
    mockRegister.mockRejectedValueOnce({
      response: {
        data: {
          error: 'Username already exists'
        }
      }
    });

    renderWithProviders(<Register />);
    
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'existinguser' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'testpass123' } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'testpass123' } });
    fireEvent.click(screen.getByLabelText(/I agree to the/i));
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/Username already exists/i)).toBeInTheDocument();
    });
  });

  it('navigates to home after successful registration', async () => {
    mockRegister.mockResolvedValueOnce({
      token: 'test-token',
      user: { id: 1, username: 'testuser', email: 'test@example.com' },
      message: 'Registration successful. Please check your email to verify your account.',
      email_verification_required: true
    });

    renderWithProviders(<Register />);
    
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'testuser' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'testpass123' } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'testpass123' } });
    fireEvent.click(screen.getByLabelText(/I agree to the/i));
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/Registration successful/i)).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    }, { timeout: 3000 });
  });

  it('displays success message after successful registration', async () => {
    mockRegister.mockResolvedValueOnce({
      token: 'test-token',
      user: { id: 1, username: 'testuser', email: 'test@example.com' },
      message: 'Registration successful. Please check your email to verify your account.',
      email_verification_required: true
    });

    renderWithProviders(<Register />);
    
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'testuser' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'testpass123' } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'testpass123' } });
    fireEvent.click(screen.getByLabelText(/I agree to the/i));
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/Registration successful/i)).toBeInTheDocument();
      expect(screen.getByText(/check your email/i)).toBeInTheDocument();
    });
  });

  it('requires username, email, password, and password2 fields', () => {
    renderWithProviders(<Register />);
    
    const usernameInput = screen.getByLabelText(/username/i);
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/^password$/i);
    const password2Input = screen.getByLabelText(/confirm password/i);
    const termsCheckbox = screen.getByLabelText(/I agree to the/i);
    
    expect(usernameInput).toBeRequired();
    expect(emailInput).toBeRequired();
    expect(passwordInput).toBeRequired();
    expect(password2Input).toBeRequired();
    expect(termsCheckbox).toBeRequired();
  });

  it('does not require first_name and last_name fields', () => {
    renderWithProviders(<Register />);
    
    const firstNameInput = screen.getByLabelText(/first name/i);
    const lastNameInput = screen.getByLabelText(/last name/i);
    
    expect(firstNameInput).not.toBeRequired();
    expect(lastNameInput).not.toBeRequired();
  });
});



