import React from 'react';
import { Link } from 'react-router-dom';
import BackButton from '../components/BackButton';

const PasswordResetDone: React.FC = () => {
  return (
    <div className="container mt-5" style={{ maxWidth: '600px' }}>
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h2 className="subtext-btn text-decoration-none mb-1">Check Your Email</h2>
            </div>
            <BackButton to="/login/" />
          </div>
          <hr />

          <div className="card border-0 shadow-sm">
            <div className="card-body p-4 text-center">
              <div className="mb-4">
                <i className="fas fa-envelope fa-3x text-primary mb-3"></i>
                <h3 className="subtext-btn-sm">Check Your Email</h3>
                <p className="text-muted subtext-btn-sm">
                  We've sent you instructions to reset your password. 
                  The email should arrive shortly.
                </p>
              </div>

              <div className="alert alert-info subtext-btn-sm" role="alert">
                <i className="fas fa-info-circle me-2"></i>
                If you don't see the email, please check your spam folder.
              </div>

              <div className="mt-4">
                <Link to="/login/" className="btn btn-outline-primary subtext-btn-sm">
                  Return to Login
                </Link>
              </div>
            </div>
          </div>

          <div className="text-center mt-4">
            <p className="text-muted small subtext-btn-sm">
              Need help? Contact our support team at Justvybz@justvybz.com
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PasswordResetDone;



