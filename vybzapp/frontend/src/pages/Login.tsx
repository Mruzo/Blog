import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useApi } from '../contexts/ApiContext';
import { getApiErrorMessage } from '../utils/getApiErrorMessage';
import LoadingSpinner from '../components/LoadingSpinner';
import MessagePopup from '../components/MessagePopup';
import BackButton from '../components/BackButton';
import PasswordField from '../components/PasswordField';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, currentUser } = useApi();
  
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'success' | 'danger' | 'warning' | 'info'>('danger');
  const [showMessage, setShowMessage] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Redirect if already logged in (but not if we just logged in - let handleSubmit handle that)
  useEffect(() => {
    if (currentUser && !isLoggingIn) {
      const redirectTo = searchParams.get('next') || sessionStorage.getItem('redirectAfterLogin') || '/';
      sessionStorage.removeItem('redirectAfterLogin');
      navigate(redirectTo);
    }
  }, [currentUser, navigate, searchParams, isLoggingIn]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setIsLoggingIn(true);
    setShowMessage(false);

    try {
      await login(formData.username, formData.password);
      
      // Success - redirect
      const redirectTo = searchParams.get('next') || sessionStorage.getItem('redirectAfterLogin') || '/';
      sessionStorage.removeItem('redirectAfterLogin');
      
      // Store login success message to show on destination page
      sessionStorage.setItem('loginSuccess', 'true');
      sessionStorage.setItem('loginSuccessRedirect', redirectTo);
      
      setMessage('Login successful! Redirecting...');
      setMessageType('success');
      setShowMessage(true);
      
      // Small delay to show success message
      setTimeout(() => {
        setIsLoggingIn(false);
        navigate(redirectTo);
      }, 1000);
      
    } catch (error: any) {
      console.error('Login error:', error);
      setIsLoggingIn(false);
      const errorMessage = getApiErrorMessage(
        error,
        'Invalid username or password. Please try again.'
      );
      setMessage(errorMessage);
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
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <div>
              <h2 className="subtext-btn text-decoration-none mb-1">Sign In</h2>
              {/* <p className="subtext-btn-sm text-muted mb-0">Enter your credentials to access your account</p> */}
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
                      Username
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
                    <PasswordField
                      id="password"
                      name="password"
                      label="Password"
                      value={formData.password}
                      onChange={handleInputChange}
                      required
                      autoComplete="current-password"
                    />
                  </div>
                </div>

                <div className="mb-3 text-center">
                  <button
                    type="submit"
                    className="btn btn-success w-40 subtext-btn-sm"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Signing In...
                      </>
                    ) : (
                      'Sign In'
                    )}
                  </button>
                </div>

                <div className="text-center mb-3">
                  <small>
                    <Link to="/password-reset/" className="text-decoration-none">
                      Forgot your Password?
                    </Link>
                  </small>
                </div>

                <div className="text-center">
                  <p className="mb-0 subtext-btn-sm">
                    Don't have an account?{' '}
                    <Link to="/register/" className="text-decoration-none fw-bold">
                      Register here
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

export default Login;

