import React, { useState, useRef } from 'react';
import { ImportService, ImportProgress } from '../services/importService';
import { useApi } from '../contexts/ApiContext';

interface StoryImporterProps {
  onImportComplete?: () => void;
}

const StoryImporter: React.FC<StoryImporterProps> = ({ onImportComplete }) => {
    const { currentUser } = useApi();

  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    if (!file.name.endsWith('.json')) {
      alert('Please select a JSON file exported from Django admin.');
      return;
    }

    // Check authentication before starting import
    // Only show error if explicitly not authenticated (null)
    // If undefined, user is still loading - let API handle auth check
    if (currentUser === null) {
      alert('Please log in to import stories. Import requires authentication.');
      return;
    }
    
    // If currentUser is undefined, it's still loading
    // Don't block - let the API call handle authentication
    // The API will return 403 if not authenticated, which we handle below

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
      setProgress(null);
      
      // Provide user-friendly error messages with detailed backend errors
      let errorMessage = 'Import failed';
      if (error?.response?.status === 403 || error?.response?.status === 401) {
        errorMessage = 'Authentication required. Please log in and try again.';
      } else if (error?.response?.status === 400) {
        // Extract detailed validation errors from backend
        const errorData = error?.response?.data;
        if (typeof errorData === 'string') {
          errorMessage = `Invalid data: ${errorData}`;
        } else if (errorData?.error) {
          errorMessage = `Invalid data: ${errorData.error}`;
        } else if (errorData?.detail) {
          errorMessage = `Invalid data: ${errorData.detail}`;
        } else if (typeof errorData === 'object') {
          // Format validation errors
          const errorMessages = Object.entries(errorData)
            .map(([field, errors]: [string, any]) => {
              if (Array.isArray(errors)) {
                return `${field}: ${errors.join(', ')}`;
              }
              return `${field}: ${errors}`;
            })
            .join('; ');
          if (errorMessages) {
            errorMessage = `Invalid data: ${errorMessages}`;
          } else {
            errorMessage = `Invalid data: ${error?.message || 'Please check your export file.'}`;
          }
        } else {
          errorMessage = `Invalid data: ${error?.message || 'Please check your export file.'}`;
        }
      } else if (error?.message) {
        errorMessage = `Import failed: ${error.message}`;
      }
      
      alert(errorMessage);
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
        <div className="col-md-10 p-0">
          <div className="card">
            {/* <div className="card-header">
              <h6 className="mb-0">
                <i className="fas fa-upload me-2"></i>
                Import Story
              </h6>
            </div> */}
            <div className="card-body p-1">
              {!isImporting ? (
                <div className="row">
                  {/* First Column: Tree Structure */}
                  <div className="col-12 col-md-6 mb-4 mb-md-0">
                    <div className="mb-4">
                      <h6 className="mt-1 subtext-btn-sm">Story Upload Structure</h6>
                      <div className="tree-container subtext-btn-sm" style={{ 
                        fontSize: '0.7rem',
                        padding: '2px',
                        background: '#f8f9fa',
                        borderRadius: '8px',
                        border: '1px solid #dee2e6'
                      }}>
                      <style>{`
                        .tree-container {
                          position: relative;
                        }
                        .tree-node {
                          position: relative;
                          margin: 8px 0;
                        }
                        .tree-node-box {
                          display: inline-block;
                          padding: 4px 7px;
                          background: white;
                          border: 2px solid #007bff;
                          border-radius: 6px;
                          box-shadow: 0 2px 6px rgba(0,0,0,0.15);
                          position: relative;
                          cursor: default;
                          transition: all 0.2s ease;
                        }
                        .tree-node-box:hover {
                          box-shadow: 0 4px 8px rgba(0,0,0,0.2);
                          transform: translateY(-1px);
                        }
                        .tree-node-box.primary { border-color: #007bff; background: #e7f3ff; }
                        .tree-node-box.info { border-color: #17a2b8; background: #d1ecf1; }
                        .tree-node-box.warning { border-color: #ffc107; background: #fff3cd; }
                        .tree-node-box.danger { border-color: #dc3545; background: #f8d7da; }
                        .tree-node-box.secondary { border-color: #6c757d; background: #e2e3e5; }
                        .tree-node-box.success { border-color: #28a745; background: #d4edda; }
                        
                        .tree-children {
                          margin-left: 10px;
                          margin-top: 8px;
                          position: relative;
                          padding-left: 15px;
                        }
                        /* Vertical line that goes upward from children to parent */
                        .tree-children::before {
                          content: '';
                          position: absolute;
                          left: 0;
                          top: -8px;
                          height: 0px;
                          width: 2px;
                          background: #6c757d;
                        }
                        /* Horizontal line from child node box to the vertical connector */
                        .tree-children .tree-node::before {
                          content: '';
                          position: absolute;
                          left: -25px;
                          top: 15px;
                          width: 13px;
                          height: 2px;
                          background: #6c757d;
                        }
                        /* Vertical line from child node upward to connect with horizontal line */
                        .tree-children .tree-node::after {
                          content: '';
                          position: absolute;
                          left: -25px;
                          top: 0;
                          width: 2px;
                          height: 15px;
                          background: #6c757d;
                        }
                        /* All children have the same upward connection */
                        .tree-children .tree-node:first-child::after,
                        .tree-children .tree-node:last-child::after {
                          height: 15px;
                        }
                        /* Extend connection from characters node to parent Story */
                        .tree-node.characters-node::before {
                          content: '';
                          position: absolute;
                          left: -15px;
                          top: 0;
                          width: 2px;
                          height: 0px;
                          background: #6c757d;
                        }
                        .tree-node.characters-node > .tree-node-box::before {
                          content: '';
                          position: absolute;
                          left: -15px;
                          top: 50%;
                          width: 13px;
                          height: 2px;
                          background: #6c757d;
                        }
                        .tree-node.characters-node > .tree-node-box::after {
                          content: '';
                          position: absolute;
                          left: -15px;
                          top: 0;
                          width: 2px;
                          height: 50%;
                          background: #6c757d;
                        }
        .tree-field {
          margin: 4px 0;
          padding: 4px 0 4px 9px;
          position: relative;
          color: #495057;
        }
        .tree-field::before {
          content: '▸';
          position: absolute;
          left: 0;
          color: #6c757d;
          font-size: 0.8em;
        }
                      `}</style>
                      
                      {/* Root Node */}
                      <div className="tree-node">
                        <div className="tree-node-box primary">
                          <strong>📄 JSON File</strong>
                        </div>
                        
                        {/* Level 1: Top-level properties */}
                        <div className="tree-children">
                          <div className="tree-node">
                            <div className="tree-node-box success">
                              <strong>Export info</strong> <span className="badge bg-danger ms-1">Required</span>
                            </div>
                          </div>
                          
                          <div className="tree-node">
                            <div className="tree-node-box success">
                              <strong>Stories</strong> <span className="text-muted">[array]</span> <span className="badge bg-danger ms-1">Required</span>
                            </div>
                            
                            {/* Level 2: Story */}
                            <div className="tree-children">
                              <div className="tree-node">
                                <div className="tree-node-box primary">
                                  <strong>Story</strong> <span className="text-muted small">(object)</span>
                                </div>
                                
                                {/* Level 3: Story fields */}
                                <div className="tree-children">
                                  <div className="tree-field">
                                    <strong>title</strong> <span className="badge bg-danger ms-1">Required</span>
                                  </div>
                                  <div className="tree-field">
                                    <strong>description</strong> <span className="badge bg-danger ms-1">Required</span>
                                  </div>
                                  
                                  <div className="tree-node">
                                    <div className="tree-node-box">
                                      <strong>Seasons</strong> <span className="text-muted">[array]</span> <span className="badge bg-danger ms-1">Required</span>
                                    </div>
                                    
                                    {/* Level 4: Season */}
                                    <div className="tree-children">
                                      <div className="tree-node">
                                        <div className="tree-node-box info">
                                          <strong>Season</strong> <span className="text-muted small">(object)</span>
                                        </div>
                                        
                                        {/* Level 5: Season fields */}
                                        <div className="tree-children">
                                          <div className="tree-field">
                                            <strong>title</strong> <span className="badge bg-danger ms-1">Required</span>
                                          </div>
                                          <div className="tree-field">
                                            <strong>season_number</strong> <span className="badge bg-danger ms-1">Required</span>
                                          </div>
                                          
                                          <div className="tree-node">
                                            <div className="tree-node-box">
                                              <strong>Episodes</strong> <span className="text-muted">[array]</span> <span className="badge bg-danger ms-1">Required</span>
                                            </div>
                                            
                                            {/* Level 6: Episode */}
                                            <div className="tree-children">
                                              <div className="tree-node">
                                                <div className="tree-node-box warning">
                                                  <strong>Episode</strong> <span className="text-muted small">(object)</span>
                                                </div>
                                                
                                                {/* Level 7: Episode fields */}
                                                <div className="tree-children">
                                                  <div className="tree-field">
                                                    <strong>title</strong> <span className="badge bg-danger ms-1">Required</span>
                                                  </div>
                                                  
                                                  <div className="tree-node">
                                                    <div className="tree-node-box">
                                                      <strong>Dialogues</strong> <span className="text-muted">[array]</span> <span className="badge bg-danger ms-1">Required</span>
                                                    </div>
                                                    
                                                    {/* Level 8: Dialogue */}
                                                    <div className="tree-children">
                                                      <div className="tree-node">
                                                        <div className="tree-node-box danger">
                                                          <strong>Dialogue</strong> <span className="text-muted small">(object)</span>
                                                        </div>
                                                        
                                                        {/* Level 9: Dialogue fields */}
                                                        <div className="tree-children">
                                                          <div className="tree-field">
                                                            <strong>text</strong> <span className="badge bg-danger ms-1">Required</span>
                                                          </div>
                                                          <div className="tree-field">
                                                            <strong>order</strong> <span className="badge bg-danger ms-1">Required</span>
                                                          </div>
                                                        </div>
                                                      </div>
                                                    </div>
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Level 3: Characters (optional) */}
                                  <div className="tree-node characters-node">
                                    <div className="tree-node-box">
                                      <strong>Characters</strong> <span className="text-muted">[array, optional]</span>
                                    </div>
                                    
                                    {/* Level 4: Character */}
                                    <div className="tree-children">
                                      <div className="tree-node">
                                        <div className="tree-node-box secondary">
                                          <strong>Character</strong> <span className="text-muted small">(object)</span>
                                        </div>
                                        
                                        {/* Level 5: Character fields */}
                                        <div className="tree-children">
                                          <div className="tree-field">
                                            <strong>name</strong> <span className="badge bg-danger ms-1">Required</span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <small className="text-muted mt-2 d-block subtext-btn-sm">
                      <i className="fas fa-info-circle me-1"></i>
                      All other fields are optional. Export from Django admin using "Export selected comics to JSON" action.
                    </small>
                  </div>
                </div>

                  {/* Second Column: Drag and Drop Area */}
                  <div className="col-12 col-md-6">
                    <div
                      className={`border-2 border-dashed rounded p-md-3 p-5 m-md-4 mb-7 text-center ${
                        dragActive ? 'border-primary bg-light' : 'border-secondary'
                      }`}
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                    >
                      <i className="fas fa-cloud-upload-alt fa-3x text-muted mb-3"></i>
                      <h5 className="subtext-btn-sm">Drop your exported json file here</h5>
                      <p className="text-muted subtext-btn-sm">or</p>
                      <button
                        className="btn btn-primary"
                        onClick={openFileDialog}
                      >
                        <i className="fas fa-folder-open me-2"></i>
                        &nbsp;Choose File
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
                      <small className="text-muted subtext-btn-sm">
                        <i className="fas fa-info-circle me-1"></i>
                        The import will create stories, seasons, episodes, and character dialogues.
                      </small>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="mb-3">
                    <h5 className="subtext-btn-sm">Importing Stories...</h5>
                    <div className="progress">
                      <div
                        className="progress-bar progress-bar-striped progress-bar-animated"
                        style={{ width: `${progress?.progress || 0}%` }}
                      >
                        {Math.round(progress?.progress || 0)}%
                      </div>
                    </div>
                  </div>

                  <div className="mb-3 subtext-btn-sm">
                    <strong>Current Step:</strong> {progress?.currentStep}
                  </div>

                  <div className="mb-3 subtext-btn-sm">
                    <strong>Progress:</strong> {progress?.completed} / {progress?.total} items
                  </div>

                  {progress?.errors && progress.errors.length > 0 && (
                    <div className="alert alert-warning">
                      <h6 className="subtext-btn-sm">Errors:</h6>
                      <ul className="mb-0 subtext-btn-sm">
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
