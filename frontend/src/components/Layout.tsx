import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useScrollPosition } from '../hooks/useScrollPosition';
import FloatingFeedbackButton from './FloatingFeedbackButton';

interface LayoutProps {
  children: React.ReactNode;
  user?: {
    first_name?: string;
    username?: string;
  } | null;
}

const Layout: React.FC<LayoutProps> = ({ children, user }) => {
  const location = useLocation();
  const isAuthenticated = !!user; // Check if user exists
  const [showProfileNavbar, setShowProfileNavbar] = useState(false);
  const { cartCount } = useCart(); // Get cart count from context
  
  // Initialize scroll position management
  useScrollPosition();

  // Automatically show profile navbar on profile-related pages
  useEffect(() => {
    const profilePaths = [
      '/my-studio',
      '/studio/',
      '/story/',
      '/season/',
      '/episode/',
      '/characters/',
      '/collaborators/',
      '/my-orders',
      '/immersivecomics/my-studio', // Full path for my-studio
      '/immersivecomics/studio/', // Full path for studio pages
      '/immersivecomics/story/', // Full path for story pages
      '/immersivecomics/season/', // Full path for season pages
      '/immersivecomics/episode/', // Full path for episode pages
      '/immersivecomics/characters/', // Full path for characters pages
      '/immersivecomics/collaborators/', // Full path for collaborators pages
      '/product/my-orders' // Full path for my-orders
    ];
    
    const isProfilePage = profilePaths.some(path => location.pathname.includes(path));
    setShowProfileNavbar(isProfilePage);
  }, [location.pathname]);

  // Function to switch to profile navbar
  const switchToProfileNavbar = () => {
    setShowProfileNavbar(true);
  };

  // Function to switch to default navbar
  const switchToDefaultNavbar = () => {
    setShowProfileNavbar(false);
  };

  // Shared button styles to ensure consistency
  const getButtonStyle = (isActive: boolean) => ({
    ...(isActive ? {
      backgroundColor: 'rgba(255, 188, 0, 0.1) !important',
      border: '2px solid #FFBC00 !important',
      whiteSpace: 'nowrap',
      margin: '0 4px'
    } : {
      whiteSpace: 'nowrap',
      margin: '0 4px'
    })
  });

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navbar */}
      <nav className="navbar navbar-expand-lg navbar-light border-bottom w-100" style={{ backgroundColor: '#ffbc00' }}>
        <div className="container-fluid px-0">
          <Link className="navbar-brand p-0" to="/">
            <img 
              src={process.env.REACT_APP_STATIC_URL ? `${process.env.REACT_APP_STATIC_URL}snmov/img/jv_header%201.2.svg` : "/jv_header.svg"} 
              alt="VYBZ Logo - Updated" 
              height="40"
            />
          </Link>
          
          <div className="d-flex align-items-center font-quicksand">
            {isAuthenticated ? (
              <Link 
                to="/immersivecomics/my-studio/" 
                className="btn btn-light btn-sm mx-2 px-2" 
                id="profile-btn"
                onClick={switchToProfileNavbar}
              >
                <i className="fas fa-user"></i>
                <span className="d-none d-sm-inline ms-1">
                  &nbsp;{user?.first_name || user?.username || 'Profile'}
                </span>
              </Link>
            ) : (
              <Link to="/login/" className="btn btn-light btn-sm mx-2 px-2" id="login-btn">
                <i className="fas fa-sign-in-alt"></i>
                <span className="d-none d-sm-inline ms-1"> Login</span>
              </Link>
            )}
            <Link to="/product/cart/" className="btn btn-light btn-sm px-2 ms-2 position-relative">
              <i className="fas fa-shopping-cart"></i>
              <span className={`position-absolute top-0 start-100 translate-middle badge rounded-pill ${cartCount > 0 ? 'bg-success' : 'bg-danger'}`}>
                {cartCount}
              </span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Navigation Buttons */}
      <div className="border-bottom w-100">
        <div className="container-fluid px-0">
          <div 
            id="default-navbar" 
            className={`navbar-state-default d-flex justify-content-center align-items-center py-2 navbar-buttons-container ${showProfileNavbar ? 'hidden' : 'show'}`} 
            style={{ flexWrap: 'nowrap', width: '100%' }}
          >
            <Link 
              to="/immersivecomics/" 
              className={`btn btn-light btn-sm px-3 subtext-btn-sm nav-btn ${location.pathname === '/immersivecomics/' ? 'active' : ''}`}
              style={getButtonStyle(location.pathname === '/immersivecomics/')}
            >
              <i className="fas fa-play me-1" style={{ fontSize: '1em', verticalAlign: 'middle', lineHeight: 'inherit' }}></i>
              <span> Stories</span>
            </Link>
            <Link 
              to="/immersivecomics/studios/" 
              className={`btn btn-light btn-sm px-3 subtext-btn-sm nav-btn ${location.pathname.includes('studios') ? 'active' : ''}`}
              style={getButtonStyle(location.pathname.includes('studios'))}
            >
              <i className="fas fa-clapperboard me-1" style={{ fontSize: '1em', verticalAlign: 'middle', lineHeight: 'inherit' }}></i>
              <span> Studios</span>
            </Link>
            <Link 
              to="/product/" 
              className={`btn btn-light btn-sm px-3 subtext-btn-sm nav-btn ${location.pathname.includes('product') ? 'active' : ''}`}
              style={getButtonStyle(location.pathname.includes('product'))}
            >
              <i className="fas fa-store me-1" style={{ fontSize: '1em', verticalAlign: 'middle', lineHeight: 'inherit' }}></i>
              <span> Store</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Profile navbar state */}
      <div className="border-bottom w-100">
        <div className="container-fluid px-0">
          <div 
            id="profile-navbar" 
            className={`navbar-state-profile d-flex justify-content-center align-items-center py-2 navbar-buttons-container ${showProfileNavbar ? 'show' : 'hidden'}`} 
            style={{ flexWrap: 'nowrap', width: '100%' }}
          >
            <Link 
              to="/immersivecomics/" 
              className="btn btn-light btn-sm px-3 subtext-btn-sm nav-btn"
              style={getButtonStyle(false)}
              onClick={switchToDefaultNavbar}
            >
              <i className="fas fa-play me-1" style={{ fontSize: '1em', verticalAlign: 'middle', lineHeight: 'inherit' }}></i>
              <span> Stories</span>
            </Link>
            <Link 
              to="/immersivecomics/my-studio/" 
              className={`btn btn-light btn-sm px-3 subtext-btn-sm nav-btn ${location.pathname.includes('my-studio') || location.pathname.includes('/studio/') || location.pathname.includes('/story/') || location.pathname.includes('/season/') || location.pathname.includes('/episode/') || location.pathname.includes('/characters/') || location.pathname.includes('/collaborators/') ? 'active' : ''}`}
              style={getButtonStyle(location.pathname.includes('my-studio') || location.pathname.includes('/studio/') || location.pathname.includes('/story/') || location.pathname.includes('/season/') || location.pathname.includes('/episode/') || location.pathname.includes('/characters/') || location.pathname.includes('/collaborators/'))}
            >
              <i className="fas fa-user me-1" style={{ fontSize: '1em', verticalAlign: 'middle', lineHeight: 'inherit' }}></i>
              <span> My Studio</span>
            </Link>
            <Link 
              to="/product/my-orders/" 
              className={`btn btn-light btn-sm px-3 subtext-btn-sm nav-btn ${location.pathname.includes('my-orders') ? 'active' : ''}`}
              style={getButtonStyle(location.pathname.includes('my-orders'))}
            >
              <i className="fas fa-receipt me-1" style={{ fontSize: '1em', verticalAlign: 'middle', lineHeight: 'inherit' }}></i>
              <span> My Orders</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-grow-1">
        {children}
      </main>

      {/* Floating Feedback Button */}
      <FloatingFeedbackButton />

      {/* Footer */}
      <footer className="card border-top py-5 d-flex flex-column justify-content-end">
        <div className="container d-flex flex-column justify-content-end flex-grow-1">
          <div className="row">
            <div className="col-12 text-center">
              
              {/* Policy Links and Copyright */}
              <div className="mb-4">
                <div className="policy-links subtext-sm mb-3">
                  <a href="/terms" className="text-dark mx-1 text-decoration-none hover-underline">Terms of Service</a>
                  <span className="text-muted">|</span>
                  <a href="/privacy" className="text-dark mx-1 text-decoration-none hover-underline">Privacy Policy</a>
                  <span className="text-muted">|</span>
                  <a href="/cookies/" className="text-dark mx-1 text-decoration-none hover-underline">Cookie Policy</a>
                </div>
              </div>

              {/* Logo */}
              <div className="mb-4">
                <a href="/">
                  <img src={process.env.REACT_APP_STATIC_URL ? `${process.env.REACT_APP_STATIC_URL}snmov/img/logo%2080x80.svg` : "/logo-80x80.svg"} alt="VYBZ Logo" width="100" height="100" />
                </a>
                <div className="footer-copyright subtext-btn-sm">
                  <p className="mt-2">&copy; {new Date().getFullYear()} Justvybz Inc.</p>
                </div>
              </div>

              {/* Powered By */}
              <div className="powered-by">
                <p className="mb-2 subtext-btn-sm">Powered by</p>
                <a href="https://www.misteruzo.com" target="_blank" rel="noopener noreferrer">
                  <img src={process.env.REACT_APP_STATIC_URL ? `${process.env.REACT_APP_STATIC_URL}snmov/img/powered-by-logo.png` : "/powered-by-logo.png"} alt="powered by Logo" width="50" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;