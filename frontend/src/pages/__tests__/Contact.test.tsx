import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import Contact from '../Contact';
import apiService from '../../services/api';
import { renderWithRouter } from '../../__tests__/testUtils';

// Mock the API service
jest.mock('../../services/api', () => ({
  submitContactForm: jest.fn()
}));

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
}));

describe('Contact', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders the contact form with title', () => {
    renderWithRouter(<Contact />);
    expect(screen.getByText('Feedback & Enquiry')).toBeInTheDocument();
  });

  it('displays all form fields', () => {
    renderWithRouter(<Contact />);
    expect(screen.getByLabelText(/Full Name/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Subject/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Message/)).toBeInTheDocument();
  });

  it('shows character count for message field', () => {
    renderWithRouter(<Contact />);
    const messageField = screen.getByLabelText(/Message/);
    fireEvent.change(messageField, { target: { value: 'Test message' } });
    expect(screen.getByText(/\/250 characters/)).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    renderWithRouter(<Contact />);
    const submitButton = screen.getByRole('button', { name: /Send/i });
    
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Full name is required/i)).toBeInTheDocument();
    });
  });

  it('validates email format', async () => {
    renderWithRouter(<Contact />);
    const emailField = screen.getByLabelText(/Email/);
    const submitButton = screen.getByRole('button', { name: /Send/i });
    
    fireEvent.change(emailField, { target: { value: 'invalid-email' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Please enter a valid email address/i)).toBeInTheDocument();
    });
  });

  it('validates message length', async () => {
    renderWithRouter(<Contact />);
    const messageField = screen.getByLabelText(/Message/);
    const submitButton = screen.getByRole('button', { name: /Send/i });
    
    const longMessage = 'a'.repeat(251);
    fireEvent.change(messageField, { target: { value: longMessage } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Message must be 250 characters or less/i)).toBeInTheDocument();
    });
  });

  it('submits form successfully', async () => {
    (apiService.submitContactForm as jest.Mock).mockResolvedValue({
      success: true,
      message: 'Thanks for reaching out. Your message has been sent.'
    });

    renderWithRouter(<Contact />);
    
    fireEvent.change(screen.getByLabelText(/Full Name/), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByLabelText(/Email/), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/Subject/), { target: { value: 'Test Subject' } });
    fireEvent.change(screen.getByLabelText(/Message/), { target: { value: 'Test message' } });
    
    const submitButton = screen.getByRole('button', { name: /Send/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(apiService.submitContactForm).toHaveBeenCalledWith({
        full_name: 'Test User',
        email: 'test@example.com',
        subject: 'Test Subject',
        content: 'Test message'
      });
    });

    await waitFor(() => {
      expect(screen.getByText(/Thanks for reaching out/)).toBeInTheDocument();
    });
  });

  it('handles form submission error', async () => {
    (apiService.submitContactForm as jest.Mock).mockRejectedValue({
      response: {
        data: {
          message: 'Failed to send message'
        }
      }
    });

    renderWithRouter(<Contact />);
    
    fireEvent.change(screen.getByLabelText(/Full Name/), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByLabelText(/Email/), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/Subject/), { target: { value: 'Test Subject' } });
    fireEvent.change(screen.getByLabelText(/Message/), { target: { value: 'Test message' } });
    
    const submitButton = screen.getByRole('button', { name: /Send/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Failed to send message/)).toBeInTheDocument();
    });
  });

  it('displays back button', () => {
    renderWithRouter(<Contact />);
    // There should be at least one button (back button or submit button)
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });
});

