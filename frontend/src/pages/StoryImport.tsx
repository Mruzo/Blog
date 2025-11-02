import React from 'react';
import { useNavigate } from 'react-router-dom';
import StoryImporter from '../components/StoryImporter';
import BackButton from '../components/BackButton';

const StoryImport: React.FC = () => {
  const navigate = useNavigate();

  const handleImportComplete = () => {
    // Navigate back to MyStudio after successful import
    navigate('/immersivecomics/my-studio/');
  };

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h2>
                <i className="fas fa-download me-2"></i>
                Import Stories
              </h2>
              <p className="text-muted mb-0">
                Import story data from your Django production app
              </p>
            </div>
            <BackButton to="/immersivecomics/my-studio/" />
          </div>
        </div>
      </div>

      <StoryImporter onImportComplete={handleImportComplete} />
    </div>
  );
};

export default StoryImport;
