import React from 'react';
import { useNavigate } from 'react-router-dom';
import StoryImporter from '../components/StoryImporter';
import BackButton from '../components/BackButton';

const StoryImport: React.FC = () => {
  const navigate = useNavigate();

  const handleImportComplete = () => {
    navigate('/immersivecomics/my-studio/');
  };

  return (
    <div className="product-landing">
      <section className="product-landing__section product-landing__hero">
        <div className="product-landing__container">
          <p className="product-landing__eyebrow">Data</p>
          <h1 className="product-landing__h1">Import stories</h1>
          <p className="product-landing__lead">
            Bring story data from your Django production app into this studio.
          </p>
        </div>
      </section>

      <section className="product-landing__section">
        <div className="product-landing__container">
          <div className="d-flex justify-content-end mb-3">
            <BackButton to="/immersivecomics/my-studio/" />
          </div>
          <StoryImporter onImportComplete={handleImportComplete} />
        </div>
      </section>
    </div>
  );
};

export default StoryImport;
