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

  // Initialize animations when model is ready
  useEffect(() => {
    const modelViewer = modelViewerRef.current;
    if (!modelViewer) return;

    const handleModelLoad = () => {
      console.log('AnimationController: Model loaded, initializing animations...');
      
      // Wait a bit for the model to fully load
      setTimeout(() => {
        try {
          const animations = modelViewer.availableAnimations || [];
          console.log('AnimationController: Available animations:', animations);
          
          setAvailableAnimations(animations);
          setIsModelReady(true);
          
          // Auto-play first animation if available and autoPlay is enabled
          if (animations.length > 0 && autoPlay) {
            const firstAnimation = animations[0];
            console.log('AnimationController: Auto-playing first animation:', firstAnimation);
            
            modelViewer.play({ animationName: firstAnimation });
            setCurrentAnimation(firstAnimation);
            setIsPlaying(true);
            
            if (onAnimationChange) {
              onAnimationChange(firstAnimation);
            }
          }
        } catch (error) {
          console.error('AnimationController: Error initializing animations:', error);
        }
      }, 500); // Small delay to ensure model is fully loaded
    };

    // Listen for model load event
    modelViewer.addEventListener('load', handleModelLoad);
    
    // Also check if model is already loaded
    if (modelViewer.loaded) {
      handleModelLoad();
    }

    return () => {
      modelViewer.removeEventListener('load', handleModelLoad);
    };
  }, [modelViewerRef, autoPlay, onAnimationChange]);

  // Handle animation selection
  const handleAnimationSelect = (animationName: string) => {
    const modelViewer = modelViewerRef.current;
    if (!modelViewer || !animationName) return;

    console.log('AnimationController: Playing animation:', animationName);
    
    modelViewer.play({ animationName });
    setCurrentAnimation(animationName);
    setIsPlaying(true);
    
    if (onAnimationChange) {
      onAnimationChange(animationName);
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
