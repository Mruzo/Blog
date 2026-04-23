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
          <p className="home-page__eyebrow">JustVybz Studios</p>
          <h1 className="home-page__headline landtext mb-3 land-border">
            <span className="d-block">INSPIRATION</span>
            <span className="home-page__headlineMeet font-quicksand-italic d-block">meets</span>
            <span className="d-block">INNOVATION</span>
          </h1>
          <p className="home-page__tagline">
            Build and share immersive 3D comics. <br /> Check out our innovative desk mat designs.
          </p>
        </div>
      </header>

      <section className="home-page__section" aria-labelledby="home-about-heading">
        <h2 id="home-about-heading" className="home-page__sectionTitle test-border">
          About us
        </h2>
        <div className="home-page__aboutCard">
          <p>
            {`Justvybz is your platform for creating and experiencing immersive comics. We provide tools that help you reimagine your traditional comic.`}
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
              <i className="fas fa-cube" />
            </div>
            <h3 className="home-page__featureTitle">Create immersive stories</h3>
            <p className="home-page__featureBody">
              Build engaging comics with interactive 3D scenes and dialogue-driven moments.
            </p>
          </article>
          <article className="home-page__featureCard">
            <div className="home-page__featureIcon" aria-hidden>
              <i className="fas fa-layer-group" />
            </div>
            <h3 className="home-page__featureTitle">Manage episodes</h3>
            <p className="home-page__featureBody">
              Organize seasons and episodes with rich media and a clear creative workflow.
            </p>
          </article>
          <article className="home-page__featureCard">
            <div className="home-page__featureIcon" aria-hidden>
              <i className="fas fa-share-alt" />
            </div>
            <h3 className="home-page__featureTitle">Share &amp; collaborate</h3>
            <p className="home-page__featureBody">
              Share your work and invite collaborators to build immersive worlds with you.
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
