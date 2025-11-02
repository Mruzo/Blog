import React, { useState, useRef } from 'react';
import SmallButton from './SmallButton';
import Model3DPreview from './Model3DPreview';

interface Model3DUploadProps {
  onModelUpload?: (file: File) => void;
  onCameraDataChange?: (cameraData: any) => void;
  initialModelUrl?: string;
  initialCoverImage?: string;
  className?: string;
}

interface CameraData {
  orbit: {
    azimuth: number;
    polar: number;
    radius: number;
  };
  target: {
    x: number;
    y: number;
    z: number;
  };
  fieldOfView: number;
  zoomSpeed: number;
}

const Model3DUpload: React.FC<Model3DUploadProps> = ({
  onModelUpload,
  onCameraDataChange,
  initialModelUrl,
  initialCoverImage,
  className = ''
}) => {
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [modelUrl, setModelUrl] = useState<string | undefined>(initialModelUrl);
  const [coverImage, setCoverImage] = useState<string | undefined>(initialCoverImage);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string>('');
  const [cameraData, setCameraData] = useState<CameraData>({
    orbit: { azimuth: 0, polar: 75, radius: 3 },
    target: { x: 0, y: 1.6, z: 0 },
    fieldOfView: 45,
    zoomSpeed: 1.0
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverImageInputRef = useRef<HTMLInputElement>(null);

  const handleModelFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['.glb', '.gltf', '.usdz'];
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      
      if (!allowedTypes.includes(fileExtension)) {
        setError('Please upload a valid 3D model file (.glb, .gltf, or .usdz)');
        return;
      }

      // Validate file size (max 50MB)
      if (file.size > 50 * 1024 * 1024) {
        setError('File size must be less than 50MB');
        return;
      }

      setModelFile(file);
      setError('');
      
      // Create preview URL
      const url = URL.createObjectURL(file);
      setModelUrl(url);
      
      if (onModelUpload) {
        onModelUpload(file);
      }
    }
  };

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      
      if (!allowedTypes.includes(file.type)) {
        setError('Please upload a valid image file (JPEG, PNG, or WebP)');
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('Image size must be less than 10MB');
        return;
      }

      setCoverImageFile(file);
      setError('');
      
      // Create preview URL
      const url = URL.createObjectURL(file);
      setCoverImage(url);
    }
  };

  const handleUpload = async () => {
    if (!modelFile) {
      setError('Please select a 3D model file to upload');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // Here you would typically upload to your server
      // For now, we'll just simulate the upload
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setUploadProgress(100);
      setError('');
      
      // Reset form
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setModelFile(null);
      
    } catch (err) {
      setError('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCameraDataChange = (newCameraData: CameraData) => {
    setCameraData(newCameraData);
    if (onCameraDataChange) {
      onCameraDataChange(newCameraData);
    }
  };

  const handleSave = (cameraData: CameraData) => {
    console.log('Saving camera data:', cameraData);
    // Here you would save the camera data to your backend
  };

  const handleReset = () => {
    setCameraData({
      orbit: { azimuth: 0, polar: 75, radius: 3 },
      target: { x: 0, y: 1.6, z: 0 },
      fieldOfView: 45,
      zoomSpeed: 1.0
    });
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const triggerCoverImageInput = () => {
    coverImageInputRef.current?.click();
  };

  return (
    <div className={`model-3d-upload ${className}`}>
      {/* Upload Section */}
      <div className="container mt-4">
        <div className="row">
          <div className="col-md-6">
            <div className="card">
              <div className="card-header">
                <h5 className="subtext-btn mb-0">3D Model Upload</h5>
              </div>
              <div className="card-body">
                <div className="mb-3">
                  <label htmlFor="modelFile" className="form-label subtext-btn-sm">
                    3D Model File (.glb, .gltf, .usdz)
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="form-control form-control-sm"
                    id="modelFile"
                    accept=".glb,.gltf,.usdz"
                    onChange={handleModelFileChange}
                    style={{ display: 'none' }}
                  />
                  <div className="d-flex gap-2">
                    <SmallButton 
                      variant="outline-primary" 
                      onClick={triggerFileInput}
                      disabled={isUploading}
                    >
                      <i className="fas fa-upload me-1"></i>
                      {modelFile ? 'Change Model' : 'Select Model'}
                    </SmallButton>
                    {modelFile && (
                      <SmallButton 
                        variant="success" 
                        onClick={handleUpload}
                        disabled={isUploading}
                      >
                        <i className="fas fa-cloud-upload-alt me-1"></i>
                        {isUploading ? 'Uploading...' : 'Upload'}
                      </SmallButton>
                    )}
                  </div>
                  {modelFile && (
                    <div className="mt-2">
                      <small className="text-muted subtext-btn-sm">
                        Selected: {modelFile.name} ({(modelFile.size / 1024 / 1024).toFixed(2)} MB)
                      </small>
                    </div>
                  )}
                </div>

                <div className="mb-3">
                  <label htmlFor="coverImage" className="form-label subtext-btn-sm">
                    Cover Image (Optional)
                  </label>
                  <input
                    ref={coverImageInputRef}
                    type="file"
                    className="form-control form-control-sm"
                    id="coverImage"
                    accept="image/*"
                    onChange={handleCoverImageChange}
                    style={{ display: 'none' }}
                  />
                  <SmallButton 
                    variant="outline-secondary" 
                    onClick={triggerCoverImageInput}
                    disabled={isUploading}
                  >
                    <i className="fas fa-image me-1"></i>
                    {coverImage ? 'Change Cover' : 'Select Cover'}
                  </SmallButton>
                  {coverImageFile && (
                    <div className="mt-2">
                      <small className="text-muted subtext-btn-sm">
                        Selected: {coverImageFile.name} ({(coverImageFile.size / 1024 / 1024).toFixed(2)} MB)
                      </small>
                    </div>
                  )}
                </div>

                {isUploading && (
                  <div className="mb-3">
                    <div className="progress" style={{ height: '8px' }}>
                      <div 
                        className="progress-bar bg-success" 
                        role="progressbar" 
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                    <small className="text-muted subtext-btn-sm">
                      Uploading... {uploadProgress}%
                    </small>
                  </div>
                )}

                {error && (
                  <div className="alert alert-danger" role="alert">
                    <i className="fas fa-exclamation-triangle me-2"></i>
                    {error}
                  </div>
                )}

                <div className="mt-3">
                  <h6 className="subtext-btn-sm mb-2">Supported Formats:</h6>
                  <ul className="list-unstyled subtext-btn-sm text-muted">
                    <li><i className="fas fa-check me-1 text-success"></i>GLB (Binary GLTF)</li>
                    <li><i className="fas fa-check me-1 text-success"></i>GLTF (JSON GLTF)</li>
                    <li><i className="fas fa-check me-1 text-success"></i>USDZ (Apple AR)</li>
                  </ul>
                  <small className="text-muted">
                    <i className="fas fa-info-circle me-1"></i>
                    Maximum file size: 50MB for models, 10MB for images
                  </small>
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-6">
            <div className="card">
              <div className="card-header">
                <h5 className="subtext-btn mb-0">Camera Settings</h5>
              </div>
              <div className="card-body">
                <div className="current-values-box">
                  <h6 className="text-primary mb-2">Current Camera Position</h6>
                  <div><strong>Orbit:</strong> {cameraData.orbit.azimuth}° {cameraData.orbit.polar}° {cameraData.orbit.radius}m</div>
                  <div><strong>Target:</strong> {cameraData.target.x}m {cameraData.target.y}m {cameraData.target.z}m</div>
                  <div><strong>Field of View:</strong> {cameraData.fieldOfView}°</div>
                  <div><strong>Zoom Speed:</strong> {cameraData.zoomSpeed}x</div>
                </div>
                
                <div className="mt-3">
                  <small className="text-muted subtext-btn-sm">
                    <i className="fas fa-lightbulb me-1"></i>
                    Use the 3D preview below to adjust camera angles. Switch to Edit Mode to fine-tune settings.
                  </small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3D Model Preview */}
      {modelUrl && (
        <Model3DPreview
          modelUrl={modelUrl}
          coverImage={coverImage}
          onCameraChange={handleCameraDataChange}
          onSave={handleSave}
          onReset={handleReset}
          showControls={true}
        />
      )}

      {/* Instructions */}
      {!modelUrl && (
        <div className="container mt-4">
          <div className="card">
            <div className="card-body text-center py-5">
              <i className="fas fa-cube fa-3x text-muted mb-3"></i>
              <h5 className="subtext-btn mb-2">Upload a 3D Model</h5>
              <p className="subtext-btn-sm text-muted mb-3">
                Upload a 3D model file to preview and configure camera settings for your episode.
              </p>
              <SmallButton variant="primary" onClick={triggerFileInput}>
                <i className="fas fa-upload me-1"></i>Select 3D Model
              </SmallButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Model3DUpload;





