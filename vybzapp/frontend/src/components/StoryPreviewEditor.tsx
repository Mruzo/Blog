import React, { useState, useRef, useEffect } from 'react';
import { StoryCreationData } from './StoryCreationWizard';
import SmallButton from './SmallButton';
import './Comic3DViewer.css';

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
  }, [currentDialogueIndex, dialogues, currentDialogue]);

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
    <div className={`comic-3d-viewer story-preview-editor ${className}`}>
      {/* 3D Model Container */}
      <div className="row">
        <div className="col-12">
          <div className="card model-container position-relative" style={{ height: '400px', display: 'block' }}>
            {data.model.previewUrl ? (
              <div style={{ width: '100%', height: '100%', position: 'relative', zIndex: 0, isolation: 'isolate' }}>
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
                  style={{ 
                    width: '100%', 
                    height: '100%',
                    display: 'block',
                    visibility: 'visible',
                    opacity: 1,
                    position: 'relative',
                    zIndex: 0
                  }}
                />
                
                {currentDialogue && (
                  <div className="comic3d-dialogue-overlay">
                    <div
                      className="speech-bubble rounded-2 border border-secondary align-top"
                      style={{
                        position: 'relative',
                        textAlign: 'left',
                        fontFamily: 'animeace, Comic, sans-serif',
                        fontSize: 'small',
                        fontStyle: 'italic',
                        backgroundColor: '#ffffff',
                        border: '2px solid #333',
                        borderRadius: '8px',
                        boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
                      }}
                    >
                      <div id="top-dialogue" style={{ padding: 0, margin: 0 }}>
                        <strong>
                          {data.characters.find(char => char.id === currentDialogue.character)?.name ||
                            `Character ${currentDialogue.character}`}
                          :
                        </strong>{' '}
                        {currentDialogue.text}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="d-flex align-items-center justify-content-center h-100 bg-light">
                <div className="text-center">
                  <i className="fas fa-cube fa-3x text-muted mb-3"></i>
                  <h5 className="text-muted">No 3D Model Available</h5>
                  <p className="text-muted">Please upload a 3D model to preview your story.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      {totalDialogues > 0 && (
        <div className="row mt-2">
          <div className="col-12">
            <div className="d-flex align-items-center gap-3">
              <div className="progress flex-grow-1" style={{ height: '8px' }}>
                <div 
                  className="progress-bar bg-success" 
                  style={{ 
                    width: `${progress}%`,
                    transition: 'width 0.3s ease'
                  }}
                />
              </div>
              <div className="text-end" style={{ fontSize: '0.8rem', minWidth: '40px' }}>
                <span>{currentDialogueIndex + 1} / {totalDialogues}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Controls */}
      {totalDialogues > 0 && (
        <div className="row mt-2">
          <div className="col-12">
            <div className="card bg-transparent border-0">
              <div className="card-body p-0">
                <div className="row justify-content-between align-items-center">
                  <div className="col-auto">
                    <button
                      className="btn btn-primary"
                      onClick={prevDialogue}
                      disabled={currentDialogueIndex === 0}
                      title={`Previous dialogue (${currentDialogueIndex}/${totalDialogues})`}
                    >
                      <i className="fas fa-chevron-left"></i>
                    </button>
                  </div>
                  
                  <div className="col-auto d-flex align-items-center gap-2">
                    <button
                      className="btn btn-success"
                      onClick={isPlaying ? pausePlayback : startPlayback}
                    >
                      <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'}`}></i>
                    </button>
                    
                    <div className="btn-group" role="group">
                      <button
                        type="button"
                        className={`btn btn-sm ${playbackSpeed === 5000 ? 'btn-primary' : 'btn-outline-secondary'}`}
                        onClick={() => handleSpeedChange(5000)}
                      >
                        1x
                      </button>
                      <button
                        type="button"
                        className={`btn btn-sm ${playbackSpeed === 3333 ? 'btn-primary' : 'btn-outline-secondary'}`}
                        onClick={() => handleSpeedChange(3333)}
                      >
                        1.5x
                      </button>
                    </div>
                  </div>
                  
                  <div className="col-auto">
                    <button
                      className="btn btn-primary"
                      onClick={nextDialogue}
                      disabled={currentDialogueIndex >= totalDialogues - 1}
                      title={`Next dialogue (${currentDialogueIndex + 1}/${totalDialogues})`}
                    >
                      <i className="fas fa-chevron-right"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Edit Mode Toggle */}
      <div className="row mt-2">
        <div className="col-12">
          <div className="card bg-transparent">
            <div className="card-body p-0">
              <div className="btn-group w-100 mode-toggle-btn" role="group">
                <button
                  type="button"
                  className={`btn ${isPreviewMode ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => handleModeToggle('preview')}
                  style={{
                    borderColor: '#111e7f',
                    color: isPreviewMode ? '#fff' : '#111e7f',
                    backgroundColor: isPreviewMode ? '#111e7f' : 'transparent'
                  }}
                >
                  <i className="fas fa-eye me-1"></i>Preview Mode
                </button>
                <button
                  type="button"
                  className={`btn ${!isPreviewMode ? 'btn-warning' : 'btn-outline-warning'}`}
                  onClick={() => handleModeToggle('edit')}
                  style={{
                    borderColor: '#f9a602',
                    color: !isPreviewMode ? '#fff' : '#f9a602',
                    backgroundColor: !isPreviewMode ? '#f9a602' : 'transparent'
                  }}
                >
                  <i className="fas fa-edit me-1"></i>Edit Mode
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Editing Controls Overlay */}
      {showEditingOverlay && (
        <div className="row mt-2">
          <div className="col-12">
            <div className="modern-card">
              <div className="modern-card-header">
                <span className="modern-card-title">Camera Editing Controls</span>
              </div>
              
              {/* Save/Reset Buttons Row */}
              <div className="row g-2" style={{ padding: '1rem 1.5rem 0.5rem 1.5rem' }}>
                <div className="col-6">
                  <button 
                    className="btn btn-success btn-sm w-100"
                    onClick={() => handleSave(cameraData)}
                    style={{ 
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      borderRadius: '8px',
                      padding: '0.5rem 1rem'
                    }}
                  >
                    <i className="fas fa-save me-1"></i>Save
                  </button>
                </div>
                <div className="col-6">
                  <button 
                    className="btn btn-secondary btn-sm w-100"
                    onClick={handleReset}
                    style={{ 
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      borderRadius: '8px',
                      padding: '0.5rem 1rem'
                    }}
                  >
                    <i className="fas fa-undo me-1"></i>Reset
                  </button>
                </div>
              </div>
              
              <div className="modern-card-body p-0" style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1.2rem 1rem'
              }}>
                {/* Camera Orbit (Left Column) */}
                <div className="col mt-0 p-1 p-md-4">
                  <div className="section-header">
                    Camera Orbit
                  </div>
                  
                  <div className="form-group mb-3">
                    <label htmlFor="orbitAzimuth" className="form-label d-flex align-items-center gap-2">
                      <span className="material-symbols-outlined" style={{ fontSize: '2rem', fontVariationSettings: "'FILL' 1" }}>360</span>
                      <span>Azimuth</span>
                    </label>
                    <div className="slider-row">
                      <input
                        type="range"
                        id="orbitAzimuth"
                        className="form-range modern-slider"
                        style={{ flex: 1 }}
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
                    <label htmlFor="orbitPolar" className="form-label d-flex align-items-center gap-2">
                      <span className="material-symbols-outlined" style={{ fontSize: '2rem', transform: 'rotate(90deg)', fontVariationSettings: "'FILL' 1" }}>360</span>
                      <span>Polar</span>
                    </label>
                    <div className="slider-row">
                      <input
                        type="range"
                        id="orbitPolar"
                        className="form-range modern-slider"
                        style={{ flex: 1 }}
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
                        style={{ flex: 1 }}
                        min="0.1"
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
                  
                  {/* Field of View */}
                  <div className="form-group mb-3">
                    <label htmlFor="fieldOfView" className="form-label">Field of View</label>
                    <div className="slider-row">
                      <input
                        type="range"
                        id="fieldOfView"
                        className="form-range modern-slider"
                        style={{ flex: 1 }}
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
                </div>
                
                {/* Camera Target (Right Column) */}
                <div className="col mt-0 p-1 p-md-4">
                  <div className="section-header">
                    Camera Target
                  </div>
                  
                  <div className="form-group mb-3">
                    <label htmlFor="targetX" className="form-label">X</label>
                    <div className="slider-row">
                      <input
                        type="range"
                        id="targetX"
                        className="form-range modern-slider"
                        style={{ flex: 1 }}
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
                    <label htmlFor="targetY" className="form-label d-flex align-items-center gap-2">
                      <span className="material-symbols-outlined" style={{ fontSize: '2rem', transform: 'rotate(90deg)', fontVariationSettings: "'FILL' 1" }}>arrow_range</span>
                      <span>Y</span>
                    </label>
                    <div className="slider-row">
                      <input
                        type="range"
                        id="targetY"
                        className="form-range modern-slider"
                        style={{ flex: 1 }}
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
                        style={{ flex: 1 }}
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
                  
                  {/* Zoom Speed */}
                  <div className="form-group mb-3">
                    <label htmlFor="zoomSpeed" className="form-label">Zoom Speed</label>
                    <div className="slider-row">
                      <input
                        type="range"
                        id="zoomSpeed"
                        className="form-range modern-slider"
                        style={{ flex: 1 }}
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
                
                {/* Current Values (Full Width) */}
                <div className="col-12 mt-2" style={{ gridColumn: '1 / -1', padding: '0 1rem' }}>
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
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="row mt-4">
        <div className="col-12">
          {/* <div className="d-flex justify-content-between">
            <SmallButton variant="outline-secondary" onClick={onBack}>
              <i className="fas fa-arrow-left me-1"></i> Back
            </SmallButton>
            <SmallButton variant="success" onClick={onNext}>
              Publish Story <i className="fas fa-check ms-1"></i>
            </SmallButton>
          </div> */}
        </div>
      </div>
    </div>
  );
};

export default StoryPreviewEditor;
