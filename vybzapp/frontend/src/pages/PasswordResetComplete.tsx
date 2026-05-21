import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import BackButton from '../components/BackButton';

const PasswordResetComplete: React.FC = () => {
  const [verificationRequired, setVerificationRequired] = useState(false);

  useEffect(() => {
    const required = sessionStorage.getItem('passwordResetVerificationRequired') === 'true';
    setVerificationRequired(required);
    sessionStorage.removeItem('passwordResetVerificationRequired');
  }, []);

  return (
    <div className="container mt-5" style={{ maxWidth: '600px' }}>
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h2 className="subtext-btn text-decoration-none mb-1">Password Reset Complete</h2>
            </div>
            <BackButton to="/login/" />
          </div>
          <hr />

          <div className="card border-0 shadow-sm">
            <div className="card-body p-4 text-center">
              <div className="mb-4">
                <i className="fas fa-check-circle fa-3x text-success mb-3"></i>
                <h3 className="subtext-btn-sm">Password Reset Successful</h3>
                <p className="text-muted subtext-btn-sm">
                  {verificationRequired
                    ? 'Your password has been updated. We sent a verification email to your address — please verify your email before signing in.'
                    : 'Your password has been successfully reset. You can now log in with your new password.'}
                </p>
              </div>

              {verificationRequired && (
                <div className="alert alert-info subtext-btn-sm" role="alert">
                  <i className="fas fa-info-circle me-2"></i>
                  If you do not see the email, check your spam folder.
                </div>
              )}

              <div className="mt-4">
                <Link to="/login/" className="btn btn-primary subtext-btn-sm">
                  Go to Login
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PasswordResetComplete;



