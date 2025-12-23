import React from 'react';
import { Link } from 'react-router-dom';
import BackButton from '../components/BackButton';

const CookiePolicy: React.FC = () => {
  const currentDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <div className="container mt-4" style={{ maxWidth: '900px' }}>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="subtext-btn mb-0">Cookie Policy</h1>
        <BackButton to="/" />
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body p-4">
          <p className="text-muted small text-center mb-4">Last updated: {currentDate}</p>

          <div className="policy-content">
            <p className="lead mb-4">
              Justvybz Inc. ("us", "we", or "our") uses cookies on www.justvybz.com (the "Platform"). This policy 
              explains how we use cookies and similar technologies to provide, customize, evaluate, improve, and protect 
              our immersive storytelling platform.
            </p>

            <h2 className="h4 mt-5 mb-3">What are Cookies?</h2>
            <p>
              Cookies are small text files that are stored on your device when you visit our Platform. They help make our 
              Platform work efficiently and provide us with analytical information that helps improve your storytelling experience.
            </p>

            <h2 className="h4 mt-5 mb-3">How We Use Cookies</h2>
            <p>We use cookies for the following purposes:</p>
            <ul className="list-group list-group-flush mb-4">
              <li className="list-group-item bg-transparent">
                <i className="fas fa-check-circle text-success me-2"></i>
                Essential cookies: Required for the Platform to function properly, including story creation tools, 
                collaboration features, and secure authentication
              </li>
              <li className="list-group-item bg-transparent">
                <i className="fas fa-check-circle text-success me-2"></i>
                Authentication cookies: Remember your login status, story preferences, and creative workspace settings
              </li>
              <li className="list-group-item bg-transparent">
                <i className="fas fa-check-circle text-success me-2"></i>
                Story experience cookies: Remember your reading progress, favorite stories, and viewing preferences
              </li>
              <li className="list-group-item bg-transparent">
                <i className="fas fa-check-circle text-success me-2"></i>
                Analytics cookies: Help us understand how creators and readers interact with stories to improve our storytelling tools
              </li>
              <li className="list-group-item bg-transparent">
                <i className="fas fa-check-circle text-success me-2"></i>
                E-Commerce cookies (if applicable): Remember shopping cart contents and checkout preferences
              </li>
            </ul>

            <h2 className="h4 mt-5 mb-3">Types of Cookies We Use</h2>
            <div className="table-responsive">
              <table className="table table-hover">
                <thead className="table-light">
                  <tr>
                    <th className="border-top-0">Type</th>
                    <th className="border-top-0">Purpose</th>
                    <th className="border-top-0">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Session Cookies</strong></td>
                    <td>Maintain your storytelling session, story creation progress, and collaboration workspace</td>
                    <td>Deleted when browser closes</td>
                  </tr>
                  <tr>
                    <td><strong>Persistent Cookies</strong></td>
                    <td>Remember your login information, story preferences, reading progress, and creative settings</td>
                    <td>Up to 12 months</td>
                  </tr>
                  <tr>
                    <td><strong>Analytics Cookies</strong></td>
                    <td>Understand how creators and readers engage with stories to improve our storytelling platform</td>
                    <td>Up to 24 months</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h2 className="h4 mt-5 mb-3">Your Cookie Choices</h2>
            <p>
              You can control cookies through your browser settings. However, please note that disabling certain cookies may 
              affect the functionality of our Platform and your storytelling experience. Your options include:
            </p>
            <ul className="list-group list-group-flush mb-4">
              <li className="list-group-item bg-transparent">
                <i className="fas fa-check-circle text-success me-2"></i>Accepting all cookies
              </li>
              <li className="list-group-item bg-transparent">
                <i className="fas fa-check-circle text-success me-2"></i>Notifying you when cookies are being sent
              </li>
              <li className="list-group-item bg-transparent">
                <i className="fas fa-check-circle text-success me-2"></i>Rejecting all cookies
              </li>
            </ul>

            <h2 className="h4 mt-5 mb-3">Browser-Specific Cookie Management</h2>
            <p>To manage cookies in your browser, visit the following links:</p>
            <div className="list-group mb-4">
              <a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="list-group-item list-group-item-action">
                <i className="fab fa-chrome me-2"></i>Google Chrome
              </a>
              <a href="https://support.mozilla.org/en-US/kb/enhanced-tracking-protection-firefox-desktop" target="_blank" rel="noopener noreferrer" className="list-group-item list-group-item-action">
                <i className="fab fa-firefox me-2"></i>Mozilla Firefox
              </a>
              <a href="https://support.apple.com/guide/safari/manage-cookies-sfri11471" target="_blank" rel="noopener noreferrer" className="list-group-item list-group-item-action">
                <i className="fab fa-safari me-2"></i>Safari
              </a>
              <a href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noopener noreferrer" className="list-group-item list-group-item-action">
                <i className="fab fa-edge me-2"></i>Microsoft Edge
              </a>
            </div>

            <h2 className="h4 mt-5 mb-3">Updates to This Policy</h2>
            <p>
              We may update this Cookie Policy to reflect changes in our practices or for operational, legal, or regulatory 
              reasons. The date at the top of this policy indicates when it was last updated.
            </p>

            <h2 className="h4 mt-5 mb-3">Contact Us</h2>
            <p>If you have questions about our Cookie Policy, please contact us at:</p>
            <div className="card bg-light border-0 p-4 mb-4">
              <div className="card-body">
                <p className="mb-2">
                  <i className="fas fa-envelope me-2"></i>
                  Email: <a href="mailto:Justvybz@justvybz.com" className="text-decoration-none">Justvybz@justvybz.com</a>
                </p>
                <p className="mb-0">
                  <i className="fas fa-globe me-2"></i>
                  Website: <Link to="/contact/" className="text-decoration-none">www.justvybz.com/contact</Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookiePolicy;

