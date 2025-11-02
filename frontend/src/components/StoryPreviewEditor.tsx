import React, { useState, useRef, useEffect } from 'react';
import AnimationController from './AnimationController';
import { StoryCreationData } from './StoryCreationWizard';
import Model3DPreview from './Model3DPreview';
import SmallButton from './SmallButton';
import BackButton from './BackButton';

interface StoryPreviewEditorProps {
  data: StoryCreationData;
  onDataUpdate: (data: Partial<StoryCreationData>) => void;
  onNext: () => void;
  onBack: () => void;
  className?: string;
}

interface Dialogue {
  id: number;
  character: number; // Character ID (who is speaking)
  text: string;
  order: number;
  camera_orbit: string;
  camera_target: string;
  field_of_view: string;
  zoom_speed: string;
  rotation: string;
  head_x: number;
  head_y: number;
  head_z: number;
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

const StoryPreviewEditor: React.FC<StoryPreviewEditorProps> = ({
  data,
  onDataUpdate,
  onNext,
  onBack,
  className = ''
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentDialogueIndex, setCurrentDialogueIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(5000); // milliseconds
  const [showEditingOverlay, setShowEditingOverlay] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(true);
  const [progress, setProgress] = useState(0);
  const [showComicNavigation, setShowComicNavigation] = useState(false);
  
  const [cameraData, setCameraData] = useState<CameraData>({
    orbit: { azimuth: 0, polar: 75, radius: 3 },
    target: { x: 0, y: 1.6, z: 0 },
    fieldOfView: 45,
    zoomSpeed: 1.0
  });

  const [currentValues, setCurrentValues] = useState<CameraData>(cameraData);
  const playbackIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const modelViewerRef = useRef<any>(null);

  // Convert dialogues from story data
  const dialogues: Dialogue[] = data.dialogues.map((dialogue, index) => ({
    id: index + 1,
    character: dialogue.character || 0,
    text: dialogue.text,
    order: dialogue.order,
    camera_orbit: data.cameraPosition || '0deg 75deg 3m',
    camera_target: data.cameraTarget || '0m 1.6m 0m',
    field_of_view: '45deg',
    zoom_speed: '1.0',
    rotation: '0deg',
    head_x: 0,
    head_y: 0,
    head_z: 0
  }));

  const currentDialogue = dialogues[currentDialogueIndex];
  const totalDialogues = dialogues.length;

  // Parse camera data from string format
  const parseCameraData = (orbitStr: string, targetStr: string): CameraData => {
    const orbitMatch = orbitStr.match(/([-\d.]+)deg\s+([-\d.]+)deg\s+([-\d.]+)m/);
    const targetMatch = targetStr.match(/([-\d.]+)m\s+([-\d.]+)m\s+([-\d.]+)m/);
    
    return {
      orbit: {
        azimuth: orbitMatch ? parseFloat(orbitMatch[1]) : 0,
        polar: orbitMatch ? parseFloat(orbitMatch[2]) : 75,
        radius: orbitMatch ? parseFloat(orbitMatch[3]) : 3
      },
      target: {
        x: targetMatch ? parseFloat(targetMatch[1]) : 0,
        y: targetMatch ? parseFloat(targetMatch[2]) : 1.6,
        z: targetMatch ? parseFloat(targetMatch[3]) : 0
      },
      fieldOfView: 45,
      zoomSpeed: 1.0
    };
  };

  // Initialize camera data from current dialogue
  useEffect(() => {
    if (currentDialogue) {
      const parsedCamera = parseCameraData(currentDialogue.camera_orbit, currentDialogue.camera_target);
      setCameraData(parsedCamera);
      setCurrentValues(parsedCamera);
    }
  }, [currentDialogueIndex, dialogues]);

  // Update progress
  useEffect(() => {
    if (totalDialogues > 0) {
      setProgress(((currentDialogueIndex + 1) / totalDialogues) * 100);
    }
  }, [currentDialogueIndex, totalDialogues]);

  // Playback controls
  const startPlayback = () => {
    if (totalDialogues === 0) return;
    
    setIsPlaying(true);
    setShowComicNavigation(true);
    
    playbackIntervalRef.current = setInterval(() => {
      setCurrentDialogueIndex(prev => {
        if (prev >= totalDialogues - 1) {
          setIsPlaying(false);
          if (playbackIntervalRef.current) {
            clearInterval(playbackIntervalRef.current);
          }
          return prev;
        }
        return prev + 1;
      });
    }, playbackSpeed);
  };

  const stopPlayback = () => {
    setIsPlaying(false);
    if (playbackIntervalRef.current) {
      clearInterval(playbackIntervalRef.current);
    }
  };

  const pausePlayback = () => {
    setIsPlaying(false);
    if (playbackIntervalRef.current) {
      clearInterval(playbackIntervalRef.current);
    }
  };

  const nextDialogue = () => {
    if (currentDialogueIndex < totalDialogues - 1) {
      setCurrentDialogueIndex(prev => prev + 1);
    }
  };

  const prevDialogue = () => {
    if (currentDialogueIndex > 0) {
      setCurrentDialogueIndex(prev => prev - 1);
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (isPlaying) {
      stopPlayback();
      startPlayback();
    }
  };

  const handleModeToggle = (mode: 'preview' | 'edit') => {
    setIsPreviewMode(mode === 'preview');
    setShowEditingOverlay(mode === 'edit');
  };

  const handleCameraDataChange = (newCameraData: CameraData) => {
    setCameraData(newCameraData);
    
    // Update the current dialogue's camera data
    if (currentDialogue) {
      const updatedDialogues = [...data.dialogues];
      updatedDialogues[currentDialogueIndex] = {
        ...updatedDialogues[currentDialogueIndex],
        // Update camera data in the dialogue
      };
      
      onDataUpdate({
        dialogues: updatedDialogues,
        cameraPosition: `${newCameraData.orbit.azimuth}deg ${newCameraData.orbit.polar}deg ${newCameraData.orbit.radius}m`,
        cameraTarget: `${newCameraData.target.x}m ${newCameraData.target.y}m ${newCameraData.target.z}m`
      });
    }
  };

  const handleSave = (cameraData: CameraData) => {
    setCurrentValues(cameraData);
    
    // Save camera data to current dialogue
    if (currentDialogue) {
      const updatedDialogues = [...data.dialogues];
      updatedDialogues[currentDialogueIndex] = {
        ...updatedDialogues[currentDialogueIndex],
        // Save camera data
      };
      
      onDataUpdate({
        dialogues: updatedDialogues,
        cameraPosition: `${cameraData.orbit.azimuth}deg ${cameraData.orbit.polar}deg ${cameraData.orbit.radius}m`,
        cameraTarget: `${cameraData.target.x}m ${cameraData.target.y}m ${cameraData.target.z}m`
      });
    }
  };

  const handleReset = () => {
    setCameraData(currentValues);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
      }
    };
  }, []);

  return (
    <div className={`story-preview-editor ${className}`}>
      {/* Control Panel */}
      <div className="container mt-3 col-md-4">
        <div className="card shadow-sm border-0" style={{ background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)' }}>
          <div className="card-body p-3">
            {/* Mode Toggle Row */}
            <div className="row mb-3">
              <div className="col-12">
                <div className="btn-group w-100" role="group">
                  <button 
                    type="button" 
                    className={`btn ${isPreviewMode ? 'btn-outline-primary active' : 'btn-outline-primary'}`}
                    onClick={() => handleModeToggle('preview')}
                  >
                    <i className="fas fa-eye me-1"></i>Preview Mode
                  </button>
                  <button 
                    type="button" 
                    className={`btn ${!isPreviewMode ? 'btn-outline-warning active' : 'btn-outline-warning'}`}
                    onClick={() => handleModeToggle('edit')}
                  >
                    <i className="fas fa-edit me-1"></i>Edit Mode
                  </button>
                </div>
              </div>
            </div>
            
            {/* Edit Controls Row */}
            {!isPreviewMode && (
              <div className="row g-2">
                <div className="col-6">
                  <SmallButton 
                    variant="success" 
                    onClick={() => handleSave(cameraData)}
                    className="w-100"
                  >
                    <i className="fas fa-save me-1"></i>Save
                  </SmallButton>
                </div>
                <div className="col-6">
                  <SmallButton 
                    variant="secondary" 
                    onClick={handleReset}
                    className="w-100"
                  >
                    <i className="fas fa-undo me-1"></i>Reset
                  </SmallButton>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3D Model Container */}
      <div className="container">
        <div className="card model-container mb-2 position-relative" style={{ height: '400px', border: 'none', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)' }}>
          {data.model.previewUrl ? (
            <div style={{ width: '100%', height: '100%', position: 'relative' }}>
              {/* Animation Controller */}
              <AnimationController
                modelViewerRef={modelViewerRef}
                autoPlay={true}
                showControls={true}
                onAnimationChange={(animationName) => {
                  console.log('StoryPreviewEditor: Animation changed to:', animationName);
                }}
              />
              
              {/* Direct model-viewer element */}
              <model-viewer
                ref={modelViewerRef}
                src={data.model.previewUrl}
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
                    <div className="bg-dark text-white p-2 rounded" style={{ fontSize: '0.8rem' }}>
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

      {/* Progress Bar */}
      <div className="container mt-2">
        <div className="d-flex align-items-center gap-3">
          <div className="progress flex-grow-1" style={{ height: '8px', borderRadius: '4px', backgroundColor: '#e9ecef' }}>
            <div 
              className="progress-bar bg-success" 
              role="progressbar" 
              style={{ width: `${progress}%`, transition: 'width 0.3s ease' }}
              aria-valuenow={progress} 
              aria-valuemin={0} 
              aria-valuemax={100}
            ></div>
          </div>
          <div className="text-end" style={{ fontSize: '0.8rem', color: 'white', minWidth: '40px' }}>
            <span>{currentDialogueIndex + 1} / {totalDialogues}</span>
          </div>
        </div>
      </div>

      {/* Comic Navigation */}
      {showComicNavigation && (
        <div className="container comic-navigation border-dark pb-2">
          <div className="row justify-content-between align-items-center">
            <div className="col-auto">
              <button 
                className="btn btn-primary mx-1 p-1" 
                style={{ 
                  fontSize: '1.5rem', 
                  fontWeight: 'bold', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  minWidth: '80px', 
                  minHeight: '40px', 
                  backgroundColor: '#111e7f', 
                  border: 'none', 
                  borderRadius: '8px', 
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)' 
                }}
                onClick={prevDialogue}
                disabled={currentDialogueIndex === 0}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 18l-6-6 6-6"/>
                </svg>
              </button>
            </div>
            <div className="col-auto d-flex align-items-center">
              <button 
                className="btn btn-success mx-1 p-1" 
                style={{ 
                  fontSize: '1.5rem', 
                  fontWeight: 'bold', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  minWidth: '40px', 
                  minHeight: '40px', 
                  backgroundColor: isPlaying ? '#dc3545' : '#28a745', 
                  border: 'none', 
                  borderRadius: '8px', 
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)', 
                  transition: 'all 0.3s ease' 
                }}
                onClick={isPlaying ? pausePlayback : startPlayback}
              >
                <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'}`} style={{ color: 'white' }}></i>
              </button>
              <div className="btn-group mx-1" role="group">
                <button 
                  type="button" 
                  className={`btn btn-outline-secondary btn-sm speed-btn ${playbackSpeed === 5000 ? 'active' : ''}`}
                  data-speed="5000" 
                  style={{ 
                    fontSize: '0.8rem', 
                    padding: '0.25rem 0.5rem', 
                    borderRadius: '4px 0 0 4px', 
                    border: '1px solid #dee2e6', 
                    color: 'white' 
                  }}
                  onClick={() => handleSpeedChange(5000)}
                >
                  1x
                </button>
                <button 
                  type="button" 
                  className={`btn btn-outline-secondary btn-sm speed-btn ${playbackSpeed === 3333 ? 'active' : ''}`}
                  data-speed="3333" 
                  style={{ 
                    fontSize: '0.8rem', 
                    padding: '0.25rem 0.5rem', 
                    borderRadius: '0 4px 4px 0', 
                    border: '1px solid #dee2e6', 
                    color: 'white' 
                  }}
                  onClick={() => handleSpeedChange(3333)}
                >
                  1.5x
                </button>
              </div>
            </div>
            <div className="col-auto">
              <div className="col-auto d-flex justify-content-center align-items-center my-auto">
                <a 
                  href="/immersivecomics/" 
                  className="mx-1 p-1" 
                  style={{ 
                    color: '#f9a602', 
                    textDecoration: 'none', 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '0.2rem', 
                    fontWeight: '500', 
                    transition: 'all 0.3s ease' 
                  }}
                >
                  <span>Back to Comics</span>
                </a>
              </div>
            </div>
            <div className="col-auto">
              <button 
                className="btn btn-primary mx-1 p-1" 
                style={{ 
                  fontSize: '1.5rem', 
                  fontWeight: 'bold', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  minWidth: '80px', 
                  minHeight: '40px', 
                  backgroundColor: '#111e7f', 
                  border: 'none', 
                  borderRadius: '8px', 
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)' 
                }}
                onClick={nextDialogue}
                disabled={currentDialogueIndex >= totalDialogues - 1}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Current Dialogue Display */}
      {currentDialogue && (
        <div className="container mt-3 col-md-6">
          <div className="card" style={{ backgroundColor: '#111e7f', color: 'white' }}>
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start mb-2">
                <h6 className="subtext-btn mb-0">
                  {data.characters.find(char => char.id === currentDialogue.character)?.name || `Character ${currentDialogue.character}`}
                </h6>
                <span className="badge bg-warning text-dark subtext-btn-sm">
                  {currentDialogueIndex + 1} of {totalDialogues}
                </span>
              </div>
              <p className="subtext-btn-sm mb-0" style={{ 
                fontSize: '1.1rem', 
                opacity: 0.9, 
                fontStyle: 'italic' 
              }}>
                "{currentDialogue.text}"
              </p>
            </div>
          </div>
        </div>
      )}

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
                      onChange={(e) => {
                        const newCameraData = { ...cameraData };
                        newCameraData.orbit.azimuth = parseFloat(e.target.value);
                        handleCameraDataChange(newCameraData);
                      }}
                    />
                      <span className="value-badge">{cameraData.orbit.azimuth.toFixed(1)}°</span>
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
                      onChange={(e) => {
                        const newCameraData = { ...cameraData };
                        newCameraData.orbit.polar = parseFloat(e.target.value);
                        handleCameraDataChange(newCameraData);
                      }}
                    />
                      <span className="value-badge">{cameraData.orbit.polar.toFixed(1)}°</span>
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
                      onChange={(e) => {
                        const newCameraData = { ...cameraData };
                        newCameraData.orbit.radius = parseFloat(e.target.value);
                        handleCameraDataChange(newCameraData);
                      }}
                    />
                      <span className="value-badge">{cameraData.orbit.radius.toFixed(1)}m</span>
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
                      onChange={(e) => {
                        const newCameraData = { ...cameraData };
                        newCameraData.target.x = parseFloat(e.target.value);
                        handleCameraDataChange(newCameraData);
                      }}
                    />
                      <span className="value-badge">{cameraData.target.x.toFixed(1)}m</span>
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
                      onChange={(e) => {
                        const newCameraData = { ...cameraData };
                        newCameraData.target.y = parseFloat(e.target.value);
                        handleCameraDataChange(newCameraData);
                      }}
                    />
                      <span className="value-badge">{cameraData.target.y.toFixed(1)}m</span>
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
                      onChange={(e) => {
                        const newCameraData = { ...cameraData };
                        newCameraData.target.z = parseFloat(e.target.value);
                        handleCameraDataChange(newCameraData);
                      }}
                    />
                      <span className="value-badge">{cameraData.target.z.toFixed(1)}m</span>
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
                        onChange={(e) => {
                          const newCameraData = { ...cameraData };
                          newCameraData.fieldOfView = parseFloat(e.target.value);
                          handleCameraDataChange(newCameraData);
                        }}
                      />
                      <span className="value-badge">{cameraData.fieldOfView.toFixed(1)}°</span>
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
                        onChange={(e) => {
                          const newCameraData = { ...cameraData };
                          newCameraData.zoomSpeed = parseFloat(e.target.value);
                          handleCameraDataChange(newCameraData);
                        }}
                      />
                      <span className="value-badge">{cameraData.zoomSpeed.toFixed(1)}x</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Current Values (Full Width) */}
              <div className="col-12 mt-2">
                <div className="current-values-box">
                  <h6 className="text-primary mb-2">Current Values (Last Saved)</h6>
                  <div><strong>Camera Orbit:</strong> <span>{currentValues.orbit.azimuth.toFixed(1)}deg {currentValues.orbit.polar.toFixed(1)}deg {currentValues.orbit.radius.toFixed(1)}m</span></div>
                  <div><strong>Camera Target:</strong> <span>{currentValues.target.x.toFixed(1)}m {currentValues.target.y.toFixed(1)}m {currentValues.target.z.toFixed(1)}m</span></div>
                  <div><strong>Field of View:</strong> <span>{currentValues.fieldOfView.toFixed(1)}°</span></div>
                  <div><strong>Zoom Speed:</strong> <span>{currentValues.zoomSpeed.toFixed(1)}</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="container mt-4">
        <div className="d-flex justify-content-between">
          <SmallButton variant="outline-secondary" onClick={onBack}>
            <i className="fas fa-arrow-left me-1"></i> Back
          </SmallButton>
          <SmallButton variant="success" onClick={onNext}>
            Publish Story <i className="fas fa-check ms-1"></i>
          </SmallButton>
        </div>
      </div>
    </div>
  );
};

export default StoryPreviewEditor;
