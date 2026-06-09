import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useScrollPosition } from '../hooks/useScrollPosition';
import FloatingActionMenu from './FloatingActionMenu';
import CookieNotification from './CookieNotification';

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
      '/product/my-orders', // Full path for my-orders
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

  const path = location.pathname;
  const storiesActive =
    path === '/immersivecomics/' ||
    path === '/immersivecomics' ||
    path.startsWith('/immersivecomics/dashboard');
  const studiosActive = path.includes('/immersivecomics/studios');
  const storeActive =
    path.includes('/product') && !path.includes('my-orders');
  const profileStudioActive =
    path.includes('my-studio') ||
    path.includes('/studio/') ||
    path.includes('/story/') ||
    path.includes('/season/') ||
    path.includes('/episode/') ||
    path.includes('/characters/') ||
    path.includes('/collaborators/');
  const myOrdersActive = path.includes('my-orders');

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navbar — logo, primary destinations (desktop inline / mobile bottom bar via #default-navbar), account */}
      <nav
        className="navbar navbar-expand-lg navbar-light border-bottom w-100 app-site-header"
        style={{ backgroundColor: '#ffbc00' }}
      >
        <div className="container-fluid px-2 px-md-3 app-site-header__inner">
          <Link className="navbar-brand p-0 app-site-header__brand" to="/">
            <img
              src={process.env.REACT_APP_STATIC_URL ? `${process.env.REACT_APP_STATIC_URL}snmov/img/jv_header%201.2.svg` : "/jv_header.svg"}
              alt="VYBZ Logo - Updated"
              height="40"
            />
          </Link>

          <div
            id="default-navbar"
            className={`navbar-state-default app-site-header__navTray navbar-buttons-container ${showProfileNavbar ? 'hidden' : 'show'}`}
          >
            <Link
              to="/immersivecomics/"
              className={`app-site-header__link${storiesActive ? ' active' : ''}`}
            >
              <i className="fas fa-play" aria-hidden />
              <span>Stories</span>
            </Link>
            <Link
              to="/immersivecomics/studios/"
              className={`app-site-header__link${studiosActive ? ' active' : ''}`}
            >
              <i className="fas fa-clapperboard" aria-hidden />
              <span>Studios</span>
            </Link>
            <Link
              to="/product/"
              className={`app-site-header__link${storeActive ? ' active' : ''}`}
            >
              <i className="fas fa-store" aria-hidden />
              <span>Store</span>
            </Link>
          </div>

          <div className="d-flex align-items-center font-quicksand app-site-header__actions">
            {isAuthenticated ? (
              <Link
                to="/immersivecomics/my-studio/"
                className="btn btn-light btn-sm mx-1 mx-sm-2 px-2"
                id="profile-btn"
                onClick={switchToProfileNavbar}
              >
                <i className="fas fa-user" />
                <span className="d-none d-sm-inline ms-1">
                  &nbsp;{user?.first_name || user?.username || 'Profile'}
                </span>
              </Link>
            ) : (
              <Link to="/login/" className="btn btn-light btn-sm mx-1 mx-sm-2 px-2" id="login-btn">
                <i className="fas fa-sign-in-alt" />
                <span className="d-none d-sm-inline ms-1"> Login</span>
              </Link>
            )}
            <Link to="/product/cart/" className="btn btn-light btn-sm px-2 ms-1 ms-sm-2 position-relative">
              <i className="fas fa-shopping-cart" />
              <span
                className={`position-absolute top-0 start-100 translate-middle badge rounded-pill ${cartCount > 0 ? 'bg-success' : 'bg-danger'}`}
              >
                {cartCount}
              </span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Profile navbar — same pill links as #default-navbar (esp. mobile bottom bar) */}
      <div className="border-bottom w-100">
        <div className="container-fluid px-0">
          <div
            id="profile-navbar"
            className={`navbar-state-profile navbar-buttons-container app-site-header__navTray ${showProfileNavbar ? 'show' : 'hidden'}`}
          >
            <Link
              to="/immersivecomics/"
              className={`app-site-header__link${storiesActive ? ' active' : ''}`}
              onClick={switchToDefaultNavbar}
            >
              <i className="fas fa-play" aria-hidden />
              <span>Stories</span>
            </Link>
            <Link
              to="/immersivecomics/my-studio/"
              className={`app-site-header__link${profileStudioActive ? ' active' : ''}`}
            >
              <i className="fas fa-user" aria-hidden />
              <span>My Studio</span>
            </Link>
            <Link
              to="/product/my-orders/"
              className={`app-site-header__link${myOrdersActive ? ' active' : ''}`}
            >
              <i className="fas fa-receipt" aria-hidden />
              <span>My Orders</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-grow-1">
        {children}
      </main>

      {/* Floating Action Menu (combines feedback and create story buttons) */}
      <FloatingActionMenu />

      {/* Cookie Notification */}
      <CookieNotification />

      {/* Footer */}
      <footer className="card border-top py-5 d-flex flex-column justify-content-end">
        <div className="container d-flex flex-column justify-content-end flex-grow-1">
          <div className="row">
            <div className="col-12 text-center">
              
              {/* Policy Links and Copyright */}
              <div className="mb-4">
                <div className="policy-links subtext-btn-sm mb-3">
                  <a href="/terms" className="text-dark mx-1 text-decoration-none hover-underline">Terms of Service</a>
                  <span className="text-muted">|</span>
                  <a href="/privacy" className="text-dark mx-1 text-decoration-none hover-underline">Privacy Policy</a>
                  <span className="text-muted">|</span>
                  <a href="/cookies/" className="text-dark mx-1 text-decoration-none hover-underline">Cookie Policy</a>
                  <span className="text-muted">|</span>
                  <Link to="/contact/" className="text-dark mx-1 text-decoration-none hover-underline">
                    Contact us
                  </Link>
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