import React, { useState, useRef } from 'react';
import { ImportService, DjangoExportData, ImportProgress } from '../services/importService';

interface StoryImporterProps {
  onImportComplete?: () => void;
}

const StoryImporter: React.FC<StoryImporterProps> = ({ onImportComplete }) => {
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    if (!file.name.endsWith('.json')) {
      alert('Please select a JSON file exported from Django admin.');
      return;
    }

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // Validate the data
      if (!ImportService.validateExportData(data)) {
        alert('Invalid export data. Please ensure this is a valid Django export file.');
        return;
      }

      setIsImporting(true);
      setProgress({
        currentStep: 'Preparing import...',
        progress: 0,
        total: 0,
        completed: 0,
        errors: []
      });

      // Create import service with progress callback
      const importService = new ImportService((progressUpdate) => {
        setProgress(progressUpdate);
      });

      // Start import
      await importService.importDjangoData(data);

      // Import completed
      setIsImporting(false);
      setProgress(null);
      
      if (onImportComplete) {
        onImportComplete();
      }

      alert('Import completed successfully!');

    } catch (error: any) {
      setIsImporting(false);
      alert(`Import failed: ${error.message}`);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="container mt-4">
      <div className="row justify-content-center">
        <div className="col-md-8">
          <div className="card">
            <div className="card-header">
              <h4 className="mb-0">
                <i className="fas fa-upload me-2"></i>
                Import Django Story Data
              </h4>
            </div>
            <div className="card-body">
              {!isImporting ? (
                <div>
                  <div className="mb-4">
                    <h5>How to Export from Django Admin:</h5>
                    <ol>
                      <li>Go to your Django admin panel</li>
                      <li>Navigate to <strong>Comics</strong> section</li>
                      <li>Select the stories you want to export</li>
                      <li>Choose <strong>"Export selected comics to JSON"</strong> action</li>
                      <li>Download the JSON file</li>
                    </ol>
                  </div>

                  <div
                    className={`border-2 border-dashed rounded p-5 text-center ${
                      dragActive ? 'border-primary bg-light' : 'border-secondary'
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    <i className="fas fa-cloud-upload-alt fa-3x text-muted mb-3"></i>
                    <h5>Drop your Django export file here</h5>
                    <p className="text-muted">or</p>
                    <button
                      className="btn btn-primary"
                      onClick={openFileDialog}
                    >
                      <i className="fas fa-folder-open me-2"></i>
                      Choose File
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json"
                      onChange={handleFileInputChange}
                      style={{ display: 'none' }}
                    />
                  </div>

                  <div className="mt-3">
                    <small className="text-muted">
                      <i className="fas fa-info-circle me-1"></i>
                      The import will create stories, seasons, episodes, and dialogues with all camera controls.
                    </small>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="mb-3">
                    <h5>Importing Stories...</h5>
                    <div className="progress">
                      <div
                        className="progress-bar progress-bar-striped progress-bar-animated"
                        style={{ width: `${progress?.progress || 0}%` }}
                      >
                        {Math.round(progress?.progress || 0)}%
                      </div>
                    </div>
                  </div>

                  <div className="mb-3">
                    <strong>Current Step:</strong> {progress?.currentStep}
                  </div>

                  <div className="mb-3">
                    <strong>Progress:</strong> {progress?.completed} / {progress?.total} items
                  </div>

                  {progress?.errors && progress.errors.length > 0 && (
                    <div className="alert alert-warning">
                      <h6>Errors:</h6>
                      <ul className="mb-0">
                        {progress.errors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoryImporter;
