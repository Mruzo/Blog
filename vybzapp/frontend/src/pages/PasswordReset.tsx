import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import MessagePopup from '../components/MessagePopup';
import BackButton from '../components/BackButton';
import apiService from '../services/api';

const PasswordReset: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'success' | 'danger' | 'warning' | 'info'>('danger');
  const [showMessage, setShowMessage] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setShowMessage(false);

    try {
      // Call Django's password reset API endpoint
      // This will send an email via Django's email backend (SMTP)
      await apiService.passwordReset(email);
      
      // Django password reset always returns success (for security)
      // Redirect to done page regardless of whether email exists
      navigate('/password-reset/done/');
      
    } catch (error: any) {
      console.error('Password reset error:', error);
      setMessage('An error occurred. Please try again later.');
      setMessageType('danger');
      setShowMessage(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseMessage = () => {
    setShowMessage(false);
  };

  return (
    <div className="container mt-5" style={{ maxWidth: '600px' }}>
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h2 className="subtext-btn text-decoration-none mb-1">Reset Your Password</h2>
              <p className="subtext-btn-sm text-muted mb-0">Enter your email address and we'll send you instructions to reset your password.</p>
            </div>
            <BackButton to="/login/" />
          </div>
          <hr />

          <MessagePopup
            message={message}
            type={messageType}
            show={showMessage}
            onClose={handleCloseMessage}
            duration={5000}
          />

          <form onSubmit={handleSubmit} className="subtext-btn-sm">
            <div className="card border-0 shadow-sm">
              <div className="card-body p-4">
                <div className="mb-3">
                  <label htmlFor="email" className="form-label">
                    Email Address
                  </label>
                  <input
                    type="email"
                    className="form-control"
                    id="email"
                    name="email"
                    value={email}
                    onChange={handleInputChange}
                    required
                    autoFocus
                    autoComplete="email"
                    placeholder="Enter your email address"
                  />
                </div>

                <div className="mb-3 text-center">
                  <button
                    type="submit"
                    className="btn btn-primary w-100 subtext-btn-sm"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Sending...
                      </>
                    ) : (
                      'Send Reset Link'
                    )}
                  </button>
                </div>

                <div className="text-center mt-4">
                  <p className="mb-0 subtext-btn-sm">
                    Remember your password?{' '}
                    <Link to="/login/" className="text-decoration-none">
                      Log in
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          </form>

          <div className="text-center mt-4">
            <p className="text-muted small subtext-btn-sm">
              By requesting a password reset, you confirm that you are the owner of this account. 
              For security reasons, the reset link will expire in 24 hours.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PasswordReset;

