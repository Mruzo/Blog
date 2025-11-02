import React from 'react';
import { Link } from 'react-router-dom';

const Home: React.FC = () => {
  return (
    <div>
      {/* Hero Section */}
      <section className="row my-3 position-relative" style={{ 
        backgroundColor: 'inherit', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '22vh' 
      }}>
        <div className="col card mx-auto position-relative rounded-0 border-0 d-flex justify-content-center align-items-center" style={{ backgroundColor: 'inherit' }}>
          <div className="text-center land-border rounded-0" style={{ opacity: 1 }}>
            <h2 className="landtext">
              CREATE IMMERSIVE STORIES
            </h2>
            
            {/* <div className="mt-3">
              <Link to="/immersivecomics/" className="btn btn-primary">
                Get Started
              </Link>
            </div> */}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <div className="row border-top bd-light mt-5 mx-auto">
        <div className="container text-center test-border mx-auto" style={{ opacity: 1 }}>
          <h5 className="subtext my-2">
            about us
          </h5>
        </div>
        
        <div className="container text-center my-1 mx-auto" style={{ opacity: 1 }}>
          <div className="card col-md-6 mx-auto bg-light border-0">
            <div className="card-body p-0">
              <pre className="card-text subtext-sm" style={{ whiteSpace: 'pre-wrap' }}>
                Welcome to Immersive Comics - your platform for creating and experiencing interactive 3D stories. 
                Build engaging 3D comic stories with interactive dialogues and camera controls.
              </pre>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="row border-top bd-light mt-5 mx-auto">
        <div className="container text-center test-border mx-auto" style={{ opacity: 1 }}>
          <h5 className="subtext my-2">
            features
          </h5>
        </div>
        
        <div className="container my-3 mx-auto" style={{ opacity: 1 }}>
          <div className="row">
            <div className="col-md-4 mb-4">
              <div className="card h-100 border-0 shadow-sm">
                <div className="card-body text-center">
                  <i className="fas fa-cube fa-3x text-primary mb-3"></i>
                  <h5 className="subtext-md">Create Stories</h5>
                  <p className="subtext-sm">
                    Build engaging 3D comic stories with interactive dialogues and camera controls.
                  </p>
                </div>
              </div>
            </div>
            <div className="col-md-4 mb-4">
              <div className="card h-100 border-0 shadow-sm">
                <div className="card-body text-center">
                  <i className="fas fa-layer-group fa-3x text-primary mb-3"></i>
                  <h5 className="subtext-md">Manage Episodes</h5>
                  <p className="subtext-sm">
                    Organize your content into seasons and episodes with rich media support.
                  </p>
                </div>
              </div>
            </div>
            <div className="col-md-4 mb-4">
              <div className="card h-100 border-0 shadow-sm">
                <div className="card-body text-center">
                  <i className="fas fa-share-alt fa-3x text-primary mb-3"></i>
                  <h5 className="subtext-md">Share & Publish</h5>
                  <p className="subtext-sm">
                    Share your creations with the world and track engagement analytics.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Section */}
      <div className="row border-top bd-light mb-5 mx-auto">
        <div className="container text-center test-border mt-0 mx-auto" style={{ opacity: 1 }}>
          <h5 className="subtext my-2">
            for feedback & enquiries
          </h5>
        </div>
        
        <div className="container text-center my-3 mx-auto" style={{ opacity: 1 }}>
          <div className="card mt-2 col-6 col-md-4 col-lg-2 mx-auto bg-light border-0 p-0">
            <a 
              className="btn subtext-btn-sm shadow p-1 mb-5 bg-body-tertiary justify-content-center font-weight-bolder text-dark rounded-5 my-auto" 
              role="button" 
              aria-disabled="true" 
              style={{ backgroundColor: '#FFBC00' }} 
              href="/contact"  
              target="_blank"
            >
              <strong>email us</strong>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;