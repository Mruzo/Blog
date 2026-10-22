import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import MetaTags from '../components/MetaTags';
import MessagePopup from '../components/MessagePopup';

const Home: React.FC = () => {
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'success' | 'danger' | 'warning' | 'info'>('success');
  const [showMessage, setShowMessage] = useState(false);

  useEffect(() => {
    const logoutSuccess = sessionStorage.getItem('logoutSuccess');
    const loginSuccess = sessionStorage.getItem('loginSuccess');

    if (logoutSuccess === 'true') {
      setMessage('You have been successfully logged out.');
      setMessageType('success');
      setShowMessage(true);
      sessionStorage.removeItem('logoutSuccess');
    } else if (loginSuccess === 'true') {
      setMessage('Login successful! Welcome back.');
      setMessageType('success');
      setShowMessage(true);
      sessionStorage.removeItem('loginSuccess');
      sessionStorage.removeItem('loginSuccessRedirect');
    }
  }, []);

  const handleCloseMessage = () => {
    setShowMessage(false);
  };

  return (
    <div className="home-page">
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

      <header className="home-page__hero">
        <div className="home-page__heroInner">
          <p className="home-page__eyebrow">Question</p>
          <h1 className="home-page__headline home-page__headline--question landtext mb-3 land-border">
            If they could, what would Stop Signs talk about?
          </h1>
        </div>
      </header>

      <section className="home-page__section" aria-labelledby="home-about-heading">
        <h2 id="home-about-heading" className="home-page__sectionTitle test-border">
          About
        </h2>
        <div className="home-page__aboutCard">
          <p>
            A storyteller's studio for directing and sharing immersive stories. <br/> The medium of storytelling must continue to evolve. Justvybz gives you the opportunity to experience this evolution hands-on.
            <br />
            
          </p>
        </div>
      </section>

      <section className="home-page__section" aria-labelledby="home-features-heading">
        <h2 id="home-features-heading" className="home-page__sectionTitle test-border">
          Features
        </h2>
        <div className="home-page__grid">
          <article className="home-page__featureCard">
            <div className="home-page__featureIcon" aria-hidden>
              <i className="fas fa-pen" />
            </div>
            <h3 className="home-page__featureTitle">Write</h3>
            <p className="home-page__featureBody">
            Create your characters, dialogue, and scenes.
            </p>
          </article>
          <article className="home-page__featureCard">
            <div className="home-page__featureIcon" aria-hidden>
              <i className="fas fa-video" />
            </div>
            <h3 className="home-page__featureTitle">Direct</h3>
            <p className="home-page__featureBody">
            Build engaging scenes and dialogue-driven moments by controlling the camera angle and movement with simple sliders.
            </p>
          </article>
          <article className="home-page__featureCard">
            <div className="home-page__featureIcon" aria-hidden>
              <i className="fas fa-users" />
            </div>
            <h3 className="home-page__featureTitle">Share &amp; Collaborate</h3>
            <p className="home-page__featureBody">
              Share your work and invite collaborators to build immersive stories with you.
            </p>
          </article>
        </div>
      </section>

      <section className="home-page__section home-page__contact" aria-labelledby="home-contact-heading">
        <h2 id="home-contact-heading" className="home-page__sectionTitle test-border">
          For feedback &amp; enquiries
        </h2>
        <Link to="/contact/" className="home-page__ctaMail">
          <i className="fas fa-envelope" aria-hidden />
          <span>Email us</span>
        </Link>
      </section>
    </div>
  );
};

export default Home;
