import React, { useState, useRef } from 'react';
import { StoryCreationData } from '../StoryCreationWizard';
import SmallButton from '../SmallButton';
import Model3DUpload from '../Model3DUpload';

interface ModelUploadStepProps {
  data: StoryCreationData;
  onDataUpdate: (data: Partial<StoryCreationData>) => void;
  onNext: () => void;
  onPrevious: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

const ModelUploadStep: React.FC<ModelUploadStepProps> = ({
  data,
  onDataUpdate,
  onNext,
  onPrevious,
  isFirstStep,
  isLastStep
}) => {
  const [file, setFile] = useState<File | null>(data.model.file);
  const [previewUrl, setPreviewUrl] = useState<string | null>(data.model.previewUrl);
  const [isUploading, setIsUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [cameraData, setCameraData] = useState({
    orbit: { azimuth: 0, polar: 75, radius: 3 },
    target: { x: 0, y: 1.6, z: 0 },
    fieldOfView: 45,
    zoomSpeed: 1.0
  });

  const handleModelUpload = (uploadedFile: File) => {
    setFile(uploadedFile);
    setErrors({});
    
    // Create preview URL
    const url = URL.createObjectURL(uploadedFile);
    setPreviewUrl(url);
    
    // Update data with uploaded file info
    onDataUpdate({
      model: {
        ...data.model,
        file: uploadedFile,
        previewUrl: url
      }
    });
  };

  const handleCameraDataChange = (newCameraData: any) => {
    setCameraData(newCameraData);
    
    // Update data with camera settings
    onDataUpdate({
      cameraPosition: `${newCameraData.orbit.azimuth}deg ${newCameraData.orbit.polar}deg ${newCameraData.orbit.radius}m`,
      cameraTarget: `${newCameraData.target.x}m ${newCameraData.target.y}m ${newCameraData.target.z}m`
    });
  };

  const handleNext = () => {
    if (!file) {
      setErrors({ file: 'Please upload a 3D model before proceeding' });
      return;
    }
    
    onNext();
  };

  return (
    <div>
      <div className="row">
        <div className="col-12">
          <h4 className="subtext-btn mb-4">3D Model Upload & Preview</h4>
          <p className="subtext-btn-sm text-muted mb-4">
            Upload a 3D model for your story and configure camera settings. This will be used in the preview and final story.
          </p>
        </div>
      </div>

      <Model3DUpload
        onModelUpload={handleModelUpload}
        onCameraDataChange={handleCameraDataChange}
        initialModelUrl={previewUrl || undefined}
        className="mb-4"
      />

      {errors.file && (
        <div className="alert alert-danger">
          <i className="fas fa-exclamation-triangle me-2"></i>
          {errors.file}
        </div>
      )}

      {file && (
        <div className="row mt-4">
          <div className="col-12">
            <div className="alert alert-success">
              <i className="fas fa-check-circle me-2"></i>
              <strong>3D model ready!</strong> You can now proceed to the preview step to finalize your story.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelUploadStep;
