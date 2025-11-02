import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Episode, Dialogue, Season } from '../services/api';
import AnimationController from './AnimationController';

// Extend JSX.IntrinsicElements for model-viewer
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': any;
    }
  }
}

interface Comic3DViewerProps {
  episodes: Episode[];
  dialogues: Dialogue[];
  seasons: Season[];
  storyId: number;
  seasonId?: number;
  onEpisodeSelect?: (episode: Episode) => void;
  onDialogueUpdate?: (dialogueId: number, data: Partial<Dialogue>) => void;
  readOnly?: boolean; // Hide edit controls and show only 3D viewer with navigation
}

interface DialogueData {
  dialogue_id: number;
  character: string;
  text: string;
  camera_orbit: string;
  camera_target: string;
  field_of_view: number;
  zoom_speed: number;
  head_x: number;
  head_y: number;
  head_z: number;
}

const Comic3DViewer: React.FC<Comic3DViewerProps> = ({
  episodes,
  dialogues,
  seasons,
  storyId,
  seasonId,
  onEpisodeSelect,
  onDialogueUpdate,
  readOnly = false
}) => {
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  const [currentDialogueIndex, setCurrentDialogueIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isModelReady, setIsModelReady] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [isAnimating] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(5000);
  const [isShowingSummary, setIsShowingSummary] = useState(false);
  const [currentEditingDialogue, setCurrentEditingDialogue] = useState<DialogueData | null>(null);
  const [originalValues, setOriginalValues] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [currentDialogueText, setCurrentDialogueText] = useState('');
  const [previousModel, setPreviousModel] = useState<string | null>(null);
  const [dialogueData, setDialogueData] = useState<DialogueData[]>([]);
  const [currentDialValues, setCurrentDialValues] = useState<any>(null);
  
  const modelViewerRef = useRef<any>(null);
  const playIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const animationsStartedRef = useRef<boolean>(false);
  
  // Filter dialogues for selected episode - memoize to prevent infinite loops
  const episodeDialogues = useMemo(() => {
    return selectedEpisode 
      ? dialogues.filter(d => d.episode === selectedEpisode.id)
      : [];
  }, [dialogues, selectedEpisode]);
  
  // Update dialogueData when episodeDialogues changes
  useEffect(() => {
    const newDialogueData: DialogueData[] = episodeDialogues.map(d => ({
      dialogue_id: d.id,
      character: d.character_name || d.character?.toString() || 'Unknown',
      text: d.text,
      camera_orbit: d.camera_orbit,
      camera_target: d.camera_target,
      field_of_view: d.field_of_view,
      zoom_speed: d.zoom_speed,
      head_x: 0, // These would come from POV data
      head_y: 1.6,
      head_z: 0
    }));
    setDialogueData(newDialogueData);
  }, [episodeDialogues]);

  // Initialize model viewer when component mounts
  useEffect(() => {
    console.log('Comic3DViewer: Initializing model-viewer script');
    const script = document.createElement('script');
    script.type = 'module';
    script.src = 'https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js';
    script.onload = () => {
      console.log('Comic3DViewer: Model-viewer script loaded successfully');
    };
    script.onerror = () => {
      console.error('Comic3DViewer: Failed to load model-viewer script');
    };
    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  // Helper function to start all available animations
  const startAllAnimations = useCallback(() => {
    const modelViewer = modelViewerRef.current;
    if (!modelViewer) return;

    // Prevent starting animations multiple times
    if (animationsStartedRef.current) {
      console.log('Comic3DViewer: Animations already started, skipping');
      return;
    }

    try {
      const animations = modelViewer.availableAnimations || [];
      console.log('Comic3DViewer: Available animations:', animations);

      if (animations.length === 0) {
        console.log('Comic3DViewer: No animations available in this model');
        return;
      }

      animationsStartedRef.current = true;
      console.log('Comic3DViewer: Starting all animations sequentially');
      
      // Function to play animations sequentially
      const playNextAnimation = (index: number) => {
        if (index >= animations.length) {
          // Loop back to the first animation
          playNextAnimation(0);
          return;
        }

        const animationName = animations[index];
        console.log(`Comic3DViewer: Starting animation ${index + 1}/${animations.length}: ${animationName}`);
        
        try {
          // Play the animation
          const animationPlay = modelViewer.play({ animationName });
          
          if (animationPlay) {
            // When animation completes, play the next one
            if (typeof animationPlay.then === 'function') {
              animationPlay.then(() => {
                console.log(`Comic3DViewer: Animation "${animationName}" completed`);
                playNextAnimation(index + 1);
              }).catch((error: any) => {
                console.error(`Comic3DViewer: Error playing animation "${animationName}":`, error);
                playNextAnimation(index + 1); // Continue to next animation even on error
              });
            } else {
              // If play() doesn't return a promise, use a timeout based on animation duration
              const duration = modelViewer.getDuration?.(animationName) || 3000;
              setTimeout(() => {
                playNextAnimation(index + 1);
              }, duration);
            }
          } else {
            // Fallback: wait a bit and move to next animation
            setTimeout(() => {
              playNextAnimation(index + 1);
            }, 3000);
          }
        } catch (error) {
          console.error(`Comic3DViewer: Error starting animation "${animationName}":`, error);
          playNextAnimation(index + 1); // Continue to next animation even on error
        }
      };

      // Start playing animations after a short delay to ensure model is fully ready
      setTimeout(() => {
        playNextAnimation(0);
      }, 500);
    } catch (error) {
      console.error('Comic3DViewer: Error starting animations:', error);
    }
  }, []);

  // Handle model load event
  const handleModelReady = useCallback(() => {
    console.log('Comic3DViewer: Model loaded and ready');
    console.log('Comic3DViewer: Model viewer ref:', modelViewerRef.current);
    setIsModelReady(true);
    
    // Start all available animations
    startAllAnimations();
  }, [startAllAnimations]);

  // Handle model visibility event
  const handleModelVisibility = useCallback((event: any) => {
    if (event.detail.visible) {
      console.log('Comic3DViewer: Model and hotspots ready');
      setIsModelReady(true);
      
      // Start all available animations
      startAllAnimations();
    }
  }, [startAllAnimations]);

  // Handle camera change event
  const handleCameraChange = useCallback(() => {
    if (!isAnimating) {
      console.log('Comic3DViewer: Camera changed');
      // Update pointer if needed
    }
  }, [isAnimating]);

  // Add event listeners for model-viewer events
  useEffect(() => {
    if (isStarted && selectedEpisode && getModelFromSeason(selectedEpisode)) {
      console.log('Comic3DViewer: Setting up event listeners, isEditMode:', isEditMode);
      // Wait for the model-viewer element to be created
      const timer = setTimeout(() => {
        const modelViewer = modelViewerRef.current;
        console.log('Comic3DViewer: Setting up event listeners, modelViewer:', modelViewer);
        if (modelViewer) {
          console.log('Comic3DViewer: Adding event listeners to model viewer');
          modelViewer.addEventListener('load', handleModelReady);
          modelViewer.addEventListener('model-visibility', handleModelVisibility);
          modelViewer.addEventListener('camera-change', handleCameraChange);
        } else {
          console.log('Comic3DViewer: No model viewer element found');
        }
      }, 100);

      return () => {
        clearTimeout(timer);
        // Capture the ref value at the time of effect creation
        const currentRef = modelViewerRef.current;
        if (currentRef) {
          console.log('Comic3DViewer: Removing event listeners');
          currentRef.removeEventListener('load', handleModelReady);
          currentRef.removeEventListener('model-visibility', handleModelVisibility);
          currentRef.removeEventListener('camera-change', handleCameraChange);
        }
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStarted, selectedEpisode, isEditMode]);

  // Handle episode selection
  const handleEpisodeSelect = (episode: Episode) => {
    setSelectedEpisode(episode);
    setCurrentDialogueIndex(0);
    setIsPlaying(false);
    setIsShowingSummary(false);
    onEpisodeSelect?.(episode);
  };

  // Start episode playback
  const startEpisode = () => {
    console.log('Comic3DViewer: Start button clicked');
    console.log('Comic3DViewer: Selected episode:', selectedEpisode);
    console.log('Comic3DViewer: Episode has model:', selectedEpisode ? getModelFromSeason(selectedEpisode) : null);
    console.log('Comic3DViewer: Model URL:', selectedEpisode ? getModelFromSeason(selectedEpisode) : null);
    console.log('Comic3DViewer: Episode dialogues length:', episodeDialogues.length);
    
    // Set isStarted to true - this will trigger model-viewer to render and start loading
    setIsStarted(true);
    // Reset isModelReady - it will be set to true when model actually loads
    setIsModelReady(false);
    
    console.log('Comic3DViewer: Set isStarted to true, model will load now');
    
    // Show first dialogue if available
    if (episodeDialogues.length > 0) {
      console.log('Comic3DViewer: Starting with first dialogue, total dialogues:', episodeDialogues.length);
      setCurrentDialogueIndex(0);
      // Wait a bit for model-viewer to initialize, then show dialogue
      setTimeout(() => {
        showDialogue(0);
      }, 100);
    } else {
      console.log('Comic3DViewer: No dialogues available for this episode');
      setIsShowingSummary(true);
    }
    
    // Don't start auto-play immediately - let user control with navigation buttons
    setIsPlaying(false);
  };




  // Ref to store timeout for debouncing
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced update camera function to prevent infinite loops
  const updateCameraDebounced = useCallback((dialogueId: number, data: Partial<Dialogue>) => {
    // Validate dialogue ID
    if (!dialogueId || dialogueId <= 0) {
      console.error('Comic3DViewer: Invalid dialogue ID:', dialogueId);
      return;
    }
    
    // Validate data
    if (!data || Object.keys(data).length === 0) {
      console.error('Comic3DViewer: No data provided for dialogue update');
      return;
    }
    
    console.log('Comic3DViewer: Updating dialogue', dialogueId, 'with data:', data);
    console.log('Comic3DViewer: Data type:', typeof data);
    console.log('Comic3DViewer: Data keys:', Object.keys(data));
    console.log('Comic3DViewer: Data values:', Object.values(data));
    
    // Clear any existing timeout
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    
    // Set new timeout
    updateTimeoutRef.current = setTimeout(() => {
      try {
        console.log('Comic3DViewer: Calling onDialogueUpdate with:', { dialogueId, data });
        onDialogueUpdate?.(dialogueId, data);
        console.log('Comic3DViewer: Dialogue update successful');
      } catch (error: any) {
        console.error('Comic3DViewer: Error updating dialogue:', error);
        console.error('Comic3DViewer: Error details:', error.message);
        console.error('Comic3DViewer: Error stack:', error.stack);
      }
      
      // Update model-viewer in real-time (matching Django pattern)
      if (modelViewerRef.current && isModelReady) {
        // Set camera target first (matching Django implementation)
        if (data.camera_target) {
          modelViewerRef.current.cameraTarget = data.camera_target;
        }
        if (data.camera_orbit) {
          modelViewerRef.current.cameraOrbit = data.camera_orbit;
        }
        if (data.field_of_view) {
          modelViewerRef.current.fieldOfView = `${data.field_of_view}deg`;
        }
      }
    }, 100); // 100ms debounce
  }, [onDialogueUpdate, isModelReady]);

  // Load current dialogue values into edit controls
  const loadCurrentDialogueValues = useCallback(() => {
    if (!isEditMode) return;
    
    // Use current dialogue if available, otherwise use episode defaults
    const dialogue = dialogueData[currentDialogueIndex] || {
      dialogue_id: 0,
      character: 'Narrator',
      text: 'Episode view',
      camera_orbit: '0deg 75deg 3m',
      camera_target: '0m 1.6m 0m',
      field_of_view: 45,
      zoom_speed: 1.0
    };
    
    setCurrentEditingDialogue(dialogue);
    
    // Parse camera orbit
    const orbitMatch = dialogue.camera_orbit.match(/(-?\d+(?:\.\d+)?)deg\s+(-?\d+(?:\.\d+)?)deg\s+(-?\d+(?:\.\d+)?)m/);
    if (orbitMatch) {
      const azimuth = parseFloat(orbitMatch[1]);
      const polar = parseFloat(orbitMatch[2]);
      const radius = parseFloat(orbitMatch[3]);
      
      // Update sliders (this will be handled by the slider components)
      setSliderValue('orbitAzimuth', azimuth, -180, 180);
      setSliderValue('orbitPolar', polar, 0, 180);
      setSliderValue('orbitRadius', radius, 1, 10);
    }
    
    // Parse camera target
    const targetMatch = dialogue.camera_target.match(/(-?\d+(?:\.\d+)?)m\s+(-?\d+(?:\.\d+)?)m\s+(-?\d+(?:\.\d+)?)m/);
    if (targetMatch) {
      const x = parseFloat(targetMatch[1]);
      const y = parseFloat(targetMatch[2]);
      const z = parseFloat(targetMatch[3]);
      
      setSliderValue('targetX', x, -5, 5);
      setSliderValue('targetY', y, 0, 3);
      setSliderValue('targetZ', z, -5, 5);
    }
    
    // Set other values
    setSliderValue('fieldOfView', dialogue.field_of_view, 10, 90);
    setSliderValue('zoomSpeed', dialogue.zoom_speed, 0.1, 3);
    
    // Store original values for reset
    setOriginalValues({
      camera_orbit: dialogue.camera_orbit,
      camera_target: dialogue.camera_target,
      field_of_view: dialogue.field_of_view,
      zoom_speed: dialogue.zoom_speed
    });
  }, [isEditMode, dialogueData, currentDialogueIndex]);

  // Set slider value helper
  const setSliderValue = (sliderId: string, value: number, min: number, max: number) => {
    const slider = document.getElementById(sliderId) as HTMLInputElement;
    const valueDisplay = document.getElementById(sliderId + 'Value');
    
    if (slider) {
      slider.min = min.toString();
      slider.max = max.toString();
      slider.value = value.toString();
    }
    
    if (valueDisplay) {
      if (sliderId.includes('Azimuth') || sliderId.includes('Polar') || sliderId.includes('FOV')) {
        valueDisplay.textContent = value + '°';
      } else if (sliderId.includes('Radius') || sliderId.includes('target')) {
        valueDisplay.textContent = value + 'm';
      } else if (sliderId.includes('Speed')) {
        valueDisplay.textContent = value + 'x';
      }
    }
  };

  // Update dialogue text with current dial values (real-time)
  const updateDialogueTextWithCurrentValues = () => {
    if (!isEditMode || !currentEditingDialogue) return;
    
    // Get current slider values
    const azimuth = parseFloat((document.getElementById('orbitAzimuth') as HTMLInputElement)?.value || '0');
    const polar = parseFloat((document.getElementById('orbitPolar') as HTMLInputElement)?.value || '75');
    const radius = parseFloat((document.getElementById('orbitRadius') as HTMLInputElement)?.value || '3');
    
    const targetX = parseFloat((document.getElementById('targetX') as HTMLInputElement)?.value || '0');
    const targetY = parseFloat((document.getElementById('targetY') as HTMLInputElement)?.value || '1.6');
    const targetZ = parseFloat((document.getElementById('targetZ') as HTMLInputElement)?.value || '0');
    
    const fieldOfView = parseFloat((document.getElementById('fieldOfView') as HTMLInputElement)?.value || '45');
    const zoomSpeed = parseFloat((document.getElementById('zoomSpeed') as HTMLInputElement)?.value || '1.0');
    
    // Create updated dialogue with current dial values
    const updatedDialogue = {
      ...currentEditingDialogue,
      camera_orbit: `${azimuth}deg ${polar}deg ${radius}m`,
      camera_target: `${targetX}m ${targetY}m ${targetZ}m`,
      field_of_view: fieldOfView,
      zoom_speed: zoomSpeed
    };
    
    // Update dialogue text in speech bubble with current dial values
    const dialogueText = `
      <div>
        <strong>${updatedDialogue.character}:</strong> ${updatedDialogue.text}
      </div>
    `;
    
    setCurrentDialogueText(dialogueText);
    
    // Store current dial values for reference
    setCurrentDialValues({
      camera_orbit: updatedDialogue.camera_orbit,
      camera_target: updatedDialogue.camera_target,
      field_of_view: updatedDialogue.field_of_view,
      zoom_speed: updatedDialogue.zoom_speed
    });
  };

  // Save camera changes
  const saveCameraChanges = async () => {
    if (!currentEditingDialogue) return;
    
    setIsSaving(true);
    setSaveMessage(null);
    
    try {
      // Get current slider values
      const azimuth = parseFloat((document.getElementById('orbitAzimuth') as HTMLInputElement)?.value || '0');
      const polar = parseFloat((document.getElementById('orbitPolar') as HTMLInputElement)?.value || '75');
      const radius = parseFloat((document.getElementById('orbitRadius') as HTMLInputElement)?.value || '3');
      
      const targetX = parseFloat((document.getElementById('targetX') as HTMLInputElement)?.value || '0');
      const targetY = parseFloat((document.getElementById('targetY') as HTMLInputElement)?.value || '1.6');
      const targetZ = parseFloat((document.getElementById('targetZ') as HTMLInputElement)?.value || '0');
      
      const fieldOfView = parseFloat((document.getElementById('fieldOfView') as HTMLInputElement)?.value || '45');
      const zoomSpeed = parseFloat((document.getElementById('zoomSpeed') as HTMLInputElement)?.value || '1.0');
      
      const data = {
        camera_orbit: `${azimuth}deg ${polar}deg ${radius}m`,
        camera_target: `${targetX}m ${targetY}m ${targetZ}m`,
        field_of_view: fieldOfView,
        zoom_speed: zoomSpeed
      };
      
      // Update the dialogue via the parent component
      onDialogueUpdate?.(currentEditingDialogue.dialogue_id, data);
      
      // Update local state
      const updatedDialogue = {
        ...currentEditingDialogue,
        ...data
      };
      setCurrentEditingDialogue(updatedDialogue);
      
      // Update dialogueData with the new values
      setDialogueData(prev => prev.map(d => 
        d.dialogue_id === currentEditingDialogue.dialogue_id 
          ? { ...d, ...data }
          : d
      ));
      
      setOriginalValues(data);
      setSaveMessage({ type: 'success', text: 'Camera changes saved successfully!' });
      
      // Refresh the dialogue display to show updated values immediately
      // Use the updated dialogue data directly instead of waiting for state update
      const updatedDialogueData = dialogueData.map(d => 
        d.dialogue_id === currentEditingDialogue.dialogue_id 
          ? { ...d, ...data }
          : d
      );
      showDialogueWithData(currentDialogueIndex, updatedDialogueData);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSaveMessage(null), 3000);
      
    } catch (error) {
      console.error('Error saving camera changes:', error);
      setSaveMessage({ type: 'error', text: 'Error saving changes' });
    } finally {
      setIsSaving(false);
    }
  };

  // Reset camera changes
  const resetCameraChanges = () => {
    if (!currentEditingDialogue || !originalValues) return;
    
    // Restore original values
    const resetDialogue = {
      ...currentEditingDialogue,
      ...originalValues
    };
    setCurrentEditingDialogue(resetDialogue);
    
    // Update dialogueData with the reset values
    setDialogueData(prev => prev.map(d => 
      d.dialogue_id === currentEditingDialogue.dialogue_id 
        ? { ...d, ...originalValues }
        : d
    ));
    
    // Reload slider values
    loadCurrentDialogueValues();
    
    // Update model-viewer
    if (modelViewerRef.current) {
      modelViewerRef.current.cameraTarget = originalValues.camera_target;
      modelViewerRef.current.cameraOrbit = originalValues.camera_orbit;
      modelViewerRef.current.fieldOfView = `${originalValues.field_of_view}deg`;
    }
    
    setSaveMessage({ type: 'success', text: 'Changes reset to original values' });
    
    // Refresh the dialogue display to show reset values immediately
    // Use the reset dialogue data directly instead of waiting for state update
    const resetDialogueData = dialogueData.map(d => 
      d.dialogue_id === currentEditingDialogue.dialogue_id 
        ? { ...d, ...originalValues }
        : d
    );
    showDialogueWithData(currentDialogueIndex, resetDialogueData);
    
    setTimeout(() => setSaveMessage(null), 3000);
  };

  // Load dialogue values when edit mode is activated
  useEffect(() => {
    if (isEditMode) {
      loadCurrentDialogueValues();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode]);

  // Get 3D model from season (Django pattern) - memoize to prevent unnecessary recalculations
  const getModelFromSeason = useCallback((episode: Episode): string | null => {
    const season = seasons.find(s => s.id === episode.season);
    return season?.model_gltf || null;
  }, [seasons]);

  // Load dialogue data from hidden container (Django pattern)
  const loadDialogue = (index: number) => {
    console.log('Comic3DViewer: Loading dialogue data for index:', index);
    
    if (!episodeDialogues || !episodeDialogues[index]) {
      console.log('Comic3DViewer: No dialogue data found for index:', index);
      return null;
    }
    
    const dialogue = episodeDialogues[index];
    console.log('Comic3DViewer: Loaded dialogue data:', dialogue);
    
    return {
      dialogue_id: dialogue.id,
      index: index,
      character: dialogue.character,
      text: dialogue.text,
      camera_orbit: dialogue.camera_orbit,
      camera_target: dialogue.camera_target,
      field_of_view: dialogue.field_of_view || '45.0',
      zoom_speed: dialogue.zoom_speed || 1.0,
      head_x: 0,
      head_y: 0,
      head_z: 0
    };
  };

  // Update dials to match dialogue values (for navigation)
  const updateDialsFromDialogue = (dialogue: DialogueData) => {
    if (!isEditMode) return;
    
    console.log('Comic3DViewer: Updating dials from dialogue:', dialogue);
    
    // Parse camera orbit (format: "azimuthdeg polardeg radiusm")
    const orbitParts = dialogue.camera_orbit.split(' ');
    const azimuth = parseFloat(orbitParts[0].replace('deg', ''));
    const polar = parseFloat(orbitParts[1].replace('deg', ''));
    const radius = parseFloat(orbitParts[2].replace('m', ''));
    
    // Parse camera target (format: "xm ym zm")
    const targetParts = dialogue.camera_target.split(' ');
    const targetX = parseFloat(targetParts[0].replace('m', ''));
    const targetY = parseFloat(targetParts[1].replace('m', ''));
    const targetZ = parseFloat(targetParts[2].replace('m', ''));
    
    // Update all sliders
    setSliderValue('orbitAzimuth', azimuth, -180, 180);
    setSliderValue('orbitPolar', polar, 0, 180);
    setSliderValue('orbitRadius', radius, 1, 10);
    setSliderValue('targetX', targetX, -5, 5);
    setSliderValue('targetY', targetY, 0, 3);
    setSliderValue('targetZ', targetZ, -5, 5);
    setSliderValue('fieldOfView', dialogue.field_of_view, 10, 90);
    setSliderValue('zoomSpeed', dialogue.zoom_speed, 0.1, 3);
    
    console.log('Comic3DViewer: Dials updated to match dialogue values');
  };

  // Show dialogue with camera animation (Django pattern) - with custom dialogue data
  const showDialogueWithData = (index: number, customDialogueData: DialogueData[]) => {
    console.log('Comic3DViewer: showDialogueWithData called with index:', index);
    console.log('Comic3DViewer: customDialogueData length:', customDialogueData?.length);
    console.log('Comic3DViewer: customDialogueData:', customDialogueData);
    
    if (!customDialogueData || !customDialogueData[index]) {
      console.log('Comic3DViewer: No dialogue found for index:', index);
      return;
    }

    console.log('Comic3DViewer: Showing dialogue:', index);
    
    // Update current dialogue index
    setCurrentDialogueIndex(index);
    
    // Use the provided dialogue data
    const currentDialogue = customDialogueData[index];
    console.log('Comic3DViewer: Current dialogue:', currentDialogue);
    
    // Update dialogue text in speech bubble (Django pattern: <strong>Character:</strong> text)
    const dialogueText = `
      <div>
        <strong>${currentDialogue.character}:</strong> ${currentDialogue.text}
      </div>
    `;
    console.log('Comic3DViewer: Setting dialogue text:', dialogueText);
    setCurrentDialogueText(dialogueText);
    
    // Animate camera position (Django pattern - exact implementation)
    console.log('Comic3DViewer: === CAMERA UPDATE DEBUG ===');
    console.log('Comic3DViewer: Dialogue index:', index);
    console.log('Comic3DViewer: modelViewerRef.current:', !!modelViewerRef.current);
    console.log('Comic3DViewer: isModelReady:', isModelReady);
    console.log('Comic3DViewer: currentDialogue:', currentDialogue);
    
    if (modelViewerRef.current) {
      console.log('Comic3DViewer: Camera target before:', modelViewerRef.current.cameraTarget);
      console.log('Comic3DViewer: Camera orbit before:', modelViewerRef.current.cameraOrbit);
      console.log('Comic3DViewer: New camera target:', currentDialogue.camera_target);
      console.log('Comic3DViewer: New camera orbit:', currentDialogue.camera_orbit);
      console.log('Comic3DViewer: Field of view:', currentDialogue.field_of_view);
      
      // First set the target (Django pattern)
      modelViewerRef.current.cameraTarget = currentDialogue.camera_target;
      console.log('Comic3DViewer: Camera target after setting:', modelViewerRef.current.cameraTarget);
      
      // Set field of view (Django pattern)
      modelViewerRef.current.fieldOfView = currentDialogue.field_of_view + "deg";
      console.log('Comic3DViewer: Field of view after setting:', modelViewerRef.current.fieldOfView);
      
      // Try setting camera orbit directly first (Django pattern)
      modelViewerRef.current.cameraOrbit = currentDialogue.camera_orbit;
      console.log('Comic3DViewer: Camera orbit after direct setting:', modelViewerRef.current.cameraOrbit);
      
      // Use the animation system for smooth camera movement (Django pattern)
      console.log('Comic3DViewer: About to animate with orbit value:', currentDialogue.camera_orbit);
      console.log('Comic3DViewer: Type of orbit value:', typeof currentDialogue.camera_orbit);
      
      try {
        const animation = modelViewerRef.current.animate({
          cameraOrbit: currentDialogue.camera_orbit
        }, {
          duration: 500, // 500ms animation like Django
          easing: 'ease-in-out'
        });
        
        console.log('Comic3DViewer: Animation started with orbit:', currentDialogue.camera_orbit);
        console.log('Comic3DViewer: Animation object:', animation);
        
        // Wait for animation to complete (Django pattern)
        if (animation && animation.onfinish) {
          animation.onfinish = () => {
            console.log('Comic3DViewer: Camera animation complete');
          };
        }
        
        // Update dials to match the dialogue values (bidirectional sync)
        updateDialsFromDialogue(currentDialogue);
      } catch (error) {
        console.error('Comic3DViewer: Error animating camera:', error);
        // Still update dials even if animation fails
        updateDialsFromDialogue(currentDialogue);
      }
    } else {
      console.log('Comic3DViewer: Cannot animate camera - modelViewerRef is null');
      // Update dials even if no model viewer
      updateDialsFromDialogue(currentDialogue);
    }
  };

  // Show dialogue with camera animation (Django pattern)
  const showDialogue = (index: number) => {
    console.log('Comic3DViewer: showDialogue called with index:', index);
    console.log('Comic3DViewer: dialogueData length:', dialogueData?.length);
    console.log('Comic3DViewer: dialogueData:', dialogueData);
    
    if (!dialogueData || !dialogueData[index]) {
      console.log('Comic3DViewer: No dialogue found for index:', index);
      return;
    }

    console.log('Comic3DViewer: Showing dialogue:', index);
    
    // Update current dialogue index
    setCurrentDialogueIndex(index);
    
    // Use the updated dialogue data from state
    const currentDialogue = dialogueData[index];
    console.log('Comic3DViewer: Current dialogue:', currentDialogue);
    
    // Update dialogue text in speech bubble (Django pattern: <strong>Character:</strong> text)
    const dialogueText = `
      <div>
        <strong>${currentDialogue.character}:</strong> ${currentDialogue.text}
      </div>
    `;
    console.log('Comic3DViewer: Setting dialogue text:', dialogueText);
    setCurrentDialogueText(dialogueText);
    
    // Animate camera position (Django pattern - exact implementation)
    console.log('Comic3DViewer: === CAMERA UPDATE DEBUG ===');
    console.log('Comic3DViewer: Dialogue index:', index);
    console.log('Comic3DViewer: modelViewerRef.current:', !!modelViewerRef.current);
    console.log('Comic3DViewer: isModelReady:', isModelReady);
    console.log('Comic3DViewer: currentDialogue:', currentDialogue);
    
    if (modelViewerRef.current) {
      console.log('Comic3DViewer: Camera target before:', modelViewerRef.current.cameraTarget);
      console.log('Comic3DViewer: Camera orbit before:', modelViewerRef.current.cameraOrbit);
      console.log('Comic3DViewer: New camera target:', currentDialogue.camera_target);
      console.log('Comic3DViewer: New camera orbit:', currentDialogue.camera_orbit);
      console.log('Comic3DViewer: Field of view:', currentDialogue.field_of_view);
      
      // First set the target (Django pattern)
      modelViewerRef.current.cameraTarget = currentDialogue.camera_target;
      console.log('Comic3DViewer: Camera target after setting:', modelViewerRef.current.cameraTarget);
      
      // Set field of view (Django pattern)
      modelViewerRef.current.fieldOfView = currentDialogue.field_of_view + "deg";
      console.log('Comic3DViewer: Field of view after setting:', modelViewerRef.current.fieldOfView);
      
      // Try setting camera orbit directly first (Django pattern)
      modelViewerRef.current.cameraOrbit = currentDialogue.camera_orbit;
      console.log('Comic3DViewer: Camera orbit after direct setting:', modelViewerRef.current.cameraOrbit);
      
      // Use the animation system for smooth camera movement (Django pattern)
      console.log('Comic3DViewer: About to animate with orbit value:', currentDialogue.camera_orbit);
      console.log('Comic3DViewer: Type of orbit value:', typeof currentDialogue.camera_orbit);
      
      try {
        const animation = modelViewerRef.current.animate({
          cameraOrbit: currentDialogue.camera_orbit
        }, {
          duration: 500, // 500ms animation like Django
          easing: 'ease-in-out'
        });
        
        console.log('Comic3DViewer: Animation started with orbit:', currentDialogue.camera_orbit);
        console.log('Comic3DViewer: Animation object:', animation);
        
        // Wait for animation to complete (Django pattern)
        if (animation && animation.onfinish) {
          animation.onfinish = () => {
            console.log('Comic3DViewer: Camera animation complete');
          };
        }
        
        // Update dials to match the dialogue values (bidirectional sync)
        updateDialsFromDialogue(currentDialogue);
      } catch (error) {
        console.error('Comic3DViewer: Error animating camera:', error);
        // Still update dials even if animation fails
        updateDialsFromDialogue(currentDialogue);
      }
    } else {
      console.log('Comic3DViewer: Cannot animate camera - modelViewerRef is null');
      // Update dials even if no model viewer
      updateDialsFromDialogue(currentDialogue);
    }
  };

  // Navigation functions (Django pattern)
  const goToPreviousDialogue = () => {
    console.log('Comic3DViewer: Previous button clicked, current index:', currentDialogueIndex);
    
    if (isShowingSummary) {
      // If showing summary, go back to last dialogue
      setIsShowingSummary(false);
      loadDialogue(currentDialogueIndex);
      showDialogue(currentDialogueIndex);
    } else if (currentDialogueIndex > 0) {
      const newIndex = currentDialogueIndex - 1;
      console.log('Comic3DViewer: Moving to previous dialogue, new index:', newIndex);
      loadDialogue(newIndex);
      showDialogue(newIndex);
    } else {
      console.log('Comic3DViewer: Already at first dialogue');
    }
  };

  const goToNextDialogue = () => {
    console.log('Comic3DViewer: Next button clicked, current index:', currentDialogueIndex);
    
    if (currentDialogueIndex < episodeDialogues.length - 1) {
      const newIndex = currentDialogueIndex + 1;
      console.log('Comic3DViewer: Moving to next dialogue, new index:', newIndex);
      loadDialogue(newIndex);
      showDialogue(newIndex);
    } else {
      console.log('Comic3DViewer: At last dialogue - showing episode summary');
      setIsShowingSummary(true);
    }
  };

  // Auto-play functionality (Django pattern)
  const startPlayback = () => {
    if (isPlaying) return;
    
    console.log('Comic3DViewer: Starting auto-play');
    setIsPlaying(true);
    
    // Start auto-play interval
    playIntervalRef.current = setInterval(() => {
      // Use callback to get current index value
      setCurrentDialogueIndex(currentIndex => {
        console.log('Comic3DViewer: Auto-play tick, current index:', currentIndex);
        
        if (currentIndex < episodeDialogues.length - 1) {
          const newIndex = currentIndex + 1;
          console.log('Comic3DViewer: Auto-play moving to next dialogue:', newIndex);
          
          // Load dialogue data first (Django pattern)
          loadDialogue(newIndex);
          
          // Show dialogue with camera animation (this will update currentDialogueIndex)
          showDialogue(newIndex);
          
          return newIndex; // Update the index
        } else {
          console.log('Comic3DViewer: Auto-play reached end - showing summary');
          // End of dialogues, show summary
          setIsShowingSummary(true);
          pausePlayback();
          return currentIndex; // Keep current index
        }
      });
    }, playSpeed);
  };

  const pausePlayback = () => {
    setIsPlaying(false);
    if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current);
      playIntervalRef.current = null;
    }
  };

  const togglePlay = () => {
    if (isPlaying) {
      pausePlayback();
    } else {
      startPlayback();
    }
  };

  // Auto-select first episode when episodes are loaded (Django pattern)
  useEffect(() => {
    if (episodes.length > 0 && !selectedEpisode) {
      // Select first episode (Django pattern - model comes from season)
      console.log('Comic3DViewer: Auto-selecting first episode (Django pattern):', episodes[0]);
      setSelectedEpisode(episodes[0]);
    }
  }, [episodes, selectedEpisode]);

  // Handle model switching when episode changes
  useEffect(() => {
    if (selectedEpisode) {
      console.log('Comic3DViewer: Episode changed, resetting model state');
      setIsModelReady(false);
      setIsStarted(false);
      setCurrentDialogueIndex(0);
      setIsPlaying(false);
      setIsShowingSummary(false);
      setCurrentDialogueText('');
      animationsStartedRef.current = false; // Reset animations flag
      
      // Clear any existing intervals
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
        playIntervalRef.current = null;
      }
    }
  }, [selectedEpisode]);

  // Handle model change detection
  useEffect(() => {
    if (selectedEpisode) {
      const currentModel = getModelFromSeason(selectedEpisode);
      if (currentModel !== previousModel) {
        console.log('Comic3DViewer: Model changed, resetting state');
        console.log('Comic3DViewer: Previous model:', previousModel);
        console.log('Comic3DViewer: Current model:', currentModel);
        setIsModelReady(false);
        setIsStarted(false);
        animationsStartedRef.current = false; // Reset animations flag
        setPreviousModel(currentModel);
      }
    }
  }, [selectedEpisode, previousModel, getModelFromSeason]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    };
  }, []);

  return (
    <div className="comic-3d-viewer">
      {/* Episode Selection */}
      <div className="row mb-2">
        <div className="col-12">
          <div className="card border-0">
            {!readOnly && (
              <div className="card-header border-0">
                <h5 className="subtext-btn mb-0">Scene Viewer</h5>
              </div>
            )}
            <div className="card-body p-0">
              {episodes.length === 0 ? (
                <p className="text-muted">No episodes available for this story.</p>
              ) : (
                <div className="d-flex flex-wrap gap-2">
                  {episodes.map(episode => (
                    <button
                      key={episode.id}
                      className={`btn ${selectedEpisode?.id === episode.id ? 'btn-primary' : 'btn-outline-primary'} episode-select-btn`}
                      onClick={() => handleEpisodeSelect(episode)}
                      style={{ flex: `0 0 calc(${100 / episodes.length}% - 0.5rem)`, minWidth: '150px' }}
                    >
                      <i className="fas fa-video me-1"></i>
                      {episode.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3D Model Container */}
      {selectedEpisode && (
        <div className="row">
          <div className="col-12">
            <div className="card model-container position-relative" style={{ height: '400px', display: 'block' }}>
              {/* Overlay with Start Button */}
              {!isStarted && (
                <div className="overlay-container position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ zIndex: 2, background: 'rgba(0,0,0,0.7)' }}>
                  <button
                    className="btn btn-primary btn-lg"
                    onClick={startEpisode}
                    style={{ 
                      background: 'rgba(255, 77, 77, 0.5)', 
                      border: 'none',
                      padding: '1rem 2rem',
                      fontSize: '1.2rem',
                      fontWeight: 'bold'
                    }}
                  >
                    <i className="fas fa-play me-2"></i>
                    &nbsp;Start Episode
                  </button>
                </div>
              )}

              {/* 3D Model Viewer */}
              {isStarted ? (
                getModelFromSeason(selectedEpisode) ? (
                <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                  {/* Debug logging */}
                  {(() => {
                    console.log('Comic3DViewer: Rendering model viewer, isEditMode:', isEditMode, 'isStarted:', isStarted);
                    return null;
                  })()}
                  
                  {/* Direct model-viewer element like Django template */}
                  <model-viewer
                    key={`model-viewer-${selectedEpisode?.id}-${getModelFromSeason(selectedEpisode)}-${isStarted}`}
                    ref={modelViewerRef}
                    src={getModelFromSeason(selectedEpisode)}
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
                    camera-orbit="0deg 75deg 3m"
                    // camera-controls
                    style={{ 
                      width: '100%', 
                      height: '100%',
                      display: 'block',
                      visibility: 'visible',
                      opacity: 1
                    }}
                  />
                  
                  {/* Speech Bubble - positioned absolutely over the model viewer (Django pattern) */}
                  <div 
                    className="speech-bubble position-absolute bg-light p-1 rounded-2 border border-secondary w-100 align-top"
                    style={{ 
                      zIndex: 10, 
                      top: '0',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '90%',
                      maxWidth: '600px',
                      textAlign: 'left',
                      fontFamily: 'animeace, Comic, sans-serif',
                      fontSize: 'small',
                      fontStyle: 'italic',
                      backgroundColor: 'rgba(248, 249, 250, 0.95)',
                      border: '2px solid #333',
                      borderRadius: '8px',
                      boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
                    }}
                  >
                    <div id="top-dialogue">
                      {isShowingSummary ? (
                        <div>
                          <h6>Episode Summary</h6>
                          <p>{selectedEpisode.description}</p>
                        </div>
                      ) : currentDialogueText ? (
                        <div dangerouslySetInnerHTML={{ __html: currentDialogueText }} />
                      ) : (
                        <div>
                          <strong>Debug:</strong> No dialogue text available. 
                          <br />Current index: {currentDialogueIndex}
                          <br />Total dialogues: {episodeDialogues.length}
                          <br />Is started: {isStarted ? 'Yes' : 'No'}
                          <br />Selected episode: {selectedEpisode?.title || 'None'}
                          <br />Episode dialogues: {episodeDialogues.map(d => `${d.character}: ${d.text.substring(0, 20)}...`).join(', ')}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* SVG for Pointer Line */}
                  <svg id="pointer-svg" style={{ display: 'none' }}>
                    <path id="pointer-path" stroke="white" strokeWidth="2" strokeDasharray="5,5" fill="none"/>
                  </svg>
                  
                  {/* Loading indicator */}
                  {!isModelReady && (
                    <div className="position-absolute top-50 start-50 translate-middle text-center">
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading 3D model...</span>
                      </div>
                      <div className="mt-2">Loading 3D model...</div>
                      <div className="mt-2 small text-muted">
                        Model URL: {getModelFromSeason(selectedEpisode)}
                      </div>
                    </div>
                  )}
                  
                  {/* Debug info */}
                  <div className="position-absolute top-0 start-0 p-2 bg-dark text-white small" style={{ zIndex: 1000 }}>
                    <div>isStarted: {isStarted ? 'true' : 'false'}</div>
                    <div>isModelReady: {isModelReady ? 'true' : 'false'}</div>
                    <div>isEditMode: {isEditMode ? 'true' : 'false'}</div>
                    <div>Model URL: {getModelFromSeason(selectedEpisode)}</div>
                    <div>Model Viewer Element: {modelViewerRef.current ? 'Found' : 'Not Found'}</div>
                  </div>
                </div>
                ) : (
                  <div className="d-flex align-items-center justify-content-center h-100 bg-light">
                    <div className="text-center">
                      <i className="fas fa-cube fa-3x text-muted mb-3"></i>
                      <h5 className="text-muted">No 3D Model Available</h5>
                      <p className="text-muted">This episode doesn't have a 3D model uploaded.</p>
                    </div>
                  </div>
                )
              ) : (
                <div className="w-100 h-100">
                  {selectedEpisode?.cover_image && typeof selectedEpisode.cover_image === 'string' ? (
                    <img 
                      src={selectedEpisode.cover_image as string}
                      alt={`${selectedEpisode.title} cover`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div className="w-100 h-100 d-flex align-items-center justify-content-center bg-light">
                      <div className="text-muted">Episode cover not available</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hidden Dialogues Container (Django pattern) */}
      {selectedEpisode && episodeDialogues.length > 0 && (
        <div className="dialogues-container" style={{ display: 'none' }}>
          {episodeDialogues.map((dialogue, index) => (
            <div 
              key={dialogue.id || index}
              className="dialogue" 
              data-pov={JSON.stringify({
                dialogue_id: dialogue.id,
                character: dialogue.character,
                camera_orbit: dialogue.camera_orbit,
                camera_target: dialogue.camera_target,
                field_of_view: dialogue.field_of_view,
                zoom_speed: dialogue.zoom_speed,
                rotation: dialogue.rotation || '0deg 0deg 0deg',
                head_x: 0,
                head_y: 0,
                head_z: 0,
                text: dialogue.text
              })}
            />
          ))}
        </div>
      )}

      {/* Progress Bar */}
      {selectedEpisode && episodeDialogues.length > 0 && (
        <div className="row mt-2">
          <div className="col-12">
            <div className="d-flex align-items-center gap-3">
              <div className="progress flex-grow-1" style={{ height: '8px' }}>
                <div 
                  className="progress-bar bg-success" 
                  style={{ 
                    width: `${isShowingSummary ? 100 : ((currentDialogueIndex + 1) / episodeDialogues.length) * 100}%`,
                    transition: 'width 0.3s ease'
                  }}
                />
              </div>
              <div className="text-end" style={{ fontSize: '0.8rem', minWidth: '40px' }}>
                <span>
                  {isShowingSummary ? `${episodeDialogues.length} / ${episodeDialogues.length}` : `${currentDialogueIndex + 1} / ${episodeDialogues.length}`}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Controls - Only show after Start Episode is clicked */}
      {isStarted && selectedEpisode && episodeDialogues.length > 0 && (
        <div className="row mt-2">
          <div className="col-12">
            <div className="card bg-transparent border-0">
              <div className="card-body p-0">
                <div className="row justify-content-between align-items-center">
                  <div className="col-auto">
                    <button
                      className="btn btn-primary"
                      onClick={goToPreviousDialogue}
                      disabled={currentDialogueIndex === 0 && !isShowingSummary}
                      title={`Previous dialogue (${currentDialogueIndex}/${episodeDialogues.length})`}
                    >
                      <i className="fas fa-chevron-left"></i>
                    </button>
                  </div>
                  
                  <div className="col-auto d-flex align-items-center gap-2">
                    <button
                      className="btn btn-success"
                      onClick={togglePlay}
                    >
                      <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'}`}></i>
                    </button>
                    
                    <div className="btn-group" role="group">
                      <button
                        type="button"
                        className={`btn btn-sm ${playSpeed === 5000 ? 'btn-primary' : 'btn-outline-secondary'}`}
                        onClick={() => setPlaySpeed(5000)}
                      >
                        1x
                      </button>
                      <button
                        type="button"
                        className={`btn btn-sm ${playSpeed === 3333 ? 'btn-primary' : 'btn-outline-secondary'}`}
                        onClick={() => setPlaySpeed(3333)}
                      >
                        1.5x
                      </button>
                    </div>
                  </div>
                  
                  <div className="col-auto">
                    <button
                      className="btn btn-primary"
                      onClick={goToNextDialogue}
                      disabled={currentDialogueIndex === episodeDialogues.length - 1 && !isShowingSummary}
                      title={`Next dialogue (${currentDialogueIndex + 1}/${episodeDialogues.length})`}
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

      {/* Edit Mode Toggle - Hidden in read-only mode */}
      {!readOnly && selectedEpisode && (
        <div className="row mt-2">
          <div className="col-12">
            <div className="card  bg-transparent">
              <div className="card-body p-0">
                <div className="btn-group w-100" role="group">
                  <button
                    type="button"
                    className={`btn ${!isEditMode ? 'btn-outline-primary active' : 'btn-outline-primary'} mode-toggle-btn`}
                    onClick={() => setIsEditMode(false)}
                    style={{
                      borderColor: '#111e7f',
                      color: !isEditMode ? '#fff' : '#111e7f',
                      backgroundColor: !isEditMode ? '#111e7f' : 'transparent'
                    }}
                  >
                    <i className="fas fa-eye me-1"></i>Preview Mode
                  </button>
                  <button
                    type="button"
                    className={`btn ${isEditMode ? 'btn-outline-warning active' : 'btn-outline-warning'} mode-toggle-btn`}
                    onClick={() => {
                      console.log('Edit Mode button clicked, current isEditMode:', isEditMode);
                      console.log('Current isStarted:', isStarted);
                      console.log('Current isModelReady:', isModelReady);
                      setIsEditMode(true);
                    }}
                    style={{
                      borderColor: '#f9a602',
                      color: isEditMode ? '#fff' : '#f9a602',
                      backgroundColor: isEditMode ? '#f9a602' : 'transparent'
                    }}
                  >
                    <i className="fas fa-edit me-1"></i>Edit Mode
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* No Dialogues Message - Hidden in read-only mode */}
      {!readOnly && isEditMode && selectedEpisode && dialogueData.length === 0 && (
        <div className="row mt-2">
          <div className="col-12">
            <div className="alert alert-info">
              <i className="fas fa-info-circle me-2"></i>
              No dialogues available for editing. Please add dialogues to this episode first.
            </div>
          </div>
        </div>
      )}

      {/* Edit Controls */}
      {/* Edit Controls - Hidden in read-only mode */}
      {!readOnly && isEditMode && selectedEpisode && dialogueData.length > 0 && (() => {
        console.log('Rendering edit controls, isEditMode:', isEditMode, 'selectedEpisode:', selectedEpisode, 'dialogueData length:', dialogueData.length);
        return (
          <div className="row mt-2">
            <div className="col-12">
              <div className="modern-card" style={{
              background: '#fff',
              borderRadius: '18px',
              boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
              border: '1px solid #e0e0e0',
              padding: '0',
              marginBottom: '1.5rem'
            }}>
              <div className="modern-card-header p-1" style={{
                background: 'linear-gradient(90deg, #f8f9fa 60%, #f9a602 100%)',
                borderRadius: '10px 10px 0 0',
                // padding: '1rem 1.5rem 0.5rem 1.5rem',
                borderBottom: '1px solid #e0e0e0'
              }}>
                <span className="modern-card-title px-md-4" style={{
                  fontSize: '1.2rem',
                  fontWeight: '700',
                  color: '#222',
                  letterSpacing: '0.5px'
                }}>
                  Scene Editing Controls
                </span>
              </div>
              
              {/* Save/Reset Buttons Row */}
              <div className="row g-2" style={{ padding: '1rem 1.5rem 0.5rem 1.5rem' }}>
                <div className="col-6">
                  <button 
                    className="btn btn-success btn-sm w-100"
                    onClick={saveCameraChanges}
                    disabled={isSaving}
                    style={{ 
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      borderRadius: '8px',
                      padding: '0.5rem 1rem'
                    }}
                  >
                    <i className="fas fa-save me-1"></i>
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                </div>
                <div className="col-6">
                  <button 
                    className="btn btn-secondary btn-sm w-100"
                    onClick={resetCameraChanges}
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
                // padding: '1.5rem 1.5rem 1rem 1.5rem',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1.2rem 1rem'
              }}>
                {/* Camera Orbit (Left Column) */}
                <div className="col mt-0 p-1 p-md-4">
                  <div className="section-header" style={{
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: '#111e7f',
                    marginBottom: '0.5rem',
                    marginTop: '0.5rem',
                    letterSpacing: '0.2px'
                  }}>
                    Camera Orbit
                  </div>
                  
                  <div className="form-group mb-3">
                    <label htmlFor="orbitAzimuth" className="form-label d-flex align-items-center gap-2">
                      <span className="material-symbols-outlined" style={{ fontSize: '2rem', fontVariationSettings: "'FILL' 1" }}>360</span>
                      <span>Azimuth</span>
                    </label>
                    <div className="slider-row" style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      width: '100%'
                    }}>
                      <input
                        type="range"
                        id="orbitAzimuth"
                        className="form-range modern-slider"
                        style={{ flex: 1 }}
                        min="-180"
                        max="180"
                        step="1"
                        onChange={(e) => {
                          const azimuth = e.target.value;
                          const current = currentEditingDialogue || dialogueData[currentDialogueIndex];
                          
                          // Validate current dialogue data
                          if (!current || !current.dialogue_id || !current.camera_orbit) {
                            console.error('Comic3DViewer: Invalid dialogue data for azimuth update:', current);
                            return;
                          }
                          
                          const newOrbit = `${azimuth}deg ${current.camera_orbit.split(' ')[1]} ${current.camera_orbit.split(' ')[2]}`;
                          
                          // Update dialogue text in real-time
                          updateDialogueTextWithCurrentValues();
                          
                          // Update dialogue data (only send the specific field being updated)
                          updateCameraDebounced(current.dialogue_id, { camera_orbit: newOrbit });
                          
                          // Update 3D model camera in real-time (Django pattern)
                          if (modelViewerRef.current && isModelReady) {
                            modelViewerRef.current.cameraOrbit = newOrbit;
                            console.log('Comic3DViewer: Real-time camera orbit update:', newOrbit);
                          }
                          
                          // Update value badge
                          const valueBadge = document.getElementById('orbitAzimuthValue');
                          if (valueBadge) {
                            valueBadge.textContent = `${azimuth}°`;
                          }
                        }}
                      />
                      <span className="value-badge" id="orbitAzimuthValue" style={{
                        minWidth: '38px',
                        display: 'inline-block',
                        background: '#f9a602',
                        color: '#222',
                        fontWeight: '600',
                        borderRadius: '8px',
                        padding: '2px 8px',
                        fontSize: '0.95em',
                        marginLeft: '0.5rem',
                        textAlign: 'center'
                      }}>
                        0°
                      </span>
                    </div>
                  </div>
                  
                  <div className="form-group mb-3">
                    <label htmlFor="orbitPolar" className="form-label d-flex align-items-center gap-2">
                      <span className="material-symbols-outlined" style={{ fontSize: '2rem', transform: 'rotate(90deg)', fontVariationSettings: "'FILL' 1" }}>360</span>
                      <span>Polar</span>
                    </label>
                    <div className="slider-row" style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      width: '100%'
                    }}>
                      <input
                        type="range"
                        id="orbitPolar"
                        className="form-range modern-slider"
                        style={{ flex: 1 }}
                        min="0"
                        max="180"
                        step="1"
                        onChange={(e) => {
                          const polar = e.target.value;
                          const current = currentEditingDialogue || dialogueData[currentDialogueIndex];
                          if (!current) return;
                          const newOrbit = `${current.camera_orbit.split(' ')[0]} ${polar}deg ${current.camera_orbit.split(' ')[2]}`;
                          
                          // Update dialogue text in real-time
                          updateDialogueTextWithCurrentValues();
                          
                          // Update dialogue data
                          updateCameraDebounced(current.dialogue_id, { camera_orbit: newOrbit });
                          
                          // Update 3D model camera in real-time (Django pattern)
                          if (modelViewerRef.current && isModelReady) {
                            modelViewerRef.current.cameraOrbit = newOrbit;
                            console.log('Comic3DViewer: Real-time camera orbit update:', newOrbit);
                          }
                          
                          // Update value badge
                          const valueBadge = document.getElementById('orbitPolarValue');
                          if (valueBadge) {
                            valueBadge.textContent = `${polar}°`;
                          }
                        }}
                      />
                      <span className="value-badge" id="orbitPolarValue" style={{
                        minWidth: '38px',
                        display: 'inline-block',
                        background: '#f9a602',
                        color: '#222',
                        fontWeight: '600',
                        borderRadius: '8px',
                        padding: '2px 8px',
                        fontSize: '0.95em',
                        marginLeft: '0.5rem',
                        textAlign: 'center'
                      }}>
                        75°
                      </span>
                    </div>
                  </div>
                  
                  <div className="form-group mb-3">
                    <label htmlFor="orbitRadius" className="form-label">Radius</label>
                    <div className="slider-row" style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      width: '100%'
                    }}>
                      <input
                        type="range"
                        id="orbitRadius"
                        className="form-range modern-slider"
                        style={{ flex: 1 }}
                        min="1"
                        max="10"
                        step="0.1"
                        onChange={(e) => {
                          const radius = e.target.value;
                          const current = currentEditingDialogue || dialogueData[currentDialogueIndex];
                          if (!current) return;
                          const newOrbit = `${current.camera_orbit.split(' ')[0]} ${current.camera_orbit.split(' ')[1]} ${radius}m`;
                          
                          // Update dialogue text in real-time
                          updateDialogueTextWithCurrentValues();
                          
                          // Update dialogue data
                          updateCameraDebounced(current.dialogue_id, { camera_orbit: newOrbit });
                          
                          // Update 3D model camera in real-time (Django pattern)
                          if (modelViewerRef.current && isModelReady) {
                            modelViewerRef.current.cameraOrbit = newOrbit;
                            console.log('Comic3DViewer: Real-time camera orbit update:', newOrbit);
                          }
                          
                          // Update value badge
                          const valueBadge = document.getElementById('orbitRadiusValue');
                          if (valueBadge) {
                            valueBadge.textContent = `${radius}m`;
                          }
                        }}
                      />
                      <span className="value-badge" id="orbitRadiusValue" style={{
                        minWidth: '38px',
                        display: 'inline-block',
                        background: '#f9a602',
                        color: '#222',
                        fontWeight: '600',
                        borderRadius: '8px',
                        padding: '2px 8px',
                        fontSize: '0.95em',
                        marginLeft: '0.5rem',
                        textAlign: 'center'
                      }}>
                        3m
                      </span>
                    </div>
                  </div>
                  
                  {/* Field of View (Left Column) */}
                  <div className="form-group mb-3">
                    <label htmlFor="fieldOfView" className="form-label">Field of View</label>
                    <div className="slider-row" style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      width: '100%'
                    }}>
                      <input
                        type="range"
                        id="fieldOfView"
                        className="form-range modern-slider"
                        style={{ flex: 1 }}
                        min="10"
                        max="90"
                        step="1"
                        onChange={(e) => {
                          const fov = parseFloat(e.target.value);
                          const current = currentEditingDialogue || dialogueData[currentDialogueIndex];
                          if (!current) return;
                          
                          // Update dialogue text in real-time
                          updateDialogueTextWithCurrentValues();
                          
                          // Update dialogue data
                          updateCameraDebounced(current.dialogue_id, { field_of_view: fov });
                          
                          // Update 3D model camera in real-time (Django pattern)
                          if (modelViewerRef.current && isModelReady) {
                            modelViewerRef.current.fieldOfView = `${fov}deg`;
                            console.log('Comic3DViewer: Real-time field of view update:', fov);
                          }
                          
                          // Update value badge
                          const valueBadge = document.getElementById('fieldOfViewValue');
                          if (valueBadge) {
                            valueBadge.textContent = `${fov}°`;
                          }
                        }}
                      />
                      <span className="value-badge" id="fieldOfViewValue" style={{
                        minWidth: '38px',
                        display: 'inline-block',
                        background: '#f9a602',
                        color: '#222',
                        fontWeight: '600',
                        borderRadius: '8px',
                        padding: '2px 8px',
                        fontSize: '0.95em',
                        marginLeft: '0.5rem',
                        textAlign: 'center'
                      }}>
                        45°
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Camera Target (Right Column) */}
                <div className="col mt-0 p-1 p-md-4">
                  <div className="section-header" style={{
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: '#111e7f',
                    marginBottom: '0.5rem',
                    marginTop: '0.5rem',
                    letterSpacing: '0.2px'
                  }}>
                    Camera Target
                  </div>
                  
                  <div className="form-group mb-3">
                    <label htmlFor="targetX" className="form-label">X</label>
                    <div className="slider-row" style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      width: '100%'
                    }}>
                      <input
                        type="range"
                        id="targetX"
                        className="form-range modern-slider"
                        style={{ flex: 1 }}
                        min="-5"
                        max="5"
                        step="0.1"
                        onChange={(e) => {
                          const x = e.target.value;
                          const current = currentEditingDialogue || dialogueData[currentDialogueIndex];
                          if (!current) return;
                          const newTarget = `${x}m ${current.camera_target.split(' ')[1]} ${current.camera_target.split(' ')[2]}`;
                          
                          // Update dialogue text in real-time
                          updateDialogueTextWithCurrentValues();
                          
                          // Update dialogue data
                          updateCameraDebounced(current.dialogue_id, { camera_target: newTarget });
                          
                          // Update 3D model camera in real-time (Django pattern)
                          if (modelViewerRef.current && isModelReady) {
                            modelViewerRef.current.cameraTarget = newTarget;
                            console.log('Comic3DViewer: Real-time camera target update:', newTarget);
                          }
                          
                          // Update value badge
                          const valueBadge = document.getElementById('targetXValue');
                          if (valueBadge) {
                            valueBadge.textContent = `${x}m`;
                          }
                        }}
                      />
                      <span className="value-badge" id="targetXValue" style={{
                        minWidth: '38px',
                        display: 'inline-block',
                        background: '#f9a602',
                        color: '#222',
                        fontWeight: '600',
                        borderRadius: '8px',
                        padding: '2px 8px',
                        fontSize: '0.95em',
                        marginLeft: '0.5rem',
                        textAlign: 'center'
                      }}>
                        0m
                      </span>
                    </div>
                  </div>
                  
                  <div className="form-group mb-3">
                    <label htmlFor="targetY" className="form-label d-flex align-items-center gap-2">
                      <span className="material-symbols-outlined" style={{ fontSize: '2rem', transform: 'rotate(90deg)', fontVariationSettings: "'FILL' 1" }}>arrow_range</span>
                      <span>Y</span>
                    </label>
                    <div className="slider-row" style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      width: '100%'
                    }}>
                      <input
                        type="range"
                        id="targetY"
                        className="form-range modern-slider"
                        style={{ flex: 1 }}
                        min="0"
                        max="3"
                        step="0.1"
                        onChange={(e) => {
                          const y = e.target.value;
                          const current = currentEditingDialogue || dialogueData[currentDialogueIndex];
                          if (!current) return;
                          const newTarget = `${current.camera_target.split(' ')[0]} ${y}m ${current.camera_target.split(' ')[2]}`;
                          
                          // Update dialogue text in real-time
                          updateDialogueTextWithCurrentValues();
                          
                          // Update dialogue data
                          updateCameraDebounced(current.dialogue_id, { camera_target: newTarget });
                          
                          // Update 3D model camera in real-time (Django pattern)
                          if (modelViewerRef.current && isModelReady) {
                            modelViewerRef.current.cameraTarget = newTarget;
                            console.log('Comic3DViewer: Real-time camera target update:', newTarget);
                          }
                          
                          // Update value badge
                          const valueBadge = document.getElementById('targetYValue');
                          if (valueBadge) {
                            valueBadge.textContent = `${y}m`;
                          }
                        }}
                      />
                      <span className="value-badge" id="targetYValue" style={{
                        minWidth: '38px',
                        display: 'inline-block',
                        background: '#f9a602',
                        color: '#222',
                        fontWeight: '600',
                        borderRadius: '8px',
                        padding: '2px 8px',
                        fontSize: '0.95em',
                        marginLeft: '0.5rem',
                        textAlign: 'center'
                      }}>
                        1.6m
                      </span>
                    </div>
                  </div>
                  
                  <div className="form-group mb-3">
                    <label htmlFor="targetZ" className="form-label d-flex align-items-center gap-2">
                      <span className="material-symbols-outlined" style={{ fontSize: '2rem', fontVariationSettings: "'FILL' 1" }}>arrow_range</span>
                      <span>Z</span>
                    </label>
                    <div className="slider-row" style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      width: '100%'
                    }}>
                      <input
                        type="range"
                        id="targetZ"
                        className="form-range modern-slider"
                        style={{ flex: 1 }}
                        min="-5"
                        max="5"
                        step="0.1"
                        onChange={(e) => {
                          const z = e.target.value;
                          const current = currentEditingDialogue || dialogueData[currentDialogueIndex];
                          if (!current) return;
                          const newTarget = `${current.camera_target.split(' ')[0]} ${current.camera_target.split(' ')[1]} ${z}m`;
                          
                          // Update dialogue text in real-time
                          updateDialogueTextWithCurrentValues();
                          
                          // Update dialogue data
                          updateCameraDebounced(current.dialogue_id, { camera_target: newTarget });
                          
                          // Update 3D model camera in real-time (Django pattern)
                          if (modelViewerRef.current && isModelReady) {
                            modelViewerRef.current.cameraTarget = newTarget;
                            console.log('Comic3DViewer: Real-time camera target update:', newTarget);
                          }
                          
                          // Update value badge
                          const valueBadge = document.getElementById('targetZValue');
                          if (valueBadge) {
                            valueBadge.textContent = `${z}m`;
                          }
                        }}
                      />
                      <span className="value-badge" id="targetZValue" style={{
                        minWidth: '38px',
                        display: 'inline-block',
                        background: '#f9a602',
                        color: '#222',
                        fontWeight: '600',
                        borderRadius: '8px',
                        padding: '2px 8px',
                        fontSize: '0.95em',
                        marginLeft: '0.5rem',
                        textAlign: 'center'
                      }}>
                        0m
                      </span>
                    </div>
                  </div>
                  
                  {/* Zoom Speed (Right Column) */}
                  <div className="form-group mb-3">
                    <label htmlFor="zoomSpeed" className="form-label">Zoom Speed</label>
                    <div className="slider-row" style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      width: '100%'
                    }}>
                      <input
                        type="range"
                        id="zoomSpeed"
                        className="form-range modern-slider"
                        style={{ flex: 1 }}
                        min="0.1"
                        max="3"
                        step="0.1"
                        onChange={(e) => {
                          const speed = parseFloat(e.target.value);
                          const current = currentEditingDialogue || dialogueData[currentDialogueIndex];
                          if (!current) return;
                          
                          // Update dialogue text in real-time
                          updateDialogueTextWithCurrentValues();
                          
                          // Update dialogue data
                          updateCameraDebounced(current.dialogue_id, { zoom_speed: speed });
                          
                          // Note: Zoom speed doesn't directly affect the 3D model camera
                          // It's used for animation speed, so no real-time update needed
                          console.log('Comic3DViewer: Zoom speed updated:', speed);
                          
                          // Update value badge
                          const valueBadge = document.getElementById('zoomSpeedValue');
                          if (valueBadge) {
                            valueBadge.textContent = `${speed}x`;
                          }
                        }}
                      />
                      <span className="value-badge" id="zoomSpeedValue" style={{
                        minWidth: '38px',
                        display: 'inline-block',
                        background: '#f9a602',
                        color: '#222',
                        fontWeight: '600',
                        borderRadius: '8px',
                        padding: '2px 8px',
                        fontSize: '0.95em',
                        marginLeft: '0.5rem',
                        textAlign: 'center'
                      }}>
                        1.0x
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Current Values (Full Width) */}
                <div className="col-md-6 mt-2" style={{ gridColumn: '1 / -1' }}>
                  <div className="current-values-box" style={{
                    background: '#f8f9fa',
                    borderRadius: '8px',
                    padding: '0.75rem 1rem',
                    fontSize: '0.98em',
                    color: '#333',
                    marginTop: '0.5rem',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.03)'
                  }}>
                    <h6 className="text-primary mb-2">Current Values (Last Saved)</h6>
                    <div><strong>Camera Orbit:</strong> <span id="currentOrbit">{originalValues?.camera_orbit || '0deg 75deg 3m'}</span></div>
                    <div><strong>Camera Target:</strong> <span id="currentTarget">{originalValues?.camera_target || '0m 1.6m 0m'}</span></div>
                    <div><strong>Field of View:</strong> <span id="currentFOV">{originalValues?.field_of_view || 45}°</span></div>
                    <div><strong>Zoom Speed:</strong> <span id="currentZoom">{originalValues?.zoom_speed || 1.0}</span></div>
                  </div>
                </div>
                
                {/* Save Message */}
                {saveMessage && (
                  <div className="col-12 mt-2">
                    <div className={`alert alert-${saveMessage.type === 'success' ? 'success' : 'danger'}`} style={{
                      marginBottom: '0',
                      padding: '0.5rem 1rem',
                      fontSize: '0.9em'
                    }}>
                      {saveMessage.text}
                    </div>
                  </div>
                )}
                
                {/* Animation Controls Section */}
                <div className="col-md-6 mt-3" style={{ gridColumn: '1 / -1' }}>
                  <div className="section-header" style={{
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: '#6f42c1',
                    marginBottom: '0.5rem',
                    marginTop: '0.5rem',
                    letterSpacing: '0.2px'
                  }}>
                    Animation Controls
                  </div>
                  
                  <AnimationController
                    modelViewerRef={modelViewerRef}
                    autoPlay={false} // Don't auto-play in edit mode
                    showControls={true} // Show controls in edit mode
                    onAnimationChange={(animationName) => {
                      console.log('Comic3DViewer Edit Mode: Animation changed to:', animationName);
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        );
      })()}
    </div>
  );
};

export default Comic3DViewer;
