declare namespace JSX {
  interface IntrinsicElements {
    'model-viewer': {
      ref?: React.Ref<any>;
      src?: string;
      alt?: string;
      style?: React.CSSProperties;
      'shadow-intensity'?: string;
      exposure?: string;
      'interaction-prompt'?: string;
      'interpolation-decay'?: string;
      interpolation?: string;
      'min-camera-orbit'?: string;
      'max-camera-orbit'?: string;
      'min-field-of-view'?: string;
      'max-field-of-view'?: string;
      'animation-name'?: string;
      'animation-crossfade-duration'?: string;
      'auto-rotate-delay'?: string;
      'camera-orbit'?: string;
      'camera-target'?: string;
      'field-of-view'?: string;
      'camera-controls'?: boolean;
      children?: React.ReactNode;
      onLoad?: () => void;
      onCameraChange?: () => void;
    };
  }
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': {
        ref?: React.Ref<any>;
        src?: string;
        alt?: string;
        style?: React.CSSProperties;
        'shadow-intensity'?: string;
        exposure?: string;
        'interaction-prompt'?: string;
        'interpolation-decay'?: string;
        interpolation?: string;
        'min-camera-orbit'?: string;
        'max-camera-orbit'?: string;
        'min-field-of-view'?: string;
        'max-field-of-view'?: string;
        'animation-name'?: string;
        'animation-crossfade-duration'?: string;
        'auto-rotate-delay'?: string;
        'camera-orbit'?: string;
        'camera-target'?: string;
        'field-of-view'?: string;
        'camera-controls'?: boolean;
        children?: React.ReactNode;
        onLoad?: () => void;
        onCameraChange?: () => void;
      };
    }
  }
}










