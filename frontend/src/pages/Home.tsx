import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import MetaTags from '../components/MetaTags';
import MessagePopup from '../components/MessagePopup';

const Home: React.FC = () => {
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'success' | 'danger' | 'warning' | 'info'>('success');
  const [showMessage, setShowMessage] = useState(false);

  // Check for logout and login success messages from sessionStorage
  useEffect(() => {
    const logoutSuccess = sessionStorage.getItem('logoutSuccess');
    const loginSuccess = sessionStorage.getItem('loginSuccess');
    
    if (logoutSuccess === 'true') {
      setMessage('You have been successfully logged out.');
      setMessageType('success');
      setShowMessage(true);
      // Clear the flag
      sessionStorage.removeItem('logoutSuccess');
    } else if (loginSuccess === 'true') {
      setMessage('Login successful! Welcome back.');
      setMessageType('success');
      setShowMessage(true);
      // Clear the flag
      sessionStorage.removeItem('loginSuccess');
      sessionStorage.removeItem('loginSuccessRedirect');
    }
  }, []);

  const handleCloseMessage = () => {
    setShowMessage(false);
  };

  return (
    <div>
      <MessagePopup
        message={message}
        type={messageType}
        show={showMessage}
        onClose={handleCloseMessage}
        duration={4000}
      />
      <MetaTags
        title="JustVybz Studios"
        description="Cultural Inspiration meets Practical Innovation"
        keywords="Cultural Inspiration, Practical Innovation, 3D comics, interactive stories, immersive comics, 3D storytelling, interactive narratives"
      />
      {/* Hero Section */}
      <section className="row my-3 position-relative bg-inherit" style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '62vh',
        fontSize: '1rem'
      }}>
        <div className="col card mx-auto position-relative rounded-0 border-0 d-flex justify-content-center align-items-center bg-inherit">
          <div className="text-center land-border rounded-0 opacity-full">
            <h2 className="landtext mb-3">
              <div>INSPIRATION</div>
              <div className="font-quicksand-italic">meets</div>
              <div>INNOVATION</div>
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
        <div className="container text-center test-border mx-auto opacity-full">
          <h5 className="subtext my-2 font-gillsans">
            About us
          </h5>
        </div>
        
        <div className="container text-center my-1 mx-auto opacity-full">
          <div className="card col-md-6 mx-auto bg-light border-0">
            <div className="card-body p-0">
              <pre className="card-text subtext-sm" style={{ whiteSpace: 'pre-wrap' }}>
                Justvybz is your platform for creating and experiencing immersive comics. 
                We provide tools that help you reimagine your traditional comic.
              </pre>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="row border-top bd-light mt-5 mx-auto">
        <div className="container text-center test-border mx-auto opacity-full">
          <h5 className="subtext my-2 font-gillsans">
            Features
          </h5>
        </div>
        
        <div className="container my-3 mx-auto opacity-full">
          <div className="row">
            <div className="col-md-4 mb-4">
              <div className="card h-100 border-0 shadow-sm">
                <div className="card-body text-center">
                  <i className="fas fa-cube fa-3x text-primary mb-3"></i>
                  <h5 className="subtext-md font-quicksand">Create Immersive Stories</h5>
                  <p className="subtext-sm">
                    Build engaging comic stories with interactive 3D scenes, and dialogues.
                  </p>
                </div>
              </div>
            </div>
            <div className="col-md-4 mb-4">
              <div className="card h-100 border-0 shadow-sm">
                <div className="card-body text-center">
                  <i className="fas fa-layer-group fa-3x text-primary mb-3"></i>
                  <h5 className="subtext-md font-quicksand">Manage Episodes</h5>
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
                  <h5 className="subtext-md font-quicksand">Share </h5>
                  <p className="subtext-sm">
                    Share your creations and invite collaborators to build with you.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Section */}
      <div className="row border-top bd-light mb-5 mx-auto">
        <div className="container text-center test-border mt-0 mx-auto opacity-full">
          <h5 className="subtext my-2 font-gillsans">
            For feedback & enquiries
          </h5>
        </div>
        
        <div className="container text-center my-3 mx-auto opacity-full">
          <div className="card mt-2 col-4 col-md-4 col-lg-2 mx-auto bg-light border-0 p-0">
            <Link 
              to="/contact/"
              className="btn subtext-btn-sm shadow p-1 mb-5 bg-body-tertiary justify-content-center font-weight-bolder text-dark rounded-5 my-auto" 
              style={{ backgroundColor: '#FFBC00' }}
            >
              <i className="fas fa-envelope me-2"></i>
              <strong> email us</strong>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;