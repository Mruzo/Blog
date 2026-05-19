import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useApi } from '../contexts/ApiContext';
import LoadingSpinner from '../components/LoadingSpinner';
import MessagePopup from '../components/MessagePopup';
import BackButton from '../components/BackButton';
import PasswordField from '../components/PasswordField';
import { getRegisterErrorMessage } from '../utils/getRegisterErrorMessage';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { register, currentUser } = useApi();
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    password2: '',
    first_name: '',
    last_name: '',
    accept_terms: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'success' | 'danger' | 'warning' | 'info'>('danger');
  const [showMessage, setShowMessage] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (currentUser) {
      const redirectTo = searchParams.get('next') || sessionStorage.getItem('redirectAfterLogin') || '/';
      sessionStorage.removeItem('redirectAfterLogin');
      navigate(redirectTo);
    }
  }, [currentUser, navigate, searchParams]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setShowMessage(false);

    // Client-side validation
    if (formData.password !== formData.password2) {
      setMessage('Passwords do not match.');
      setMessageType('danger');
      setShowMessage(true);
      setIsSubmitting(false);
      return;
    }

    if (!formData.accept_terms) {
      setMessage('You must accept the Terms of Service and Privacy Policy to register.');
      setMessageType('danger');
      setShowMessage(true);
      setIsSubmitting(false);
      return;
    }

    try {
      const result = await register({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        password2: formData.password2,
        first_name: formData.first_name || undefined,
        last_name: formData.last_name || undefined,
        accept_terms: formData.accept_terms
      });
      
      // Success - show message and redirect
      setMessage(result.message || 'Registration successful! Please check your email to verify your account.');
      setMessageType('success');
      setShowMessage(true);
      
      // Redirect after a short delay
      const redirectTo = searchParams.get('next') || sessionStorage.getItem('redirectAfterLogin') || '/';
      sessionStorage.removeItem('redirectAfterLogin');
      
      setTimeout(() => {
        navigate(redirectTo);
      }, 2000);
      
    } catch (error: unknown) {
      console.error('Registration error:', error);
      setMessage(getRegisterErrorMessage(error));
      setMessageType('danger');
      setShowMessage(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseMessage = () => {
    setShowMessage(false);
  };

  // Show loading if checking authentication
  if (currentUser === undefined) {
    return <LoadingSpinner />;
  }

  // If already logged in, show loading while redirecting
  if (currentUser) {
    return <LoadingSpinner />;
  }

  return (
    <div className="container mt-5" style={{ maxWidth: '500px' }}>
      <div className="row">
        <div className="col-12 p-1">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h2 className="subtext-btn text-decoration-none mb-1">Create Account</h2>
              <p className="subtext-btn-sm text-muted mb-0">Join Justvybz to explore beautiful stories</p>
            </div>
            <BackButton to="/" />
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
                <div className="row">
                  <div className="col-6 mb-3 p-1">
                    <label htmlFor="username" className="form-label">
                      Username <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      id="username"
                      name="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      required
                      autoFocus
                      autoComplete="username"
                    />
                  </div>

                  <div className="col-6 mb-3 p-1">
                    <label htmlFor="email" className="form-label">
                      Email <span className="text-danger">*</span>
                    </label>
                    <input
                      type="email"
                      className="form-control"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="row">
                  <div className="col-6 mb-3 p-1">
                    <label htmlFor="first_name" className="form-label">
                      First Name
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      id="first_name"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleInputChange}
                      autoComplete="given-name"
                    />
                  </div>

                  <div className="col-6 mb-3 p-1">
                    <label htmlFor="last_name" className="form-label">
                      Last Name
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      id="last_name"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleInputChange}
                      autoComplete="family-name"
                    />
                  </div>
                </div>

                <div className="row">
                  <div className="col-6 mb-3 p-1">
                    <PasswordField
                      id="password"
                      name="password"
                      label={<>Password <span className="text-danger">*</span></>}
                      value={formData.password}
                      onChange={handleInputChange}
                      required
                      autoComplete="new-password"
                    />
                  </div>

                  <div className="col-6 mb-3 p-1">
                    <PasswordField
                      id="password2"
                      name="password2"
                      label={<>Confirm Password <span className="text-danger">*</span></>}
                      value={formData.password2}
                      onChange={handleInputChange}
                      required
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                <div className="mb-3 p-1">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="accept_terms"
                      name="accept_terms"
                      checked={formData.accept_terms}
                      onChange={handleInputChange}
                      required
                    />
                    <label className="form-check-label" htmlFor="accept_terms">
                      I agree to the <a href="/terms/" target="_blank" rel="noopener noreferrer">Terms of Service</a> and{' '}
                      <a href="/privacy/" target="_blank" rel="noopener noreferrer">Privacy Policy</a>{' '}
                      <span className="text-danger">*</span>
                    </label>
                  </div>
                </div>

                <div className="mb-3 text-center">
                  <button
                    type="submit"
                    className="btn btn-success w-30 subtext-btn-sm"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Creating Account...
                      </>
                    ) : (
                      'Create Account'
                    )}
                  </button>
                </div>

                <div className="text-center">
                  <p className="mb-0 subtext-btn-sm">
                    Already have an account?{' '}
                    <Link to="/login/" className="text-decoration-none fw-bold">
                      Log in here
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;

