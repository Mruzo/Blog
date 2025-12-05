import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import MetaTags from '../components/MetaTags';

const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div>
      <MetaTags
        title="404 - Page Not Found - JustVybz"
        description="The page you're looking for doesn't exist. Return to JustVybz home."
        keywords="404, page not found, JustVybz"
      />
      <div className="container mt-5">
        <div className="row justify-content-center">
          <div className="col-md-8 col-lg-6 text-center">
            <div className="card border-0 shadow-sm">
              <div className="card-body py-5">
                <h1 className="display-1 text-primary mb-3">404</h1>
                <h2 className="subtext-btn mb-3">Page Not Found</h2>
                <p className="subtext-btn-sm text-muted mb-4">
                  Oops! The page you're looking for doesn't exist or has been moved.
                </p>
                <div className="d-flex gap-2 justify-content-center flex-wrap">
                <button
                    onClick={() => navigate(-1)}
                    className="btn btn-outline-secondary subtext-btn-sm"
                  >
                    <i className="fas fa-arrow-left me-2"></i>
                    &nbsp;Back
                  </button>
                  <Link 
                    to="/" 
                    className="btn btn-primary subtext-btn-sm"
                  >
                    <i className="fas fa-home me-2"></i> Home
                  </Link>
                  
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;

