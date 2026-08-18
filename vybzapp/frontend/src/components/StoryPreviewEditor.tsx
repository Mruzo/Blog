import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { StoryCreationData } from './StoryCreationWizard';
import { coordsForSceneSlot } from '../utils/sceneSlots';
import './Comic3DViewer.css';

interface StoryPreviewEditorProps {
  data: StoryCreationData;
  onDataUpdate: (data: Partial<StoryCreationData>) => void;
  onNext: () => void;
  onBack: () => void;
  className?: string;
}

interface Dialogue {
  id?: number;
  character: number; // Character ID (who is speaking)
  text: string;
  order: number;
  camera_orbit: string;
  camera_target: string;
  field_of_view: number;
  zoom_speed: number;
  rotation: string;
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

const DEFAULT_ORBIT = '0deg 75deg 3m';
const DEFAULT_TARGET = '0m 1.6m 0m';

const parseCameraData = (
  orbitStr: string,
  targetStr: string,
  fieldOfView = 45,
  zoomSpeed = 1
): CameraData => {
  const orbitMatch = orbitStr.match(/([-\d.]+)deg\s+([-\d.]+)deg\s+([-\d.]+)m/);
  const targetMatch = targetStr.match(/([-\d.]+)m\s+([-\d.]+)m\s+([-\d.]+)m/);

  return {
    orbit: {
      azimuth: orbitMatch ? parseFloat(orbitMatch[1]) : 0,
      polar: orbitMatch ? parseFloat(orbitMatch[2]) : 75,
      radius: orbitMatch ? parseFloat(orbitMatch[3]) : 3,
    },
    target: {
      x: targetMatch ? parseFloat(targetMatch[1]) : 0,
      y: targetMatch ? parseFloat(targetMatch[2]) : 1.6,
      z: targetMatch ? parseFloat(targetMatch[3]) : 0,
    },
    fieldOfView,
    zoomSpeed,
  };
};

const cameraDataToDialogueFields = (camera: CameraData) => ({
  camera_orbit: `${camera.orbit.azimuth}deg ${camera.orbit.polar}deg ${camera.orbit.radius}m`,
  camera_target: `${camera.target.x}m ${camera.target.y}m ${camera.target.z}m`,
  field_of_view: camera.fieldOfView,
  zoom_speed: camera.zoomSpeed,
});

const cloneCameraData = (camera: CameraData): CameraData => ({
  orbit: { ...camera.orbit },
  target: { ...camera.target },
  fieldOfView: camera.fieldOfView,
  zoomSpeed: camera.zoomSpeed,
});

type StoryCharacter = StoryCreationData['characters'][number];

type Vec3 = { x: number; y: number; z: number };

type CharacterHotspot = {
  key: string | number;
  slot: string;
  name: string;
  head: Vec3;
  position: string;
};

const getCharacterHeadPosition = (character: StoryCharacter): Vec3 | null => {
  const preset = coordsForSceneSlot(character.scene_slot);
  if (preset) {
    return {
      x: preset.head_x,
      y: preset.head_y,
      z: preset.head_z,
    };
  }

  if (
    Number.isFinite(character.pov_head_x) &&
    Number.isFinite(character.pov_head_y) &&
    Number.isFinite(character.pov_head_z)
  ) {
    return {
      x: character.pov_head_x as number,
      y: character.pov_head_y as number,
      z: character.pov_head_z as number,
    };
  }

  return null;
};

/** model-viewer spherical orbit → world-space camera position */
const cameraWorldFromOrbit = (
  orbit: { theta: number; phi: number; radius: number },
  target: Vec3
): Vec3 => ({
  x: target.x + orbit.radius * Math.sin(orbit.phi) * Math.sin(orbit.theta),
  y: target.y + orbit.radius * Math.cos(orbit.phi),
  z: target.z + orbit.radius * Math.sin(orbit.phi) * Math.cos(orbit.theta),
});

const distanceSquared = (a: Vec3, b: Vec3) => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return dx * dx + dy * dy + dz * dz;
};

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
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const [cameraData, setCameraData] = useState<CameraData>({
    orbit: { azimuth: 0, polar: 75, radius: 3 },
    target: { x: 0, y: 1.6, z: 0 },
    fieldOfView: 45,
    zoomSpeed: 1.0
  });

  const [currentValues, setCurrentValues] = useState<CameraData>(cameraData);
  const playbackIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const modelViewerRef = useRef<any>(null);

  // Per-dialogue cameras from wizard state (not a single global camera)
  const dialogues: Dialogue[] = useMemo(
    () =>
      [...data.dialogues]
        .sort((a, b) => a.order - b.order)
        .map((dialogue) => ({
          id: typeof dialogue.id === 'number' ? dialogue.id : undefined,
          character: dialogue.character || 0,
          text: dialogue.text,
          order: dialogue.order,
          camera_orbit: dialogue.camera_orbit || DEFAULT_ORBIT,
          camera_target: dialogue.camera_target || DEFAULT_TARGET,
          field_of_view:
            typeof dialogue.field_of_view === 'number' ? dialogue.field_of_view : 45,
          zoom_speed: typeof dialogue.zoom_speed === 'number' ? dialogue.zoom_speed : 1,
          rotation: dialogue.rotation || '0deg 0deg 0deg',
        })),
    [data.dialogues]
  );

  const currentDialogue = dialogues[currentDialogueIndex];
  const totalDialogues = dialogues.length;
  const characterHotspots = useMemo<CharacterHotspot[]>(
    () =>
      data.characters.flatMap((character, index) => {
        const head = getCharacterHeadPosition(character);
        if (!head) {
          return [];
        }

        return [{
          key: character.id ?? `${character.name}-${index}`,
          slot: `hotspot-preview-character-${character.id ?? index}`,
          name: character.name,
          head,
          position: `${head.x}m ${head.y}m ${head.z}m`,
        }];
      }),
    [data.characters]
  );

  const syncCharacterHotspots = useCallback(() => {
    const modelViewer = modelViewerRef.current;
    if (!modelViewer) {
      return;
    }

    modelViewer.querySelectorAll('.character-hotspot').forEach((node: Element) => {
      node.remove();
    });

    characterHotspots.forEach((hotspot) => {
      const el = document.createElement('div');
      el.setAttribute('slot', hotspot.slot);
      el.className = 'hotspot character-hotspot story-preview-editor__characterHotspot';
      el.setAttribute('data-position', hotspot.position);
      // Same default as Comic3DViewer — facing/back-face visibility
      el.setAttribute('data-normal', '0m 1m 0m');
      el.setAttribute('data-visibility-attribute', 'visible');
      el.setAttribute('data-character', hotspot.name);
      el.setAttribute('aria-label', hotspot.name);

      const dot = document.createElement('div');
      dot.className = 'dot';
      dot.textContent = hotspot.name;
      el.appendChild(dot);
      modelViewer.appendChild(el);
    });
  }, [characterHotspots]);

  const updateHotspotOcclusion = useCallback(() => {
    const modelViewer = modelViewerRef.current;
    if (!modelViewer?.queryHotspot || !modelViewer.positionAndNormalFromPoint) {
      return;
    }

    const orbit = modelViewer.getCameraOrbit?.();
    const target = modelViewer.getCameraTarget?.();
    if (!orbit || !target) {
      return;
    }

    const camera = cameraWorldFromOrbit(orbit, target);
    // Ignore tiny self-hits on the character mesh near the label
    const epsilonMeters = 0.35;
    const epsilonSq = epsilonMeters * epsilonMeters;

    characterHotspots.forEach((hotspot) => {
      const el = modelViewer.querySelector(
        `.character-hotspot[slot="${hotspot.slot}"]`
      ) as HTMLElement | null;
      if (!el) {
        return;
      }

      const hotspotData = modelViewer.queryHotspot(hotspot.slot);
      if (!hotspotData?.canvasPosition || hotspotData.facingCamera === false) {
        el.classList.add('is-occluded');
        return;
      }

      const { x, y } = hotspotData.canvasPosition;
      const hit = modelViewer.positionAndNormalFromPoint(x, y);
      if (!hit?.position) {
        el.classList.remove('is-occluded');
        return;
      }

      const hitPos = hit.position as Vec3;
      const distHitSq = distanceSquared(camera, hitPos);
      const distLabelSq = distanceSquared(camera, hotspot.head);
      const occluded = distHitSq + epsilonSq < distLabelSq;
      el.classList.toggle('is-occluded', occluded);
    });
  }, [characterHotspots]);

  const applyCameraToViewer = useCallback((camera: CameraData) => {
    const modelViewer = modelViewerRef.current;
    if (!modelViewer) {
      return;
    }
    const fields = cameraDataToDialogueFields(camera);
    modelViewer.cameraOrbit = fields.camera_orbit;
    modelViewer.cameraTarget = fields.camera_target;
    modelViewer.fieldOfView = `${fields.field_of_view}deg`;
  }, []);

  // Load this dialogue's saved camera when navigating lines
  useEffect(() => {
    if (!currentDialogue) {
      return;
    }
    const parsedCamera = parseCameraData(
      currentDialogue.camera_orbit,
      currentDialogue.camera_target,
      currentDialogue.field_of_view,
      currentDialogue.zoom_speed
    );
    setCameraData(cloneCameraData(parsedCamera));
    setCurrentValues(cloneCameraData(parsedCamera));
    applyCameraToViewer(parsedCamera);
  }, [currentDialogueIndex, currentDialogue, applyCameraToViewer]);

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
    // Live preview only — committed on Save for this dialogue
    setCameraData(cloneCameraData(newCameraData));
    applyCameraToViewer(newCameraData);
  };

  const patchCameraData = (patch: {
    orbit?: Partial<CameraData['orbit']>;
    target?: Partial<CameraData['target']>;
    fieldOfView?: number;
    zoomSpeed?: number;
  }) => {
    handleCameraDataChange({
      orbit: { ...cameraData.orbit, ...patch.orbit },
      target: { ...cameraData.target, ...patch.target },
      fieldOfView: patch.fieldOfView ?? cameraData.fieldOfView,
      zoomSpeed: patch.zoomSpeed ?? cameraData.zoomSpeed,
    });
  };

  const handleSave = () => {
    if (!currentDialogue) {
      return;
    }

    // Wizard dial Save is local only — instant, no API. Cameras sync to the
    // server when leaving Preview (Next) or saving a draft.
    const fields = cameraDataToDialogueFields(cameraData);
    const updatedDialogues = data.dialogues.map((dialogue) => {
      const sameById =
        typeof currentDialogue.id === 'number' && dialogue.id === currentDialogue.id;
      const sameByOrder =
        currentDialogue.id == null && dialogue.order === currentDialogue.order;
      if (sameById || sameByOrder) {
        return {
          ...dialogue,
          ...fields,
        };
      }
      return dialogue;
    });

    onDataUpdate({
      dialogues: updatedDialogues,
      cameraPosition: fields.camera_orbit,
      cameraTarget: fields.camera_target,
    });

    setCurrentValues(cloneCameraData(cameraData));
    applyCameraToViewer(cameraData);
    setSaveMessage({ type: 'success', text: 'Camera saved for this dialogue.' });
    window.setTimeout(() => setSaveMessage(null), 2500);
  };

  const handleReset = () => {
    const restored = cloneCameraData(currentValues);
    setCameraData(restored);
    applyCameraToViewer(restored);
    setSaveMessage({ type: 'success', text: 'Reset to last saved values for this dialogue.' });
    window.setTimeout(() => setSaveMessage(null), 2500);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
      }
    };
  }, []);

  // Create 3D-anchored labels (same model-viewer hotspot path as Comic3DViewer)
  // and hide them when scene geometry is closer than the label point.
  useEffect(() => {
    const modelViewer = modelViewerRef.current;
    if (!modelViewer || !data.model.previewUrl) {
      return;
    }

    let rafId = 0;
    let timer = 0;
    const scheduleOcclusionUpdate = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        updateHotspotOcclusion();
      });
    };

    const handleReady = () => {
      syncCharacterHotspots();
      scheduleOcclusionUpdate();
    };

    modelViewer.addEventListener('load', handleReady);
    modelViewer.addEventListener('camera-change', scheduleOcclusionUpdate);

    if (modelViewer.loaded) {
      handleReady();
    } else {
      timer = window.setTimeout(handleReady, 250);
    }

    return () => {
      if (timer) {
        window.clearTimeout(timer);
      }
      cancelAnimationFrame(rafId);
      modelViewer.removeEventListener('load', handleReady);
      modelViewer.removeEventListener('camera-change', scheduleOcclusionUpdate);
      modelViewer.querySelectorAll('.character-hotspot').forEach((node: Element) => {
        node.remove();
      });
    };
  }, [data.model.previewUrl, syncCharacterHotspots, updateHotspotOcclusion]);

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
                  <h5 className="text-muted">Shared 3D scene unavailable</h5>
                  <p className="text-muted mb-0">
                    The shared JustVybz model could not be loaded for preview. You can still continue.
                  </p>
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
                      type="button"
                      className="btn btn-primary"
                      onClick={prevDialogue}
                      disabled={currentDialogueIndex === 0}
                      title={`Previous dialogue (${currentDialogueIndex}/${totalDialogues})`}
                      aria-label="Previous dialogue"
                    >
                      <i className="fas fa-chevron-left" aria-hidden="true"></i>
                    </button>
                  </div>
                  
                  <div className="col-auto d-flex align-items-center gap-2">
                    <button
                      type="button"
                      className="btn btn-success"
                      onClick={isPlaying ? pausePlayback : startPlayback}
                      aria-label={isPlaying ? 'Pause' : 'Play'}
                    >
                      <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'}`} aria-hidden="true"></i>
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
                      type="button"
                      className="btn btn-primary"
                      onClick={nextDialogue}
                      disabled={currentDialogueIndex >= totalDialogues - 1}
                      title={`Next dialogue (${currentDialogueIndex + 1}/${totalDialogues})`}
                      aria-label="Next dialogue"
                    >
                      <i className="fas fa-chevron-right" aria-hidden="true"></i>
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
                    color: '#111e7f',
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
                    type="button"
                    className="btn btn-success btn-sm w-100"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleSave();
                    }}
                    disabled={!currentDialogue}
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
                    type="button"
                    className="btn btn-secondary btn-sm w-100"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleReset();
                    }}
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
                          patchCameraData({ orbit: { azimuth: parseFloat(e.target.value) } });
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
                          patchCameraData({ orbit: { polar: parseFloat(e.target.value) } });
                        }}
                      />
                      <span className="value-badge">{cameraData.orbit.polar.toFixed(1)}°</span>
                    </div>
                  </div>
                  
                  <div className="form-group mb-3">
                    <label htmlFor="orbitRadius" className="form-label">
                      <span
                        className="material-symbols-outlined"
                        style={{
                          fontSize: '1.5rem',
                          fontVariationSettings: "'FILL' 0, 'GRAD' 0",
                          verticalAlign: 'middle',
                          marginRight: '0.5rem',
                        }}
                      >
                        clock_loader_90
                      </span>
                      Radius
                    </label>
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
                          patchCameraData({ orbit: { radius: parseFloat(e.target.value) } });
                        }}
                      />
                      <span className="value-badge">{cameraData.orbit.radius.toFixed(1)}m</span>
                    </div>
                  </div>
                  
                  {/* Field of View - Hidden for now (matches Comic3DViewer) */}
                  {/* <div className="form-group mb-3">
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
                          patchCameraData({ fieldOfView: parseFloat(e.target.value) });
                        }}
                      />
                      <span className="value-badge">{cameraData.fieldOfView.toFixed(1)}°</span>
                    </div>
                  </div> */}
                </div>
                
                {/* Camera Target (Right Column) */}
                <div className="col mt-0 p-1 p-md-4">
                  <div className="section-header">
                    Camera Target
                  </div>
                  
                  <div className="form-group mb-3">
                    <label htmlFor="targetX" className="form-label d-flex align-items-center gap-2">
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: '2rem', fontVariationSettings: "'FILL' 1" }}
                      >
                        arrow_range
                      </span>
                      <span>X</span>
                    </label>
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
                          patchCameraData({ target: { x: parseFloat(e.target.value) } });
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
                          patchCameraData({ target: { y: parseFloat(e.target.value) } });
                        }}
                      />
                      <span className="value-badge">{cameraData.target.y.toFixed(1)}m</span>
                    </div>
                  </div>
                  
                  <div className="form-group mb-3">
                    <label htmlFor="targetZ" className="form-label d-flex align-items-center gap-2">
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: '2rem', fontVariationSettings: "'FILL' 1" }}
                      >
                        arrow_range
                      </span>
                      <span>Z</span>
                    </label>
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
                          patchCameraData({ target: { z: parseFloat(e.target.value) } });
                        }}
                      />
                      <span className="value-badge">{cameraData.target.z.toFixed(1)}m</span>
                    </div>
                  </div>
                  
                  {/* Zoom Speed - Hidden for now (matches Comic3DViewer) */}
                  {/* <div className="form-group mb-3">
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
                          patchCameraData({ zoomSpeed: parseFloat(e.target.value) });
                        }}
                      />
                      <span className="value-badge">{cameraData.zoomSpeed.toFixed(1)}x</span>
                    </div>
                  </div> */}
                </div>
                
                {/* Current Values (Full Width) */}
                <div className="col-12 mt-2" style={{ gridColumn: '1 / -1', padding: '0 1rem' }}>
                  <div className="current-values-box">
                    <h6 className="text-primary mb-2">
                      Last saved for dialogue {currentDialogueIndex + 1}
                      {totalDialogues > 0 ? ` / ${totalDialogues}` : ''}
                    </h6>
                    <div><strong>Camera Orbit:</strong> <span>{currentValues.orbit.azimuth.toFixed(1)}deg {currentValues.orbit.polar.toFixed(1)}deg {currentValues.orbit.radius.toFixed(1)}m</span></div>
                    <div><strong>Camera Target:</strong> <span>{currentValues.target.x.toFixed(1)}m {currentValues.target.y.toFixed(1)}m {currentValues.target.z.toFixed(1)}m</span></div>
                    {/* Field of View and Zoom Speed hidden for now */}
                    {/* <div><strong>Field of View:</strong> <span>{currentValues.fieldOfView.toFixed(1)}°</span></div>
                    <div><strong>Zoom Speed:</strong> <span>{currentValues.zoomSpeed.toFixed(1)}</span></div> */}
                    {saveMessage && (
                      <div
                        className={`mt-2 small ${saveMessage.type === 'success' ? 'text-success' : 'text-danger'}`}
                        role="status"
                      >
                        {saveMessage.text}
                      </div>
                    )}
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
