import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import MessagePopup from '../components/MessagePopup';
import BackButton from '../components/BackButton';

const PasswordResetConfirm: React.FC = () => {
  const { uidb64, token } = useParams<{ uidb64: string; token: string }>();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    new_password1: '',
    new_password2: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'success' | 'danger' | 'warning' | 'info'>('danger');
  const [showMessage, setShowMessage] = useState(false);

  // Validate token on mount
  useEffect(() => {
    const validateToken = async () => {
      if (!uidb64 || !token) {
        setIsValid(false);
        setIsValidating(false);
        return;
      }

      try {
        // Check if token is valid by attempting to load the confirm page
        const response = await fetch(`/password-reset-confirm/${uidb64}/${token}/`, {
          method: 'GET',
          credentials: 'include'
        });

        if (response.ok) {
          setIsValid(true);
        } else {
          setIsValid(false);
          setMessage('This password reset link is invalid or has expired.');
          setMessageType('danger');
          setShowMessage(true);
        }
      } catch (error) {
        setIsValid(false);
        setMessage('An error occurred while validating the reset link.');
        setMessageType('danger');
        setShowMessage(true);
      } finally {
        setIsValidating(false);
      }
    };

    validateToken();
  }, [uidb64, token]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.new_password1 !== formData.new_password2) {
      setMessage('Passwords do not match.');
      setMessageType('danger');
      setShowMessage(true);
      return;
    }

    if (formData.new_password1.length < 8) {
      setMessage('Password must be at least 8 characters long.');
      setMessageType('danger');
      setShowMessage(true);
      return;
    }

    setIsSubmitting(true);
    setShowMessage(false);

    try {
      const response = await fetch(`/password-reset-confirm/${uidb64}/${token}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          new_password1: formData.new_password1,
          new_password2: formData.new_password2
        })
      });

      if (response.ok) {
        navigate('/password-reset-complete/');
      } else {
        const data = await response.json();
        const errorMessage = data.new_password2?.[0] || 
                           data.new_password1?.[0] || 
                           data.non_field_errors?.[0] || 
                           'Failed to reset password. Please try again.';
        setMessage(errorMessage);
        setMessageType('danger');
        setShowMessage(true);
      }
    } catch (error: any) {
      console.error('Password reset confirm error:', error);
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

  if (isValidating) {
    return <LoadingSpinner />;
  }

  if (!isValid) {
    return (
      <div className="container mt-5" style={{ maxWidth: '600px' }}>
        <div className="row">
          <div className="col-12">
            <div className="card border-0 shadow-sm">
              <div className="card-body p-4 text-center">
                <MessagePopup
                  message={message}
                  type={messageType}
                  show={showMessage}
                  onClose={handleCloseMessage}
                  duration={5000}
                />
                <h3 className="subtext-btn-sm mb-3">Invalid Reset Link</h3>
                <p className="text-muted subtext-btn-sm mb-4">
                  This password reset link is invalid or has expired. Please request a new one.
                </p>
                <Link to="/password-reset/" className="btn btn-primary subtext-btn-sm">
                  Request New Reset Link
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-5" style={{ maxWidth: '600px' }}>
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h2 className="subtext-btn text-decoration-none mb-1">Set New Password</h2>
              <p className="subtext-btn-sm text-muted mb-0">Please enter your new password twice to verify.</p>
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
                  <label htmlFor="new_password1" className="form-label">
                    New Password
                  </label>
                  <input
                    type="password"
                    className="form-control"
                    id="new_password1"
                    name="new_password1"
                    value={formData.new_password1}
                    onChange={handleInputChange}
                    required
                    autoFocus
                    autoComplete="new-password"
                    minLength={8}
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="new_password2" className="form-label">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    className="form-control"
                    id="new_password2"
                    name="new_password2"
                    value={formData.new_password2}
                    onChange={handleInputChange}
                    required
                    autoComplete="new-password"
                    minLength={8}
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
                        Changing Password...
                      </>
                    ) : (
                      'Change Password'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </form>

          <div className="text-center mt-4">
            <p className="text-muted small subtext-btn-sm">
              Make sure to use a strong password that you haven't used before. 
              Your password should be at least 8 characters long and include a mix of letters, numbers, and symbols.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PasswordResetConfirm;



