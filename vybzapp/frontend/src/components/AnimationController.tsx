import React, { useEffect, useRef, useState } from 'react';

interface AnimationControllerProps {
  modelViewerRef: React.RefObject<any>;
  autoPlay?: boolean;
  showControls?: boolean;
  onAnimationChange?: (animationName: string) => void;
  className?: string;
}

const AnimationController: React.FC<AnimationControllerProps> = ({
  modelViewerRef,
  autoPlay = true,
  showControls = true,
  onAnimationChange,
  className = ''
}) => {
  const [availableAnimations, setAvailableAnimations] = useState<string[]>([]);
  const [currentAnimation, setCurrentAnimation] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [isModelReady, setIsModelReady] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState<number>(0.5);

  // Initialize animations when model is ready - re-query at multiple delays to catch all GLB animations
  useEffect(() => {
    const modelViewer = modelViewerRef.current;
    if (!modelViewer) return;

    const collectAnimations = (): string[] => {
      try {
        const list = modelViewer.availableAnimations || [];
        return Array.isArray(list) ? [...list] : [];
      } catch {
        return [];
      }
    };

    const handleModelLoad = () => {
      console.log('AnimationController: Model loaded, initializing animations...');
      const delays = [0, 150, 400, 800];
      let best: string[] = [];

      delays.forEach((delay) => {
        setTimeout(() => {
          const animations = collectAnimations();
          if (animations.length > best.length) {
            best = animations;
            console.log('AnimationController: Available animations:', best);
            setAvailableAnimations(best);
          }
          setIsModelReady(true);
        }, delay);
      });

      setTimeout(() => {
        const final = collectAnimations();
        if (final.length > best.length) {
          best = final;
          setAvailableAnimations(best);
        }
        if (best.length > 0 && autoPlay) {
          const firstAnimation = best[0];
          try {
            if (typeof modelViewer.playAnimation === 'function') {
              modelViewer.playAnimation(firstAnimation, true);
            } else {
              modelViewer.animationName = firstAnimation;
              modelViewer.play();
            }
            setCurrentAnimation(firstAnimation);
            setIsPlaying(true);
            onAnimationChange?.(firstAnimation);
          } catch (e) {
            console.warn('AnimationController: Auto-play failed', e);
          }
        }
      }, 900);
    };

    modelViewer.addEventListener('load', handleModelLoad);
    if (modelViewer.loaded) {
      handleModelLoad();
    }

    return () => {
      modelViewer.removeEventListener('load', handleModelLoad);
    };
  }, [modelViewerRef, autoPlay, onAnimationChange]);

  // Apply animation speed (timeScale) when model is ready or speed changes
  useEffect(() => {
    const modelViewer = modelViewerRef.current;
    if (!modelViewer || typeof modelViewer.timeScale === 'undefined') return;
    modelViewer.timeScale = animationSpeed;
  }, [modelViewerRef, animationSpeed, isModelReady]);

  // Handle animation selection - use animationName + play() for compatibility with all GLB clips
  const handleAnimationSelect = (animationName: string) => {
    const modelViewer = modelViewerRef.current;
    if (!modelViewer || !animationName) return;

    console.log('AnimationController: Playing animation:', animationName);
    try {
      if (typeof modelViewer.playAnimation === 'function') {
        modelViewer.playAnimation(animationName, true);
      } else {
        modelViewer.animationName = animationName;
        modelViewer.play();
      }
      setCurrentAnimation(animationName);
      setIsPlaying(true);
      onAnimationChange?.(animationName);
    } catch (e) {
      console.warn('AnimationController: play failed', e);
    }
  };

  // Handle play/pause toggle
  const handlePlayPause = () => {
    const modelViewer = modelViewerRef.current;
    if (!modelViewer) return;

    if (isPlaying) {
      modelViewer.pause();
      setIsPlaying(false);
      console.log('AnimationController: Animation paused');
    } else {
      modelViewer.play();
      setIsPlaying(true);
      console.log('AnimationController: Animation resumed');
    }
  };

  // Handle loop toggle
  const handleLoopToggle = () => {
    const modelViewer = modelViewerRef.current;
    if (!modelViewer) return;

    const newLoopState = !isLooping;
    modelViewer.loop = newLoopState;
    setIsLooping(newLoopState);
    console.log('AnimationController: Loop toggled:', newLoopState);
  };

  // Always render the controls section, even if no animations are available
  // This provides better UX by showing the feature exists
  return (
    <div className={`animation-controller ${className}`} style={{
      background: 'transparent',
      padding: '0',
      borderRadius: '0',
      zIndex: 'auto',
      color: 'inherit',
      fontSize: 'inherit',
      minWidth: 'auto',
      width: '100%'
    }}>
      <div className="row g-2">
        {/* Animation Selector */}
        <div className="col-12">
          <label className="form-label" style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.5rem' }}>
            Animation
          </label>
          <select
            value={currentAnimation}
            onChange={(e) => handleAnimationSelect(e.target.value)}
            className="form-select form-select-sm"
            style={{ fontSize: '0.9rem' }}
            disabled={!isModelReady || availableAnimations.length === 0}
          >
            <option value="">
              {!isModelReady ? 'Loading...' : 
               availableAnimations.length === 0 ? 'No animations available' : 
               'Select Animation'}
            </option>
            {availableAnimations.map((animation) => (
              <option key={animation} value={animation}>
                {animation}
              </option>
            ))}
          </select>
        </div>

        {/* Animation Speed - match Blender timing (slower = smoother / less "way too fast") */}
        <div className="col-12">
          <label className="form-label" style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.5rem' }}>
            Speed
          </label>
          <select
            value={animationSpeed}
            onChange={(e) => setAnimationSpeed(Number(e.target.value))}
            className="form-select form-select-sm"
            style={{ fontSize: '0.9rem' }}
            disabled={!isModelReady}
          >
            <option value={0.25}>0.25× (slowest)</option>
            <option value={0.5}>0.5× (smoother)</option>
            <option value={1}>1× (normal)</option>
            <option value={1.5}>1.5×</option>
          </select>
          <small className="text-muted" style={{ fontSize: '0.75rem' }}>Lower speed often matches Blender playback better.</small>
        </div>
        
        {/* Control Buttons */}
        <div className="col-6">
          <button
            onClick={handlePlayPause}
            className={`btn btn-sm w-100 ${isPlaying ? 'btn-warning' : 'btn-success'}`}
            style={{ fontSize: '0.9rem' }}
            disabled={!isModelReady || availableAnimations.length === 0 || !currentAnimation}
          >
            <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'} me-1`}></i>
            {isPlaying ? 'Pause' : 'Play'}
          </button>
        </div>
        
        <div className="col-6">
          <button
            onClick={handleLoopToggle}
            className={`btn btn-sm w-100 ${isLooping ? 'btn-primary' : 'btn-outline-secondary'}`}
            style={{ fontSize: '0.9rem' }}
            disabled={!isModelReady || availableAnimations.length === 0 || !currentAnimation}
          >
            <i className="fas fa-redo me-1"></i>
            {isLooping ? 'Loop On' : 'Loop Off'}
          </button>
        </div>
        
        {/* Animation Info */}
        {currentAnimation && (
          <div className="col-12">
            <div className="small text-muted" style={{ fontSize: '0.8rem' }}>
              <div><strong>Current:</strong> {currentAnimation}</div>
              <div><strong>Status:</strong> {isPlaying ? 'Playing' : 'Paused'}</div>
            </div>
          </div>
        )}
        
        {/* No Animations Message */}
        {isModelReady && availableAnimations.length === 0 && (
          <div className="col-12">
            <div className="small text-muted" style={{ fontSize: '0.8rem' }}>
              <i className="fas fa-info-circle me-1"></i>
              This 3D model doesn't contain any animations.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnimationController;
