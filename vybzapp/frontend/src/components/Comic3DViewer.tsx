import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Episode, Dialogue, Season, AdPlacement } from '../services/api';
import apiService from '../services/api';
import AnimationController from './AnimationController';
import logger from '../utils/logger';
import './Comic3DViewer.css';

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
  /** Fired after a successful view increment; `storyTotalViews` is the server sum for the story when provided. */
  onViewIncremented?: (storyId: number, storyTotalViews?: number) => void;
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

/** Episode intro = description before dialogues; outro = summary after last dialogue */
type EpisodePlaybackPhase = 'intro' | 'dialogue' | 'outro';

/** GLB ad slots: slot_name → material to texture-swap and optional click hit area. */
const AD_SLOT_TARGETS: Record<string, {
  materialName: string;
  clickCenter?: { x: number; y: number; z: number };
  clickRadius?: number;
}> = {
  ed_bb: {
    materialName: 'Billboard_front',
    clickCenter: { x: -6.556, y: 1.041, z: -7.314 },
    clickRadius: 4,
  },
};

const DEFAULT_AD_SLOT = 'ed_bb';

const Comic3DViewer: React.FC<Comic3DViewerProps> = ({
  episodes,
  dialogues,
  seasons,
  storyId,
  seasonId,
  onEpisodeSelect,
  onDialogueUpdate,
  onViewIncremented,
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
  const [playbackPhase, setPlaybackPhase] = useState<EpisodePlaybackPhase>('dialogue');
  const [currentEditingDialogue, setCurrentEditingDialogue] = useState<DialogueData | null>(null);
  const [originalValues, setOriginalValues] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [currentDialogueText, setCurrentDialogueText] = useState('');
  const [previousModel, setPreviousModel] = useState<string | null>(null);
  const [dialogueData, setDialogueData] = useState<DialogueData[]>([]);
  const [adPlacements, setAdPlacements] = useState<AdPlacement[]>([]);
  const [adPlacementsLoading, setAdPlacementsLoading] = useState(false);
  const [currentDialValues, setCurrentDialValues] = useState<any>(null);
  const [isWaitingForDialogues, setIsWaitingForDialogues] = useState(false);
  const trackedEpisodesRef = useRef<Set<number>>(new Set()); // Track which episodes have had views incremented
  const trackedAdEventsRef = useRef<Set<string>>(new Set());
  const activeAdPlacementsRef = useRef<Map<string, AdPlacement>>(new Map());
  const originalSlotTexturesRef = useRef<Map<string, unknown>>(new Map());
  const adSlotSurfacePrefixRef = useRef<Map<string, string>>(new Map());
  const lastAdClickAtRef = useRef<number>(0);
  
  const modelViewerRef = useRef<any>(null);
  const playIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const animationsStartedRef = useRef<boolean>(false);
  const adSessionKeyRef = useRef<string>(
    (() => {
      const existing = window.sessionStorage.getItem('vybzAdSessionKey');
      if (existing) return existing;
      const generated = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      window.sessionStorage.setItem('vybzAdSessionKey', generated);
      return generated;
    })()
  );
  
  // Filter dialogues for selected episode - memoize to prevent infinite loops
  const episodeDialogues = useMemo(() => {
    return selectedEpisode 
      ? dialogues.filter(d => d.episode === selectedEpisode.id)
      : [];
  }, [dialogues, selectedEpisode]);

  const selectedSeason = useMemo(() => {
    return selectedEpisode ? seasons.find(s => s.id === selectedEpisode.season) || null : null;
  }, [seasons, selectedEpisode]);
  
  // Create hotspots for characters based on POV data
  const createHotspots = useCallback(() => {
    const modelViewer = modelViewerRef.current;
    if (!modelViewer || !dialogueData.length) {
      return;
    }

    // Remove existing hotspots
    const existingHotspots = modelViewer.querySelectorAll('.character-hotspot');
    existingHotspots.forEach((hotspot: any) => hotspot.remove());

    // Create hotspots for each unique character
    const uniqueCharacters = new Set<string>();
    dialogueData.forEach((dialogue) => {
      // Extract base character name (remove numbers if any)
      const baseCharacterName = dialogue.character.replace(/\s*\d+$/, '');
      
      // Only create hotspot if we haven't seen this character before
      if (!uniqueCharacters.has(baseCharacterName)) {
        uniqueCharacters.add(baseCharacterName);

        const hotspot = document.createElement('div');
        hotspot.setAttribute('slot', `hotspot-${baseCharacterName}`);
        hotspot.className = 'hotspot character-hotspot';
        hotspot.setAttribute('data-position', `${dialogue.head_x}m ${dialogue.head_y}m ${dialogue.head_z}m`);
        hotspot.setAttribute('data-normal', '0m 1m 0m');
        hotspot.setAttribute('data-character', baseCharacterName);
        hotspot.setAttribute('data-surface', 'false');
        hotspot.setAttribute('visibility-angle', "0");

        
        // Create the dot element inside the hotspot
        const dot = document.createElement('div');
        dot.className = 'dot';
        dot.textContent = baseCharacterName;
        hotspot.appendChild(dot);
        
        // Add the hotspot to the model-viewer
        modelViewer.appendChild(hotspot);
        
        logger.log('Comic3DViewer: Created hotspot for character', baseCharacterName, 'at position', `${dialogue.head_x}m ${dialogue.head_y}m ${dialogue.head_z}m`);
      }
    });
  }, [dialogueData]);

  const trackAdEvent = useCallback((placement: AdPlacement, eventType: 'impression' | 'click') => {
    if (!selectedEpisode) return;
    const key = `${eventType}-${selectedEpisode.id}-${placement.id}`;
    if (trackedAdEventsRef.current.has(key)) return;
    trackedAdEventsRef.current.add(key);

    apiService.trackAdEvent({
      placement: placement.id,
      episode: selectedEpisode.id,
      event_type: eventType,
      session_key: adSessionKeyRef.current,
      event_token: placement.event_token
    }).catch((error) => {
      trackedAdEventsRef.current.delete(key);
      logger.warn('Comic3DViewer: Failed to track ad event', eventType, placement.id, error);
    });
  }, [selectedEpisode]);

  const getActiveAdPlacementsBySlot = useCallback((placements: AdPlacement[]) => {
    const bySlot = new Map<string, AdPlacement>();
    // An episode-specific placement (has `episode`) is more specific than a
    // season-wide one (episode is null/undefined) and should win for the same
    // slot; priority breaks ties within the same specificity.
    const isEpisodeSpecific = (placement: AdPlacement) =>
      placement.episode !== null && placement.episode !== undefined;
    placements
      .filter((placement) => placement.creative_image_url)
      .forEach((placement) => {
        const slotName = placement.slot_name || DEFAULT_AD_SLOT;
        const existing = bySlot.get(slotName);
        if (!existing) {
          bySlot.set(slotName, placement);
          return;
        }
        const existingSpecific = isEpisodeSpecific(existing);
        const candidateSpecific = isEpisodeSpecific(placement);
        if (candidateSpecific !== existingSpecific) {
          if (candidateSpecific) {
            bySlot.set(slotName, placement);
          }
          return;
        }
        if (placement.priority > existing.priority) {
          bySlot.set(slotName, placement);
        }
      });
    return bySlot;
  }, []);

  const cacheOriginalSlotTextures = useCallback(() => {
    const modelViewer = modelViewerRef.current;
    if (!modelViewer?.model) {
      return;
    }

    Object.entries(AD_SLOT_TARGETS).forEach(([slotName, target]) => {
      if (originalSlotTexturesRef.current.has(slotName)) {
        return;
      }
      try {
        const material = modelViewer.model.getMaterialByName(target.materialName);
        const texture = material?.pbrMetallicRoughness?.baseColorTexture?.texture;
        if (texture) {
          originalSlotTexturesRef.current.set(slotName, texture);
        }
      } catch {
        // Ignore cache failures for unknown materials.
      }
    });
  }, []);

  const calibrateAdSlotClickTargets = useCallback(async () => {
    const modelViewer = modelViewerRef.current;
    if (!modelViewer || typeof modelViewer.surfaceFromPoint !== 'function') {
      return;
    }

    for (const [slotName, target] of Object.entries(AD_SLOT_TARGETS)) {
      if (adSlotSurfacePrefixRef.current.has(slotName) || !target.clickCenter) {
        continue;
      }

      const center = target.clickCenter;
      const hotspot = document.createElement('button');
      hotspot.type = 'button';
      hotspot.slot = `hotspot-cal-${slotName}`;
      hotspot.setAttribute('data-position', `${center.x}m ${center.y}m ${center.z}m`);
      hotspot.setAttribute('data-normal', '0m 1m 0m');
      hotspot.setAttribute('data-visibility-attribute', 'visible');
      hotspot.style.cssText = 'opacity:0;width:1px;height:1px;padding:0;border:0;pointer-events:none;';
      modelViewer.appendChild(hotspot);

      try {
        if (modelViewer.updateComplete) {
          await modelViewer.updateComplete;
        }
        await new Promise((resolve) => setTimeout(resolve, 150));

        const hotspotData = modelViewer.queryHotspot?.(`hotspot-cal-${slotName}`);
        if (!hotspotData?.canvasPosition) {
          continue;
        }

        const rect = modelViewer.getBoundingClientRect();
        const clientX = rect.left + hotspotData.canvasPosition.x;
        const clientY = rect.top + hotspotData.canvasPosition.y;
        const surface = modelViewer.surfaceFromPoint(clientX, clientY);
        if (surface) {
          adSlotSurfacePrefixRef.current.set(slotName, surface.split(' ').slice(0, 2).join(' '));
          logger.log('Comic3DViewer: Calibrated ad click surface for slot', slotName, surface);
        }
      } catch (error) {
        logger.warn('Comic3DViewer: Failed to calibrate ad click target for slot', slotName, error);
      } finally {
        hotspot.remove();
      }
    }
  }, []);

  const applyAdTexturesToModel = useCallback(async () => {
    const modelViewer = modelViewerRef.current;
    if (!modelViewer || !selectedEpisode || !modelViewer.model) {
      return;
    }

    cacheOriginalSlotTextures();

    const placementsBySlot = getActiveAdPlacementsBySlot(adPlacements);
    activeAdPlacementsRef.current = placementsBySlot;

    for (const [slotName, target] of Object.entries(AD_SLOT_TARGETS)) {
      const placement = placementsBySlot.get(slotName);
      try {
        const material = modelViewer.model.getMaterialByName(target.materialName);
        if (!material) {
          if (placement) {
            logger.warn('Comic3DViewer: Ad material not found for slot', slotName, target.materialName);
          }
          continue;
        }

        if (placement) {
          const texture = await modelViewer.createTexture(placement.creative_image_url);
          material.pbrMetallicRoughness.baseColorTexture.setTexture(texture);
          logger.log('Comic3DViewer: Applied ad texture to slot', slotName, placement.creative_title);
          trackAdEvent(placement, 'impression');
          continue;
        }

        // Only restore the GLB default when this episode truly has no ad for the slot.
        if (adPlacementsLoading) {
          continue;
        }

        const originalTexture = originalSlotTexturesRef.current.get(slotName);
        if (originalTexture) {
          material.pbrMetallicRoughness.baseColorTexture.setTexture(originalTexture);
        }
      } catch (error) {
        logger.warn('Comic3DViewer: Failed to apply ad texture for slot', slotName, error);
      }
    }

    await calibrateAdSlotClickTargets();
  }, [adPlacements, adPlacementsLoading, selectedEpisode, getActiveAdPlacementsBySlot, cacheOriginalSlotTextures, calibrateAdSlotClickTargets, trackAdEvent]);

  const handleAdMeshClick = useCallback((event: MouseEvent) => {
    const modelViewer = modelViewerRef.current;
    if (!modelViewer || activeAdPlacementsRef.current.size === 0) {
      return;
    }

    const now = Date.now();
    if (now - lastAdClickAtRef.current < 300) {
      return;
    }

    const clientX = event.clientX;
    const clientY = event.clientY;
    let matchedSlot: string | null = null;

    if (typeof modelViewer.surfaceFromPoint === 'function') {
      try {
        const surface = modelViewer.surfaceFromPoint(clientX, clientY);
        if (surface) {
          for (const slotName of Array.from(activeAdPlacementsRef.current.keys())) {
            const prefix = adSlotSurfacePrefixRef.current.get(slotName);
            if (prefix && surface.startsWith(prefix)) {
              matchedSlot = slotName;
              break;
            }
          }
        }
      } catch {
        // Fall through to position-based matching.
      }
    }

    if (!matchedSlot && typeof modelViewer.positionAndNormalFromPoint === 'function') {
      try {
        const hit = modelViewer.positionAndNormalFromPoint(clientX, clientY);
        if (hit?.position) {
          for (const [slotName, target] of Object.entries(AD_SLOT_TARGETS)) {
            if (!activeAdPlacementsRef.current.has(slotName) || !target.clickCenter) {
              continue;
            }
            const center = target.clickCenter;
            const radius = target.clickRadius ?? 3;
            const dx = hit.position.x - center.x;
            const dy = hit.position.y - center.y;
            const dz = hit.position.z - center.z;
            if (Math.sqrt(dx * dx + dy * dy + dz * dz) <= radius) {
              matchedSlot = slotName;
              break;
            }
          }
        }
      } catch {
        return;
      }
    }

    if (!matchedSlot) {
      return;
    }

    const placement = activeAdPlacementsRef.current.get(matchedSlot);
    if (!placement) {
      return;
    }

    lastAdClickAtRef.current = now;
    trackAdEvent(placement, 'click');
    if (placement.destination_url) {
      window.open(placement.destination_url, '_blank', 'noopener,noreferrer');
    }
  }, [trackAdEvent]);

  // Update dialogueData when episodeDialogues changes
  useEffect(() => {
    // Build fallback head position per character from any dialogue that has pov_data
    // (so when a dialogue has no POV linked, we still place the hotspot correctly)
    const characterHeadFallback: Record<string, { head_x: number; head_y: number; head_z: number }> = {};
    episodeDialogues.forEach((d) => {
      const name = (d.character_name || d.character?.toString() || 'Unknown').replace(/\s*\d+$/, '');
      if (d.pov_data?.head_x != null && d.pov_data?.head_y != null && d.pov_data?.head_z != null && !characterHeadFallback[name]) {
        characterHeadFallback[name] = {
          head_x: d.pov_data.head_x,
          head_y: d.pov_data.head_y,
          head_z: d.pov_data.head_z
        };
      }
    });

    const newDialogueData: DialogueData[] = episodeDialogues.map(d => {
      const character = d.character_name || d.character?.toString() || 'Unknown';
      const baseName = character.replace(/\s*\d+$/, '');
      const fallback = characterHeadFallback[baseName];
      // Use POV head position if available; else same character's fallback; else match sm.js defaults (head_y 0)
      const head_x = d.pov_data?.head_x ?? fallback?.head_x ?? 0;
      const head_y = d.pov_data?.head_y ?? fallback?.head_y ?? 0;
      const head_z = d.pov_data?.head_z ?? fallback?.head_z ?? 0;
      return {
        dialogue_id: d.id,
        character,
        text: d.text,
        camera_orbit: d.camera_orbit,
        camera_target: d.camera_target,
        field_of_view: d.field_of_view,
        zoom_speed: d.zoom_speed,
        head_x,
        head_y,
        head_z
      };
    });
    setDialogueData(newDialogueData);
  }, [episodeDialogues]);
  
  // Handle dialogues loading after episode has started (progressive loading fix)
  // This ensures that when dialogues load asynchronously after "Start Episode" is clicked,
  // the viewer properly displays the first dialogue instead of staying on the summary
  // Removed automatic switching from summary to dialogue
  // Summary will stay visible until user clicks Next button
  
  // Recreate hotspots when dialogueData changes (if model is ready)
  useEffect(() => {
    if (isModelReady && dialogueData.length > 0 && modelViewerRef.current) {
      // Small delay to ensure model-viewer is ready
      const timer = setTimeout(() => {
        createHotspots();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [dialogueData, isModelReady, createHotspots]);

  useEffect(() => {
    if (!selectedSeason || !selectedEpisode || !isStarted) {
      setAdPlacements([]);
      setAdPlacementsLoading(false);
      return;
    }

    let isCancelled = false;
    setAdPlacementsLoading(true);
    apiService.getAdPlacements(selectedSeason.id, selectedEpisode.id)
      .then((placements) => {
        if (!isCancelled) {
          setAdPlacements(placements);
          setAdPlacementsLoading(false);
        }
      })
      .catch((error) => {
        if (!isCancelled) {
          logger.warn('Comic3DViewer: Failed to load ad placements', error);
          setAdPlacements([]);
          setAdPlacementsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [selectedSeason, selectedEpisode, isStarted]);

  useEffect(() => {
    if (isModelReady && modelViewerRef.current) {
      const timer = setTimeout(() => {
        void applyAdTexturesToModel();
      }, 125);
      return () => clearTimeout(timer);
    }
  }, [adPlacements, adPlacementsLoading, isModelReady, selectedEpisode, applyAdTexturesToModel]);

  useEffect(() => {
    const modelViewer = modelViewerRef.current;
    if (!modelViewer || !isModelReady) {
      return;
    }

    modelViewer.addEventListener('pointerup', handleAdMeshClick);
    modelViewer.addEventListener('click', handleAdMeshClick);
    return () => {
      modelViewer.removeEventListener('pointerup', handleAdMeshClick);
      modelViewer.removeEventListener('click', handleAdMeshClick);
    };
  }, [isModelReady, handleAdMeshClick, selectedEpisode]);

  // Initialize model viewer when component mounts
  useEffect(() => {
    logger.log('Comic3DViewer: Initializing model-viewer script');
    const script = document.createElement('script');
    script.type = 'module';
    script.src = 'https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js';
    script.onload = () => {
      logger.log('Comic3DViewer: Model-viewer script loaded successfully');
    };
    script.onerror = () => {
      logger.error('Comic3DViewer: Failed to load model-viewer script');
    };
    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  // Helper function to start all available animations - re-query to get full GLB list, then play each
  const startAllAnimations = useCallback(() => {
    const modelViewer = modelViewerRef.current;
    if (!modelViewer) return;

    if (animationsStartedRef.current) {
      logger.log('Comic3DViewer: Animations already started, skipping');
      return;
    }

    const collectAnimations = (): string[] => {
      try {
        const list = modelViewer.availableAnimations || [];
        return Array.isArray(list) ? [...list] : [];
      } catch {
        return [];
      }
    };

    // Re-query at several delays so we catch all animations (model-viewer may populate async)
    let best: string[] = [];
    const check = () => {
      const list = collectAnimations();
      if (list.length > best.length) best = list;
    };
    [0, 200, 500].forEach((delay) => setTimeout(check, delay));

    setTimeout(() => {
      check();
      const animations = best.length > 0 ? best : collectAnimations();
      logger.log('Comic3DViewer: Available animations:', animations);

      if (animations.length === 0) {
        logger.log('Comic3DViewer: No animations available in this model');
        return;
      }

      animationsStartedRef.current = true;
      logger.log('Comic3DViewer: Starting all animations sequentially');

      const playNextAnimation = (index: number) => {
        if (index >= animations.length) {
          playNextAnimation(0);
          return;
        }

        const animationName = animations[index];
        logger.log(`Comic3DViewer: Starting animation ${index + 1}/${animations.length}: ${animationName}`);

        try {
          if (typeof modelViewer.playAnimation === 'function') {
            modelViewer.playAnimation(animationName, false);
          } else {
            modelViewer.animationName = animationName;
            modelViewer.play();
          }

          let advanced = false;
          const advance = () => {
            if (advanced) return;
            advanced = true;
            modelViewer.removeEventListener('finished', onFinished);
            logger.log(`Comic3DViewer: Animation "${animationName}" completed`);
            playNextAnimation(index + 1);
          };
          const onFinished = () => advance();
          modelViewer.addEventListener('finished', onFinished);
          const duration = modelViewer.getDuration?.(animationName) ?? 4000;
          setTimeout(advance, duration);
        } catch (error) {
          logger.error(`Comic3DViewer: Error starting animation "${animationName}":`, error);
          playNextAnimation(index + 1);
        }
      };

      setTimeout(() => playNextAnimation(0), 300);
    }, 600);
  }, []);

  // Slower animation playback to better match Blender (default 1x can feel too fast in browser)
  const DEFAULT_ANIMATION_TIME_SCALE = 0.5;

  // Handle model load event
  const handleModelReady = useCallback(() => {
    logger.log('Comic3DViewer: Model loaded and ready');
    const mv = modelViewerRef.current;
    if (mv && typeof mv.timeScale !== 'undefined') {
      mv.timeScale = DEFAULT_ANIMATION_TIME_SCALE;
      logger.log('Comic3DViewer: Set animation timeScale to', DEFAULT_ANIMATION_TIME_SCALE);
    }
    setIsModelReady(true);
    
    // Start all available animations
    startAllAnimations();
  }, [startAllAnimations]);

  // Handle model visibility event
  const handleModelVisibility = useCallback((event: any) => {
    if (event.detail.visible) {
      logger.log('Comic3DViewer: Model and hotspots ready');
      const mv = modelViewerRef.current;
      if (mv && typeof mv.timeScale !== 'undefined') {
        mv.timeScale = DEFAULT_ANIMATION_TIME_SCALE;
      }
      setIsModelReady(true);
      
      // Create hotspots from POV data
      createHotspots();
      
      // Start all available animations
      startAllAnimations();
    }
  }, [startAllAnimations, createHotspots]);

  // Handle camera change event
  const handleCameraChange = useCallback(() => {
    if (!isAnimating) {
      logger.camera('Comic3DViewer: Camera changed');
      // Update pointer if needed
    }
  }, [isAnimating]);

  // Add event listeners for model-viewer events
  useEffect(() => {
    if (isStarted && selectedEpisode && getModelFromSeason(selectedEpisode)) {
      logger.log('Comic3DViewer: Setting up event listeners, isEditMode:', isEditMode);
      // Wait for the model-viewer element to be created
      const timer = setTimeout(() => {
        const modelViewer = modelViewerRef.current;
        logger.log('Comic3DViewer: Setting up event listeners, modelViewer:', modelViewer);
        if (modelViewer) {
          logger.log('Comic3DViewer: Adding event listeners to model viewer');
          modelViewer.addEventListener('load', handleModelReady);
          modelViewer.addEventListener('model-visibility', handleModelVisibility);
          modelViewer.addEventListener('camera-change', handleCameraChange);
        } else {
          logger.log('Comic3DViewer: No model viewer element found');
        }
      }, 100);

      return () => {
        clearTimeout(timer);
        // Capture the ref value at the time of effect creation
        const currentRef = modelViewerRef.current;
        if (currentRef) {
          logger.log('Comic3DViewer: Removing event listeners');
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
    setPlaybackPhase('intro');
    onEpisodeSelect?.(episode);
  };

  // Start episode playback
  const startEpisode = () => {
    logger.log('Comic3DViewer: Start button clicked');
    logger.log('Comic3DViewer: Selected episode:', selectedEpisode);
    logger.log('Comic3DViewer: Episode has model:', selectedEpisode ? getModelFromSeason(selectedEpisode) : null);
    logger.log('Comic3DViewer: Model URL:', selectedEpisode ? getModelFromSeason(selectedEpisode) : null);
    logger.log('Comic3DViewer: Episode dialogues length:', episodeDialogues.length);
    
    // Always set isStarted to true - this will trigger model-viewer to render
    setIsStarted(true);
    // Reset isModelReady - it will be set to true when model actually loads
    setIsModelReady(false);
    
    // Show episode description first; user clicks Next to enter dialogues, then sees summary at the end
    setPlaybackPhase('intro');
    setCurrentDialogueIndex(0); // Set index to 0 so Next button will go to first dialogue
    
    // If dialogues are not loaded yet, wait for them
    if (episodeDialogues.length === 0 && selectedEpisode) {
      logger.log('Comic3DViewer: Dialogues not loaded yet, showing summary while waiting...');
      setIsWaitingForDialogues(true);
    } else {
      setIsWaitingForDialogues(false);
      logger.log('Comic3DViewer: Starting with summary (dialogues available, user can click Next to proceed)');
      
      // If episode has no dialogues at all (not just loading), increment view when user clicks Start
      // (since they can't complete it by going through dialogues)
      if (episodeDialogues.length === 0 && readOnly && selectedEpisode && selectedEpisode.is_published) {
        if (!trackedEpisodesRef.current.has(selectedEpisode.id)) {
          trackedEpisodesRef.current.add(selectedEpisode.id);
          logger.log('[Comic3DViewer] Episode has no dialogues - incrementing view on Start:', selectedEpisode.id);
          apiService.incrementEpisodeView(selectedEpisode.id)
            .then((response) => {
              logger.log('[Comic3DViewer] Episode view incremented successfully:', response);
              if (onViewIncremented) {
                onViewIncremented(storyId, response.story_total_views);
              }
            })
            .catch((error) => {
              logger.error('[Comic3DViewer] Error incrementing episode view:', error);
            });
        }
      }
    }
    
    // Don't start auto-play immediately - let user control with navigation buttons
    setIsPlaying(false);
  };
  
  // Handle dialogues loading after "Start" was clicked (progressive loading fix)
  useEffect(() => {
    // If we're waiting for dialogues and they just became available, keep showing summary
    // User will click Next to proceed to first dialogue
    if (isWaitingForDialogues && isStarted && selectedEpisode && episodeDialogues.length > 0) {
      logger.log('Comic3DViewer: Dialogues loaded after Start clicked, keeping summary visible (user can click Next)');
      setIsWaitingForDialogues(false);
      // Keep summary visible - don't auto-switch to dialogue
      // Summary stays visible until user clicks Next
    }
    
    // If dialogues finished loading and episode has no dialogues, increment view
    // (episode is effectively "complete" since there's nothing to view)
    if (isWaitingForDialogues && isStarted && selectedEpisode && episodeDialogues.length === 0 && readOnly && selectedEpisode.is_published) {
      logger.log('Comic3DViewer: Dialogues finished loading - episode has no dialogues, incrementing view');
      setIsWaitingForDialogues(false);
      if (!trackedEpisodesRef.current.has(selectedEpisode.id)) {
        trackedEpisodesRef.current.add(selectedEpisode.id);
        logger.log('[Comic3DViewer] Episode has no dialogues - incrementing view:', selectedEpisode.id);
        apiService.incrementEpisodeView(selectedEpisode.id)
          .then((response) => {
            logger.log('[Comic3DViewer] Episode view incremented successfully:', response);
            if (onViewIncremented) {
              onViewIncremented(storyId, response.story_total_views);
            }
          })
          .catch((error) => {
            logger.error('[Comic3DViewer] Error incrementing episode view:', error);
          });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [episodeDialogues.length, isWaitingForDialogues, isStarted, selectedEpisode, readOnly, storyId, onViewIncremented]);




  // Ref to store timeout for debouncing
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced update camera function to prevent infinite loops
  const updateCameraDebounced = useCallback((dialogueId: number, data: Partial<Dialogue>) => {
    // Validate dialogue ID
    if (!dialogueId || dialogueId <= 0) {
      logger.error('Comic3DViewer: Invalid dialogue ID:', dialogueId);
      return;
    }
    
    // Validate data
    if (!data || Object.keys(data).length === 0) {
      logger.error('Comic3DViewer: No data provided for dialogue update');
      return;
    }
    
    logger.log('Comic3DViewer: Updating dialogue', dialogueId, 'with data:', data);
    logger.log('Comic3DViewer: Data type:', typeof data);
    logger.log('Comic3DViewer: Data keys:', Object.keys(data));
    logger.log('Comic3DViewer: Data values:', Object.values(data));
    
    // Clear any existing timeout
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    
    // Set new timeout
    updateTimeoutRef.current = setTimeout(() => {
      try {
        logger.log('Comic3DViewer: Calling onDialogueUpdate with:', { dialogueId, data });
        onDialogueUpdate?.(dialogueId, data);
        logger.log('Comic3DViewer: Dialogue update successful');
      } catch (error: any) {
        logger.error('Comic3DViewer: Error updating dialogue:', error);
        logger.error('Comic3DViewer: Error details:', error.message);
        logger.error('Comic3DViewer: Error stack:', error.stack);
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
        jumpModelViewerCameraToGoal();
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
      setSliderValue('orbitRadius', radius, 0.1, 10);
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

  /** Sliders are uncontrolled — always compose orbit/target from DOM so one dial never clobbers others with stale React state. */
  const readCameraOrbitFromDom = (): string | null => {
    const azEl = document.getElementById('orbitAzimuth') as HTMLInputElement | null;
    const polEl = document.getElementById('orbitPolar') as HTMLInputElement | null;
    const radEl = document.getElementById('orbitRadius') as HTMLInputElement | null;
    if (!azEl || !polEl || !radEl) return null;
    const azimuth = parseFloat(azEl.value);
    const polar = parseFloat(polEl.value);
    const radius = parseFloat(radEl.value);
    if ([azimuth, polar, radius].some((n) => Number.isNaN(n))) return null;
    return `${azimuth}deg ${polar}deg ${radius}m`;
  };

  const readCameraTargetFromDom = (): string | null => {
    const xEl = document.getElementById('targetX') as HTMLInputElement | null;
    const yEl = document.getElementById('targetY') as HTMLInputElement | null;
    const zEl = document.getElementById('targetZ') as HTMLInputElement | null;
    if (!xEl || !yEl || !zEl) return null;
    const x = parseFloat(xEl.value);
    const y = parseFloat(yEl.value);
    const z = parseFloat(zEl.value);
    if ([x, y, z].some((n) => Number.isNaN(n))) return null;
    return `${x}m ${y}m ${z}m`;
  };

  /**
   * model-viewer keeps an internal "smooth" camera goal. Setting `cameraTarget` / `cameraOrbit`
   * alone can leave the rendered camera pulled away (reads as "zoomed out"), especially for
   * large or origin-offset GLBs. `jumpCameraToGoal()` snaps internal state to the current attributes.
   */
  const jumpModelViewerCameraToGoal = () => {
    const mv = modelViewerRef.current as { jumpCameraToGoal?: () => void } | null;
    if (mv && typeof mv.jumpCameraToGoal === 'function') {
      mv.jumpCameraToGoal();
    }
  };

  /**
   * When `cameraTarget` changes, model-viewer can momentarily re-resolve the camera goal, which
   * can feel like the zoom (orbit radius) "jumps". We aggressively re-apply the current orbit
   * radius from the DOM to keep the user's last dialed zoom consistent.
   */
  const getOrbitToKeep = (): string => {
    const mv = modelViewerRef.current as any;
    return (
      readCameraOrbitFromDom() ||
      (typeof mv?.cameraOrbit === 'string' ? mv.cameraOrbit : null) ||
      currentEditingDialogue?.camera_orbit ||
      dialogueData[currentDialogueIndex]?.camera_orbit ||
      '0deg 75deg 3m'
    );
  };

  const applyCameraTargetKeepingOrbit = (newTarget: string, orbitToKeep: string): void => {
    const mv = modelViewerRef.current as any;

    if (mv && isModelReady) {
      // Apply orbit before + after target, then snap to goal.
      mv.cameraOrbit = orbitToKeep;
      mv.cameraTarget = newTarget;
      mv.cameraOrbit = orbitToKeep;
      jumpModelViewerCameraToGoal();

      // Re-apply on next frame in case model-viewer recomputes internally.
      requestAnimationFrame(() => {
        const mv2 = modelViewerRef.current as any;
        if (!mv2) return;
        mv2.cameraOrbit = orbitToKeep;
        jumpModelViewerCameraToGoal();
      });

      // And again shortly after; some models trigger a second internal framing pass.
      window.setTimeout(() => {
        const mv3 = modelViewerRef.current as any;
        if (!mv3) return;
        mv3.cameraOrbit = orbitToKeep;
        jumpModelViewerCameraToGoal();
      }, 50);
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
      logger.camera('Error saving camera changes:', error);
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
      jumpModelViewerCameraToGoal();
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
    return season?.resolved_model_gltf || season?.model_gltf || null;
  }, [seasons]);

  // Load dialogue data from hidden container (Django pattern)
  const loadDialogue = (index: number) => {
    logger.log('Comic3DViewer: Loading dialogue data for index:', index);
    
    if (!episodeDialogues || !episodeDialogues[index]) {
      logger.log('Comic3DViewer: No dialogue data found for index:', index);
      return null;
    }
    
    const dialogue = episodeDialogues[index];
    logger.log('Comic3DViewer: Loaded dialogue data:', dialogue);
    
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
    
    logger.log('Comic3DViewer: Updating dials from dialogue:', dialogue);
    
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
    setSliderValue('orbitRadius', radius, 0.1, 10);
    setSliderValue('targetX', targetX, -5, 5);
    setSliderValue('targetY', targetY, 0, 3);
    setSliderValue('targetZ', targetZ, -5, 5);
    setSliderValue('fieldOfView', dialogue.field_of_view, 10, 90);
    setSliderValue('zoomSpeed', dialogue.zoom_speed, 0.1, 3);
    
    logger.log('Comic3DViewer: Dials updated to match dialogue values');
  };

  // Show dialogue with camera animation (Django pattern) - with custom dialogue data
  const showDialogueWithData = (index: number, customDialogueData: DialogueData[]) => {
    logger.log('Comic3DViewer: showDialogueWithData called with index:', index);
    logger.log('Comic3DViewer: customDialogueData length:', customDialogueData?.length);
    logger.log('Comic3DViewer: customDialogueData:', customDialogueData);
    
    if (!customDialogueData || !customDialogueData[index]) {
      logger.log('Comic3DViewer: No dialogue found for index:', index);
      return;
    }

    logger.log('Comic3DViewer: Showing dialogue:', index);
    
    // Update current dialogue index
    setCurrentDialogueIndex(index);
    
    // Use the provided dialogue data
    const currentDialogue = customDialogueData[index];
    logger.log('Comic3DViewer: Current dialogue:', currentDialogue);
    
    // Update dialogue text in speech bubble (Django pattern: <strong>Character:</strong> text)
    const dialogueText = `
      <div>
        <strong>${currentDialogue.character}:</strong> ${currentDialogue.text}
      </div>
    `;
    logger.log('Comic3DViewer: Setting dialogue text:', dialogueText);
    setCurrentDialogueText(dialogueText);
    
    // Animate camera position (Django pattern - exact implementation)
    logger.camera('Comic3DViewer: === CAMERA UPDATE DEBUG ===');
    logger.log('Comic3DViewer: Dialogue index:', index);
    logger.log('Comic3DViewer: modelViewerRef.current:', !!modelViewerRef.current);
    logger.log('Comic3DViewer: isModelReady:', isModelReady);
    logger.log('Comic3DViewer: currentDialogue:', currentDialogue);
    
    if (modelViewerRef.current) {
      logger.camera('Comic3DViewer: Camera target before:', modelViewerRef.current.cameraTarget);
      logger.camera('Comic3DViewer: Camera orbit before:', modelViewerRef.current.cameraOrbit);
      logger.camera('Comic3DViewer: New camera target:', currentDialogue.camera_target);
      logger.camera('Comic3DViewer: New camera orbit:', currentDialogue.camera_orbit);
      logger.camera('Comic3DViewer: Field of view:', currentDialogue.field_of_view);

      // Same path as StoryPreviewEditor: set goals and let model-viewer interpolation
      // ease between dialogue lines. Do not jumpCameraToGoal() here — that snaps instantly.
      modelViewerRef.current.cameraTarget = currentDialogue.camera_target;
      modelViewerRef.current.fieldOfView = `${currentDialogue.field_of_view}deg`;
      modelViewerRef.current.cameraOrbit = currentDialogue.camera_orbit;

      logger.camera('Comic3DViewer: Camera target after setting:', modelViewerRef.current.cameraTarget);
      logger.camera('Comic3DViewer: Field of view after setting:', modelViewerRef.current.fieldOfView);
      logger.camera('Comic3DViewer: Camera orbit after setting:', modelViewerRef.current.cameraOrbit);

      updateDialsFromDialogue(currentDialogue);
    } else {
      logger.camera('Comic3DViewer: Cannot update camera - modelViewerRef is null');
      updateDialsFromDialogue(currentDialogue);
    }
  };

  // Show dialogue with camera animation (Django pattern)
  const showDialogue = (index: number) => {
    logger.log('Comic3DViewer: showDialogue called with index:', index);
    logger.log('Comic3DViewer: dialogueData length:', dialogueData?.length);
    logger.log('Comic3DViewer: dialogueData:', dialogueData);
    
    if (!dialogueData || !dialogueData[index]) {
      logger.log('Comic3DViewer: No dialogue found for index:', index);
      return;
    }

    logger.log('Comic3DViewer: Showing dialogue:', index);
    
    // Update current dialogue index
    setCurrentDialogueIndex(index);
    
    // Use the updated dialogue data from state
    const currentDialogue = dialogueData[index];
    logger.log('Comic3DViewer: Current dialogue:', currentDialogue);
    
    // Update dialogue text in speech bubble (Django pattern: <strong>Character:</strong> text)
    const dialogueText = `
      <div>
        <strong>${currentDialogue.character}:</strong> ${currentDialogue.text}
      </div>
    `;
    logger.log('Comic3DViewer: Setting dialogue text:', dialogueText);
    setCurrentDialogueText(dialogueText);
    
    // Animate camera position (Django pattern - exact implementation)
    logger.camera('Comic3DViewer: === CAMERA UPDATE DEBUG ===');
    logger.log('Comic3DViewer: Dialogue index:', index);
    logger.log('Comic3DViewer: modelViewerRef.current:', !!modelViewerRef.current);
    logger.log('Comic3DViewer: isModelReady:', isModelReady);
    logger.log('Comic3DViewer: currentDialogue:', currentDialogue);
    
    if (modelViewerRef.current) {
      logger.camera('Comic3DViewer: Camera target before:', modelViewerRef.current.cameraTarget);
      logger.camera('Comic3DViewer: Camera orbit before:', modelViewerRef.current.cameraOrbit);
      logger.camera('Comic3DViewer: New camera target:', currentDialogue.camera_target);
      logger.camera('Comic3DViewer: New camera orbit:', currentDialogue.camera_orbit);
      logger.camera('Comic3DViewer: Field of view:', currentDialogue.field_of_view);

      // Same path as StoryPreviewEditor: set goals and let model-viewer interpolation
      // ease between dialogue lines. Do not jumpCameraToGoal() here — that snaps instantly.
      modelViewerRef.current.cameraTarget = currentDialogue.camera_target;
      modelViewerRef.current.fieldOfView = `${currentDialogue.field_of_view}deg`;
      modelViewerRef.current.cameraOrbit = currentDialogue.camera_orbit;

      logger.camera('Comic3DViewer: Camera target after setting:', modelViewerRef.current.cameraTarget);
      logger.camera('Comic3DViewer: Field of view after setting:', modelViewerRef.current.fieldOfView);
      logger.camera('Comic3DViewer: Camera orbit after setting:', modelViewerRef.current.cameraOrbit);

      updateDialsFromDialogue(currentDialogue);
    } else {
      logger.camera('Comic3DViewer: Cannot update camera - modelViewerRef is null');
      updateDialsFromDialogue(currentDialogue);
    }
  };

  // Navigation functions (Django pattern)
  const goToPreviousDialogue = () => {
    logger.log('Comic3DViewer: Previous button clicked, current index:', currentDialogueIndex);
    
    if (playbackPhase === 'outro') {
      setPlaybackPhase('dialogue');
      loadDialogue(currentDialogueIndex);
      showDialogue(currentDialogueIndex);
    } else if (currentDialogueIndex > 0) {
      const newIndex = currentDialogueIndex - 1;
      logger.log('Comic3DViewer: Moving to previous dialogue, new index:', newIndex);
      loadDialogue(newIndex);
      showDialogue(newIndex);
    } else {
      logger.log('Comic3DViewer: Already at first dialogue');
    }
  };

  // Helper function to increment episode view when completed
  const incrementEpisodeViewIfNeeded = useCallback(() => {
    logger.log('[Comic3DViewer] incrementEpisodeViewIfNeeded called');
    logger.log('[Comic3DViewer] selectedEpisode:', selectedEpisode);
    logger.log('[Comic3DViewer] readOnly:', readOnly);
    logger.log('[Comic3DViewer] storyId:', storyId);
    logger.log('[Comic3DViewer] onViewIncremented:', onViewIncremented);
    
    if (!selectedEpisode) {
      logger.warn('[Comic3DViewer] Cannot increment view - no selectedEpisode');
      return;
    }
    
    if (!readOnly) {
      logger.warn('[Comic3DViewer] Cannot increment view - not in readOnly mode');
      return;
    }
    
    // Only track once per episode per session
    if (trackedEpisodesRef.current.has(selectedEpisode.id)) {
      logger.log('[Comic3DViewer] Episode', selectedEpisode.id, 'already tracked in this session');
      return;
    }
    
    trackedEpisodesRef.current.add(selectedEpisode.id);
    
    logger.log('[Comic3DViewer] User completed episode - incrementing view for episode:', selectedEpisode.id, 'storyId:', storyId);
    logger.log('[Comic3DViewer] Note: Backend will validate if episode is published');
    
    // Increment view count via API
    // Backend will handle validation (is_published, is_public, etc.)
    apiService.incrementEpisodeView(selectedEpisode.id, { ad_session_key: adSessionKeyRef.current })
      .then((response) => {
        logger.log('[Comic3DViewer] Episode view incremented successfully:', response);
        // Notify parent component that a view was incremented so it can update the story's total_views
        if (onViewIncremented) {
          logger.log('[Comic3DViewer] Calling onViewIncremented callback with storyId:', storyId);
          onViewIncremented(storyId, response.story_total_views);
        } else {
          logger.warn('[Comic3DViewer] onViewIncremented callback not provided');
        }
      })
      .catch((error) => {
        // Backend returns 403 if episode not published or story/season not public
        const msg = error.response?.data?.error || error.message;
        if (error.response?.status === 403) {
          logger.warn('[Comic3DViewer] View increment blocked:', msg, '(Check episode is published and story is public & approved)');
        } else {
          logger.error('[Comic3DViewer] Error incrementing episode view:', error.response?.data || error.message);
        }
      });
  }, [selectedEpisode, readOnly, storyId, onViewIncremented]);

  const goToNextDialogue = () => {
    logger.log('Comic3DViewer: Next button clicked, current index:', currentDialogueIndex);
    logger.log('Comic3DViewer: playbackPhase:', playbackPhase);
    logger.log('Comic3DViewer: episodeDialogues.length:', episodeDialogues.length);
    
    // Intro: episode description → first dialogue (count as view once they start reading)
    if (playbackPhase === 'intro' && episodeDialogues.length > 0) {
      logger.log('Comic3DViewer: Moving from intro to first dialogue');
      setPlaybackPhase('dialogue');
      setCurrentDialogueIndex(0);
      loadDialogue(0);
      showDialogue(0);
      // Count view when user starts reading (first dialogue), not only when they reach the end
      incrementEpisodeViewIfNeeded();
      return;
    }

    // Outro: optional replay from first dialogue
    if (playbackPhase === 'outro' && episodeDialogues.length > 0) {
      setPlaybackPhase('dialogue');
      setCurrentDialogueIndex(0);
      loadDialogue(0);
      showDialogue(0);
      return;
    }
    
    // Otherwise, move to next dialogue
    logger.log('Comic3DViewer: Checking if at last dialogue...');
    logger.log('Comic3DViewer: currentDialogueIndex:', currentDialogueIndex);
    logger.log('Comic3DViewer: episodeDialogues.length:', episodeDialogues.length);
    logger.log('Comic3DViewer: Condition check: currentDialogueIndex < episodeDialogues.length - 1');
    logger.log('Comic3DViewer: Result:', currentDialogueIndex < episodeDialogues.length - 1);
    
    if (currentDialogueIndex < episodeDialogues.length - 1) {
      const newIndex = currentDialogueIndex + 1;
      logger.log('Comic3DViewer: Moving to next dialogue, new index:', newIndex);
      loadDialogue(newIndex);
      showDialogue(newIndex);
    } else {
      // User has reached the last dialogue and clicked Next - they completed the episode!
      logger.verbose('Comic3DViewer: ========== AT LAST DIALOGUE - COMPLETING EPISODE ==========');
      logger.log('Comic3DViewer: currentDialogueIndex:', currentDialogueIndex);
      logger.log('Comic3DViewer: episodeDialogues.length:', episodeDialogues.length);
      logger.log('Comic3DViewer: Setting playbackPhase to outro (episode summary)');
      setPlaybackPhase('outro');
      setCurrentDialogueText('');
      
      // Increment view count when user completes the episode
      logger.log('Comic3DViewer: About to call incrementEpisodeViewIfNeeded');
      incrementEpisodeViewIfNeeded();
    }
  };

  // Auto-play functionality (Django pattern)
  const startPlayback = () => {
    if (isPlaying) return;
    
    logger.log('Comic3DViewer: Starting auto-play');
    setIsPlaying(true);
    
    // Start auto-play interval
    playIntervalRef.current = setInterval(() => {
      // Use callback to get current index value
      setCurrentDialogueIndex(currentIndex => {
        logger.log('Comic3DViewer: Auto-play tick, current index:', currentIndex);
        
        if (currentIndex < episodeDialogues.length - 1) {
          const newIndex = currentIndex + 1;
          logger.log('Comic3DViewer: Auto-play moving to next dialogue:', newIndex);
          
          // Load dialogue data first (Django pattern)
          loadDialogue(newIndex);
          
          // Show dialogue with camera animation (this will update currentDialogueIndex)
          showDialogue(newIndex);
          
          return newIndex; // Update the index
        } else {
          logger.log('Comic3DViewer: Auto-play reached end - showing episode summary');
          setPlaybackPhase('outro');
          setCurrentDialogueText('');
          pausePlayback();
          
          // Increment view count when auto-play completes the episode
          // Use setTimeout to ensure we access the latest values from the closure
          setTimeout(() => {
            incrementEpisodeViewIfNeeded();
          }, 0);
          
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
      logger.log('Comic3DViewer: Auto-selecting first episode (Django pattern):', episodes[0]);
      const firstEpisode = episodes[0];
      setSelectedEpisode(firstEpisode);
      // CRITICAL: Also call onEpisodeSelect to trigger dialogue loading in parent
      onEpisodeSelect?.(firstEpisode);
    }
  }, [episodes, selectedEpisode, onEpisodeSelect]);

  // Reset dialogue playback when episode changes; keep the model viewer running
  // when the GLB is unchanged so ad textures persist across episodes in a season.
  useEffect(() => {
    if (!selectedEpisode) {
      return;
    }

    setCurrentDialogueIndex(0);
    setIsPlaying(false);
    setPlaybackPhase('intro');
    setCurrentDialogueText('');
    animationsStartedRef.current = false;

    if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current);
      playIntervalRef.current = null;
    }
  }, [selectedEpisode]);

  // Full viewer reset only when the underlying GLB changes.
  useEffect(() => {
    if (selectedEpisode) {
      const currentModel = getModelFromSeason(selectedEpisode);
      if (currentModel !== previousModel) {
        logger.log('Comic3DViewer: Model changed, resetting state');
        logger.log('Comic3DViewer: Previous model:', previousModel);
        logger.log('Comic3DViewer: Current model:', currentModel);
        setIsModelReady(false);
        setIsStarted(false);
        originalSlotTexturesRef.current = new Map();
        adSlotSurfacePrefixRef.current = new Map();
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
                <div className="episode-select-container">
                  {[...episodes].sort((a, b) => a.episode_number - b.episode_number).map(episode => {
                    const isActive = selectedEpisode?.id === episode.id;
                    return (
                      <button
                        key={episode.id}
                        className={`btn ${isActive ? 'btn-primary' : 'btn-outline-primary'} episode-select-btn`}
                        onClick={() => handleEpisodeSelect(episode)}
                      >
                        {isActive ? (
                          <>
                            E{episode.episode_number}: {episode.title}
                          </>
                        ) : (
                          <>E{episode.episode_number}</>
                        )}
                      </button>
                    );
                  })}
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
            <div className="card model-container position-relative">
              {/* Overlay with Start Button */}
              {!isStarted && (
                <div className="overlay-container position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ zIndex: 2, background: 'rgba(0,0,0,0.5)' }}>
                  <button
                    className="btn btn-primary btn-lg"
                    onClick={startEpisode}
                    style={{ 
                      background: 'rgba(255, 77, 77, 0.6)', 
                      border: 'none',
                      padding: '0.6rem 1rem',
                      fontSize: '1.2rem',
                      fontWeight: 'bold'
                    }}
                  >
                    <i className="fas fa-play"></i>
                    <span>Start</span>
                  </button>
                </div>
              )}

              {/* 3D Model Viewer */}
              {isStarted ? (
                getModelFromSeason(selectedEpisode) ? (
                <div style={{ width: '100%', height: '100%', position: 'relative', zIndex: 0, isolation: 'isolate' }}>
                  {/* Debug logging */}
                  {(() => {
                    logger.log('Comic3DViewer: Rendering model viewer, isEditMode:', isEditMode, 'isStarted:', isStarted);
                    return null;
                  })()}
                  
                  {/* Direct model-viewer element like Django template */}
                  <model-viewer
                    key={`model-viewer-${getModelFromSeason(selectedEpisode)}-${isStarted}`}
                    ref={modelViewerRef}
                    src={getModelFromSeason(selectedEpisode)}
                    alt="3D Scene"
                    shadow-intensity="1"
                    exposure="1"
                    interaction-prompt="none"
                    interpolation-decay="200"
                    interpolation="cubic-bezier(0.82,-0.03,0.11,1)"
                    min-camera-orbit="auto auto 0.1m"
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
                      opacity: 1,
                      position: 'relative',
                      zIndex: 0,
                      pointerEvents: 'auto',
                    }}
                  />
                  
                  {/* Speech bubble: flex-centered wrapper (no transform) so WebGL does not composite above the opaque HTML layer */}
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
                      {playbackPhase !== 'dialogue' ? (
                        <div>
                          {playbackPhase === 'intro' ? (
                            selectedEpisode.description ? (
                              <div dangerouslySetInnerHTML={{ __html: selectedEpisode.description }} />
                            ) : (
                              <p>No description available for this episode.</p>
                            )
                          ) : selectedEpisode.summary ? (
                            <div dangerouslySetInnerHTML={{ __html: selectedEpisode.summary }} />
                          ) : (
                            <p>No summary available for this episode.</p>
                          )}
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
                <div className="w-100">
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
                character: dialogue.character_name || dialogue.character?.toString() || 'Unknown',
                camera_orbit: dialogue.camera_orbit,
                camera_target: dialogue.camera_target,
                field_of_view: dialogue.field_of_view,
                zoom_speed: dialogue.zoom_speed,
                rotation: dialogue.rotation || '0deg 0deg 0deg',
                head_x: dialogue.pov_data?.head_x ?? 0,
                head_y: dialogue.pov_data?.head_y ?? 1.6,
                head_z: dialogue.pov_data?.head_z ?? 0,
                text: dialogue.text
              })}
            />
          ))}
        </div>
      )}

      {/* Progress Bar - Show after Start is clicked, even if waiting for dialogues */}
      {selectedEpisode && isStarted && (
        <div className="row mt-2">
          <div className="col-12">
            <div className="d-flex align-items-center gap-3">
              <div className="progress flex-grow-1" style={{ height: '8px' }}>
                <div 
                  className="progress-bar bg-success" 
                  style={{ 
                    width: `${
                      playbackPhase === 'outro'
                        ? 100
                        : playbackPhase === 'intro'
                          ? 0
                          : episodeDialogues.length > 0
                            ? ((currentDialogueIndex + 1) / episodeDialogues.length) * 100
                            : 0
                    }%`,
                    transition: 'width 0.3s ease'
                  }}
                />
              </div>
              <div className="text-end" style={{ fontSize: '0.8rem', minWidth: '40px' }}>
                <span>
                  {playbackPhase === 'outro'
                    ? (episodeDialogues.length > 0 ? `${episodeDialogues.length} / ${episodeDialogues.length}` : '0 / 0')
                    : playbackPhase === 'intro'
                      ? (episodeDialogues.length > 0 ? `0 / ${episodeDialogues.length}` : '0 / 0')
                      : (episodeDialogues.length > 0 ? `${currentDialogueIndex + 1} / ${episodeDialogues.length}` : '0 / 0')}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Controls - Show after Start Episode is clicked, even if waiting for dialogues */}
      {isStarted && selectedEpisode && (
        <div className="row mt-2">
          <div className="col-12">
            <div className="card bg-transparent border-0">
              <div className="card-body p-0">
                <div className="row justify-content-between align-items-center">
                  <div className="col-auto">
                    <button
                      className="btn btn-primary"
                      onClick={goToPreviousDialogue}
                      disabled={
                        episodeDialogues.length === 0 ||
                        playbackPhase === 'intro' ||
                        (playbackPhase === 'dialogue' && currentDialogueIndex === 0)
                      }
                      title={episodeDialogues.length > 0 ? `Previous dialogue (${currentDialogueIndex}/${episodeDialogues.length})` : 'Waiting for dialogues...'}
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
                      disabled={episodeDialogues.length === 0}
                      title={
                        playbackPhase === 'intro'
                          ? (episodeDialogues.length > 0 ? 'Go to first dialogue' : 'Waiting for dialogues...')
                          : playbackPhase === 'outro'
                            ? (episodeDialogues.length > 0 ? 'Replay from first dialogue' : 'Episode complete')
                            : (episodeDialogues.length > 0 ? `Next dialogue (${currentDialogueIndex + 1}/${episodeDialogues.length})` : 'Waiting for dialogues...')
                      }
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
                    <i className="fas fa-eye"></i>
                    <span>Preview Mode</span>
                  </button>
                  <button
                    type="button"
                    className={`btn ${isEditMode ? 'btn-outline-warning active' : 'btn-outline-warning'} mode-toggle-btn`}
                    onClick={() => {
                      logger.log('Edit Mode button clicked, current isEditMode:', isEditMode);
                      logger.log('Current isStarted:', isStarted);
                      logger.log('Current isModelReady:', isModelReady);
                      setIsEditMode(true);
                    }}
                    style={{
                      borderColor: '#f9a602',
                      color: isEditMode ? '#fff' : '#f9a602',
                      backgroundColor: isEditMode ? '#f9a602' : 'transparent'
                    }}
                  >
                    <i className="fas fa-edit"></i>
                    <span>Edit Mode</span>
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
        logger.log('Rendering edit controls, isEditMode:', isEditMode, 'selectedEpisode:', selectedEpisode, 'dialogueData length:', dialogueData.length);
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
                    <i className="fas fa-save"></i>
                    <span>{isSaving ? 'Saving...' : 'Save'}</span>
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
                    <i className="fas fa-undo"></i>
                    <span>Reset</span>
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
                        onChange={(e) => {
                          const azimuth = e.target.value;
                          const current = currentEditingDialogue || dialogueData[currentDialogueIndex];
                          
                          // Validate current dialogue data
                          if (!current || !current.dialogue_id || !current.camera_orbit) {
                            logger.error('Comic3DViewer: Invalid dialogue data for azimuth update:', current);
                            return;
                          }
                          
                          const newOrbit = readCameraOrbitFromDom();
                          if (!newOrbit) return;
                          
                          // Update dialogue text in real-time
                          updateDialogueTextWithCurrentValues();
                          
                          // Update dialogue data (only send the specific field being updated)
                          updateCameraDebounced(current.dialogue_id, { camera_orbit: newOrbit });
                          
                          // Update 3D model camera in real-time (Django pattern)
                          if (modelViewerRef.current && isModelReady) {
                            modelViewerRef.current.cameraOrbit = newOrbit;
                            jumpModelViewerCameraToGoal();
                            logger.camera('Comic3DViewer: Real-time camera orbit update:', newOrbit);
                          }
                          
                          // Update value badge
                          const valueBadge = document.getElementById('orbitAzimuthValue');
                          if (valueBadge) {
                            valueBadge.textContent = `${azimuth}°`;
                          }
                        }}
                      />
                      <span className="value-badge" id="orbitAzimuthValue">
                        0°
                      </span>
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
                        onChange={(e) => {
                          const polar = e.target.value;
                          const current = currentEditingDialogue || dialogueData[currentDialogueIndex];
                          if (!current) return;
                          const newOrbit = readCameraOrbitFromDom();
                          if (!newOrbit) return;
                          
                          // Update dialogue text in real-time
                          updateDialogueTextWithCurrentValues();
                          
                          // Update dialogue data
                          updateCameraDebounced(current.dialogue_id, { camera_orbit: newOrbit });
                          
                          // Update 3D model camera in real-time (Django pattern)
                          if (modelViewerRef.current && isModelReady) {
                            modelViewerRef.current.cameraOrbit = newOrbit;
                            jumpModelViewerCameraToGoal();
                            logger.camera('Comic3DViewer: Real-time camera orbit update:', newOrbit);
                          }
                          
                          // Update value badge
                          const valueBadge = document.getElementById('orbitPolarValue');
                          if (valueBadge) {
                            valueBadge.textContent = `${polar}°`;
                          }
                        }}
                      />
                      <span className="value-badge" id="orbitPolarValue">
                        75°
                      </span>
                    </div>
                  </div>
                  
                  <div className="form-group mb-3">
                    <label htmlFor="orbitRadius" className="form-label">
                      <span className="material-symbols-outlined" style={{ fontSize: '1.5rem', fontVariationSettings: "'FILL' 0, 'GRAD' 0", verticalAlign: 'middle', marginRight: '0.5rem' }}>clock_loader_90</span>
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
                        onChange={(e) => {
                          const radius = e.target.value;
                          const current = currentEditingDialogue || dialogueData[currentDialogueIndex];
                          if (!current) return;
                          const newOrbit = readCameraOrbitFromDom();
                          if (!newOrbit) return;
                          
                          // Update dialogue text in real-time
                          updateDialogueTextWithCurrentValues();
                          
                          // Update dialogue data
                          updateCameraDebounced(current.dialogue_id, { camera_orbit: newOrbit });
                          
                          // Update 3D model camera in real-time (Django pattern)
                          if (modelViewerRef.current && isModelReady) {
                            modelViewerRef.current.cameraOrbit = newOrbit;
                            jumpModelViewerCameraToGoal();
                            logger.camera('Comic3DViewer: Real-time camera orbit update:', newOrbit);
                          }
                          
                          // Update value badge
                          const valueBadge = document.getElementById('orbitRadiusValue');
                          if (valueBadge) {
                            valueBadge.textContent = `${radius}m`;
                          }
                        }}
                      />
                      <span className="value-badge" id="orbitRadiusValue">
                        3m
                      </span>
                    </div>
                  </div>
                  
                  {/* Field of View (Left Column) - Hidden for now */}
                  {/* <div className="form-group mb-3" style={{ display: 'none' }}>
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
                            logger.camera('Comic3DViewer: Real-time field of view update:', fov);
                          }
                          
                          // Update value badge
                          const valueBadge = document.getElementById('fieldOfViewValue');
                          if (valueBadge) {
                            valueBadge.textContent = `${fov}°`;
                          }
                        }}
                      />
                      <span className="value-badge" id="fieldOfViewValue">
                        45°
                      </span>
                    </div>
                  </div> */}
                </div>
                
                {/* Camera Target (Right Column) */}
                <div className="col mt-0 p-1 p-md-4">
                  <div className="section-header">
                    Camera Target
                  </div>
                  
                  <div className="form-group mb-3">
                  <span className="material-symbols-outlined" style={{ fontSize: '2rem', fontVariationSettings: "'FILL' 1" }}>arrow_range</span>
                  <span> X</span>
                    <div className="slider-row">
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
                          const newTarget = readCameraTargetFromDom();
                          if (!newTarget) return;
                          const orbitToKeep = getOrbitToKeep();
                          applyCameraTargetKeepingOrbit(newTarget, orbitToKeep);
                          
                          // Update dialogue text in real-time
                          updateDialogueTextWithCurrentValues();
                          
                          // Update dialogue data
                          updateCameraDebounced(current.dialogue_id, { camera_target: newTarget, camera_orbit: orbitToKeep });
                          logger.camera('Comic3DViewer: Real-time camera target update:', newTarget);
                          
                          // Update value badge
                          const valueBadge = document.getElementById('targetXValue');
                          if (valueBadge) {
                            valueBadge.textContent = `${x}m`;
                          }
                        }}
                      />
                      <span className="value-badge" id="targetXValue">
                        0m
                      </span>
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
                        onChange={(e) => {
                          const y = e.target.value;
                          const current = currentEditingDialogue || dialogueData[currentDialogueIndex];
                          if (!current) return;
                          const newTarget = readCameraTargetFromDom();
                          if (!newTarget) return;
                          const orbitToKeep = getOrbitToKeep();
                          applyCameraTargetKeepingOrbit(newTarget, orbitToKeep);
                          
                          // Update dialogue text in real-time
                          updateDialogueTextWithCurrentValues();
                          
                          // Update dialogue data
                          updateCameraDebounced(current.dialogue_id, { camera_target: newTarget, camera_orbit: orbitToKeep });
                          logger.camera('Comic3DViewer: Real-time camera target update:', newTarget);
                          
                          // Update value badge
                          const valueBadge = document.getElementById('targetYValue');
                          if (valueBadge) {
                            valueBadge.textContent = `${y}m`;
                          }
                        }}
                      />
                      <span className="value-badge" id="targetYValue">
                        1.6m
                      </span>
                    </div>
                  </div>
                  
                  <div className="form-group mb-3">
                    <label htmlFor="targetZ" className="form-label d-flex align-items-center gap-2">
                      <span className="material-symbols-outlined" style={{ fontSize: '2rem', fontVariationSettings: "'FILL' 1" }}>arrow_range</span>
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
                        onChange={(e) => {
                          const z = e.target.value;
                          const current = currentEditingDialogue || dialogueData[currentDialogueIndex];
                          if (!current) return;
                          const newTarget = readCameraTargetFromDom();
                          if (!newTarget) return;
                          const orbitToKeep = getOrbitToKeep();
                          applyCameraTargetKeepingOrbit(newTarget, orbitToKeep);
                          
                          // Update dialogue text in real-time
                          updateDialogueTextWithCurrentValues();
                          
                          // Update dialogue data
                          updateCameraDebounced(current.dialogue_id, { camera_target: newTarget, camera_orbit: orbitToKeep });
                          logger.camera('Comic3DViewer: Real-time camera target update:', newTarget);
                          
                          // Update value badge
                          const valueBadge = document.getElementById('targetZValue');
                          if (valueBadge) {
                            valueBadge.textContent = `${z}m`;
                          }
                        }}
                      />
                      <span className="value-badge" id="targetZValue">
                        0m
                      </span>
                    </div>
                  </div>
                  
                  {/* Zoom Speed (Right Column) - Hidden for now */}
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
                          logger.log('Comic3DViewer: Zoom speed updated:', speed);
                          
                          // Update value badge
                          const valueBadge = document.getElementById('zoomSpeedValue');
                          if (valueBadge) {
                            valueBadge.textContent = `${speed}x`;
                          }
                        }}
                      />
                      <span className="value-badge" id="zoomSpeedValue">
                        1.0x
                      </span>
                    </div>
                  </div> */}
                </div>
                
                {/* Current Values (Full Width) */}
                <div className="col-md-6 mt-2" style={{ gridColumn: '1 / -1' }}>
                  <div className="current-values-box">
                    <h6 className="text-primary mb-2">Values (Last Saved)</h6>
                    <div><strong>Camera Orbit:</strong> <span id="currentOrbit">{originalValues?.camera_orbit || '0deg 75deg 3m'}</span></div>
                    <div><strong>Camera Target:</strong> <span id="currentTarget">{originalValues?.camera_target || '0m 1.6m 0m'}</span></div>
                    {/* Field of View and Zoom Speed hidden for now */}
                    {/* <div><strong>Field of View:</strong> <span id="currentFOV">{originalValues?.field_of_view || 45}°</span></div>
                    <div><strong>Zoom Speed:</strong> <span id="currentZoom">{originalValues?.zoom_speed || 1.0}</span></div> */}
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
                
                {/* Animation Controls — hidden for now; model auto-plays GLB clips on load.
                    Revisit later when clips are wired per dialogue/character. */}
                {false && (
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
                      logger.log('Comic3DViewer Edit Mode: Animation changed to:', animationName);
                    }}
                  />
                </div>
                )}
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
