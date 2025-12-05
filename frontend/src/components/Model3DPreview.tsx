import React, { useState, useRef, useEffect } from 'react';
import AnimationController from './AnimationController';
import SmallButton from './SmallButton';
import './Comic3DViewer.css';

interface Model3DPreviewProps {
  modelUrl?: string;
  coverImage?: string;
  onCameraChange?: (cameraData: CameraData) => void;
  onSave?: (cameraData: CameraData) => void;
  onReset?: () => void;
  showControls?: boolean;
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

const Model3DPreview: React.FC<Model3DPreviewProps> = ({
  modelUrl,
  coverImage,
  onCameraChange,
  onSave,
  onReset,
  showControls = true,
  className = ''
}) => {
  const [isPreviewMode, setIsPreviewMode] = useState(true);
  const [showEditingOverlay, setShowEditingOverlay] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [showStartButton, setShowStartButton] = useState(true);
  
  // Camera state
  const [cameraData, setCameraData] = useState<CameraData>({
    orbit: { azimuth: 0, polar: 75, radius: 3 },
    target: { x: 0, y: 1.6, z: 0 },
    fieldOfView: 45,
    zoomSpeed: 1.0
  });

  const [currentValues, setCurrentValues] = useState<CameraData>(cameraData);
  const modelViewerRef = useRef<any>(null);

  // Initialize model viewer when component mounts
  useEffect(() => {
    if (modelViewerRef.current && modelUrl) {
      const modelViewer = modelViewerRef.current;
      
      // Set up event listeners
      modelViewer.addEventListener('load', () => {
        setIsModelLoaded(true);
        setShowStartButton(false);
      });

      // Update camera when model viewer changes
      modelViewer.addEventListener('camera-change', () => {
        const orbit = modelViewer.cameraOrbit;
        const target = modelViewer.cameraTarget;
        const fov = modelViewer.fieldOfView;
        
        // Parse orbit string (e.g., "0deg 75deg 3m")
        const orbitMatch = orbit.match(/([-\d.]+)deg\s+([-\d.]+)deg\s+([-\d.]+)m/);
        const targetMatch = target.match(/([-\d.]+)m\s+([-\d.]+)m\s+([-\d.]+)m/);
        
        if (orbitMatch && targetMatch) {
          const newCameraData: CameraData = {
            orbit: {
              azimuth: parseFloat(orbitMatch[1]),
              polar: parseFloat(orbitMatch[2]),
              radius: parseFloat(orbitMatch[3])
            },
            target: {
              x: parseFloat(targetMatch[1]),
              y: parseFloat(targetMatch[2]),
              z: parseFloat(targetMatch[3])
            },
            fieldOfView: parseFloat(fov.replace('deg', '')),
            zoomSpeed: cameraData.zoomSpeed
          };
          
          setCameraData(newCameraData);
          if (onCameraChange) {
            onCameraChange(newCameraData);
          }
        }
      });
    }
  }, [modelUrl, onCameraChange]);

  const handleModeToggle = (mode: 'preview' | 'edit') => {
    setIsPreviewMode(mode === 'preview');
    setShowEditingOverlay(mode === 'edit');
  };

  const handleStartEpisode = () => {
    setShowStartButton(false);
    setIsModelLoaded(true);
  };

  const handleSliderChange = (property: string, value: number) => {
    const newCameraData = { ...cameraData };
    
    if (property.startsWith('orbit.')) {
      const field = property.split('.')[1] as keyof CameraData['orbit'];
      newCameraData.orbit[field] = value;
    } else if (property.startsWith('target.')) {
      const field = property.split('.')[1] as keyof CameraData['target'];
      newCameraData.target[field] = value;
    } else if (property === 'fieldOfView') {
      newCameraData.fieldOfView = value;
    } else if (property === 'zoomSpeed') {
      newCameraData.zoomSpeed = value;
    }
    
    setCameraData(newCameraData);
    
    // Update model viewer
    if (modelViewerRef.current) {
      const modelViewer = modelViewerRef.current;
      const orbitString = `${newCameraData.orbit.azimuth}deg ${newCameraData.orbit.polar}deg ${newCameraData.orbit.radius}m`;
      const targetString = `${newCameraData.target.x}m ${newCameraData.target.y}m ${newCameraData.target.z}m`;
      
      modelViewer.cameraOrbit = orbitString;
      modelViewer.cameraTarget = targetString;
      modelViewer.fieldOfView = `${newCameraData.fieldOfView}deg`;
    }
  };

  const handleSave = () => {
    setCurrentValues(cameraData);
    if (onSave) {
      onSave(cameraData);
    }
  };

  const handleReset = () => {
    setCameraData(currentValues);
    if (onReset) {
      onReset();
    }
  };

  const formatValue = (value: number, type: string) => {
    if (type === 'angle') return `${value.toFixed(1)}°`;
    if (type === 'distance') return `${value.toFixed(1)}m`;
    if (type === 'speed') return `${value.toFixed(1)}x`;
    return value.toString();
  };

  return (
    <div className={`comic-3d-viewer model-3d-preview ${className}`}>
      {/* Control Panel */}
      

      {/* 3D Model Container */}
      <div className="container">
        <div className="card model-container mb-2 position-relative" style={{ height: '400px' }}>
          {/* Overlay Image with Start Button */}
          {showStartButton && coverImage && (
            <div 
              className="overlay-container position-absolute top-0 start-0 w-100 h-100" 
              style={{ pointerEvents: 'auto', zIndex: 2 }}
            >
              <img 
                src={coverImage} 
                alt="Episode Cover" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <button 
                className="btn btn-primary position-absolute" 
                style={{ 
                  top: '90%', 
                  left: '50%', 
                  transform: 'translate(-50%, -50%)', 
                  zIndex: 3, 
                  padding: '1rem 2rem', 
                  fontSize: '1.2rem', 
                  fontWeight: 'bold', 
                  textTransform: 'uppercase', 
                  letterSpacing: '1px'
                }}
                onClick={handleStartEpisode}
              >
                Start Episode
              </button>
            </div>
          )}

          {modelUrl ? (
            <div style={{ width: '100%', height: '100%', position: 'relative' }}>
              {/* Animation Controller */}
              
              {/* Direct model-viewer element */}
              <model-viewer
                ref={modelViewerRef}
                src={modelUrl}
                alt="3D Scene"
                shadow-intensity="1"
                exposure="1"
                interaction-prompt="none"
                interpolation-decay="200"
                interpolation="cubic-bezier(0.82,-0.03,0.11,1)"
                min-camera-orbit="auto auto 1m"
                max-camera-orbit="auto auto 30m"
                min-field-of-view="10deg"
                max-field-of-view="90deg"
                animation-name=""
                animation-crossfade-duration="0.5"
                auto-rotate-delay="0"
                camera-orbit={`${cameraData.orbit.azimuth}deg ${cameraData.orbit.polar}deg ${cameraData.orbit.radius}m`}
                camera-target={`${cameraData.target.x}m ${cameraData.target.y}m ${cameraData.target.z}m`}
                field-of-view={`${cameraData.fieldOfView}deg`}
                camera-controls
                style={{ width: '100%', height: '100%' }}
              >
                <div className="position-absolute top-0 start-0 w-100 h-100" style={{ pointerEvents: 'none' }}>
                  <div className="position-absolute top-0 start-0 m-3">
                    <div className="bg-dark text-white p-2 rounded" style={{ fontSize: '0.8rem', fontFamily: 'quicksand, sans-serif' }}>
                      <i className="fas fa-cube me-1"></i>
                      3D Scene
                    </div>
                  </div>
                </div>
              </model-viewer>
            </div>
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fa' }}>
              <p className="text-muted">3D model not available</p>
            </div>
          )}
        </div>
      </div>

      {/* Editing Controls Overlay */}
      {showEditingOverlay && (
        <div className="container mt-3 col-md-6 px-0">
          <div className="modern-card">
            <div className="modern-card-header">
              <span className="modern-card-title">Camera Editing Controls</span>
            </div>
            <div className="modern-card-body row g-3">
              {/* Camera Orbit (Left Column) */}
              <div className="col-md-6 mt-0">
                <div className="section-header">Camera Orbit</div>
                <div className="form-group mb-3">
                  <label htmlFor="orbitAzimuth" className="form-label">Azimuth</label>
                  <div className="slider-row">
                    <input 
                      type="range" 
                      id="orbitAzimuth" 
                      className="form-range modern-slider" 
                      min="-180" 
                      max="180" 
                      step="1"
                      value={cameraData.orbit.azimuth}
                      onChange={(e) => handleSliderChange('orbit.azimuth', parseFloat(e.target.value))}
                    />
                    <span className="value-badge">{formatValue(cameraData.orbit.azimuth, 'angle')}</span>
                  </div>
                </div>
                <div className="form-group mb-3">
                  <label htmlFor="orbitPolar" className="form-label">Polar</label>
                  <div className="slider-row">
                    <input 
                      type="range" 
                      id="orbitPolar" 
                      className="form-range modern-slider" 
                      min="0" 
                      max="180" 
                      step="1"
                      value={cameraData.orbit.polar}
                      onChange={(e) => handleSliderChange('orbit.polar', parseFloat(e.target.value))}
                    />
                    <span className="value-badge">{formatValue(cameraData.orbit.polar, 'angle')}</span>
                  </div>
                </div>
                <div className="form-group mb-3">
                  <label htmlFor="orbitRadius" className="form-label">Radius</label>
                  <div className="slider-row">
                    <input 
                      type="range" 
                      id="orbitRadius" 
                      className="form-range modern-slider" 
                      min="1" 
                      max="10" 
                      step="0.1"
                      value={cameraData.orbit.radius}
                      onChange={(e) => handleSliderChange('orbit.radius', parseFloat(e.target.value))}
                    />
                    <span className="value-badge">{formatValue(cameraData.orbit.radius, 'distance')}</span>
                  </div>
                </div>
              </div>
              
              {/* Camera Target (Right Column) */}
              <div className="col-md-6 mt-0">
                <div className="section-header">Camera Target</div>
                <div className="form-group mb-3">
                  <label htmlFor="targetX" className="form-label">X</label>
                  <div className="slider-row">
                    <input 
                      type="range" 
                      id="targetX" 
                      className="form-range modern-slider" 
                      min="-5" 
                      max="5" 
                      step="0.1"
                      value={cameraData.target.x}
                      onChange={(e) => handleSliderChange('target.x', parseFloat(e.target.value))}
                    />
                    <span className="value-badge">{formatValue(cameraData.target.x, 'distance')}</span>
                  </div>
                </div>
                <div className="form-group mb-3">
                  <label htmlFor="targetY" className="form-label">Y</label>
                  <div className="slider-row">
                    <input 
                      type="range" 
                      id="targetY" 
                      className="form-range modern-slider" 
                      min="0" 
                      max="3" 
                      step="0.1"
                      value={cameraData.target.y}
                      onChange={(e) => handleSliderChange('target.y', parseFloat(e.target.value))}
                    />
                    <span className="value-badge">{formatValue(cameraData.target.y, 'distance')}</span>
                  </div>
                </div>
                <div className="form-group mb-3">
                  <label htmlFor="targetZ" className="form-label">Z</label>
                  <div className="slider-row">
                    <input 
                      type="range" 
                      id="targetZ" 
                      className="form-range modern-slider" 
                      min="-5" 
                      max="5" 
                      step="0.1"
                      value={cameraData.target.z}
                      onChange={(e) => handleSliderChange('target.z', parseFloat(e.target.value))}
                    />
                    <span className="value-badge">{formatValue(cameraData.target.z, 'distance')}</span>
                  </div>
                </div>
              </div>
              
              {/* Field of View and Zoom Speed (Full Width) */}
              <div className="col-12 mt-0">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label htmlFor="fieldOfView" className="form-label">Field of View</label>
                    <div className="slider-row">
                      <input 
                        type="range" 
                        id="fieldOfView" 
                        className="form-range modern-slider" 
                        min="10" 
                        max="90" 
                        step="1"
                        value={cameraData.fieldOfView}
                        onChange={(e) => handleSliderChange('fieldOfView', parseFloat(e.target.value))}
                      />
                      <span className="value-badge">{formatValue(cameraData.fieldOfView, 'angle')}</span>
                    </div>
                  </div>
                  <div className="col-md-6 mt-0">
                    <label htmlFor="zoomSpeed" className="form-label">Zoom Speed</label>
                    <div className="slider-row">
                      <input 
                        type="range" 
                        id="zoomSpeed" 
                        className="form-range modern-slider" 
                        min="0.1" 
                        max="3" 
                        step="0.1"
                        value={cameraData.zoomSpeed}
                        onChange={(e) => handleSliderChange('zoomSpeed', parseFloat(e.target.value))}
                      />
                      <span className="value-badge">{formatValue(cameraData.zoomSpeed, 'speed')}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Current Values (Full Width) */}
              <div className="col-12 mt-2">
                <div className="current-values-box">
                  <h6 className="text-primary mb-2">Current Values (Last Saved)</h6>
                  <div><strong>Camera Orbit:</strong> <span>{cameraData.orbit.azimuth}deg {cameraData.orbit.polar}deg {cameraData.orbit.radius}m</span></div>
                  <div><strong>Camera Target:</strong> <span>{cameraData.target.x}m {cameraData.target.y}m {cameraData.target.z}m</span></div>
                  <div><strong>Field of View:</strong> <span>{cameraData.fieldOfView}°</span></div>
                  <div><strong>Zoom Speed:</strong> <span>{cameraData.zoomSpeed}</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Model3DPreview;
