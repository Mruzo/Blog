# Comic3DViewer Implementation Guide

## Overview
The Comic3DViewer is a React component that provides a 3D comic viewing experience similar to the one found in `/home/chris/applications/Blog/tilf/templates/tilf/episode_preview.html`. It integrates with the existing stories app to display episodes with 3D models, dialogue systems, and interactive camera controls.

## Features

### Core Functionality
- **3D Model Display**: Renders 3D models using the `<model-viewer>` web component
- **Dialogue System**: Displays character dialogues with speech bubbles
- **Camera Controls**: Interactive camera positioning and movement
- **Episode Navigation**: Previous/Next dialogue navigation
- **Auto-playback**: Automatic dialogue progression with speed controls
- **Edit Mode**: Real-time camera adjustment with sliders
- **Progress Tracking**: Visual progress indicators

### Key Components

#### 1. Comic3DViewer Component
**Location**: `/home/chris/applications/vybz/vybzapp/frontend/src/components/Comic3DViewer.tsx`

**Props**:
- `episodes: Episode[]` - Array of episodes to display
- `dialogues: Dialogue[]` - Array of dialogues for the episodes
- `storyId: number` - ID of the current story
- `seasonId?: number` - Optional season ID
- `onEpisodeSelect?: (episode: Episode) => void` - Callback for episode selection
- `onDialogueUpdate?: (dialogueId: number, data: Partial<Dialogue>) => void` - Callback for dialogue updates

#### 2. CSS Styles
**Location**: `/home/chris/applications/vybz/vybzapp/frontend/src/components/Comic3DViewer.css`

**Key Styles**:
- Modern card-based layout
- Responsive design for mobile/tablet/desktop
- Custom slider styles for camera controls
- Speech bubble styling
- Button hover effects and transitions

#### 3. Integration with StoryManage
**Location**: `/home/chris/applications/vybz/vybzapp/frontend/src/pages/StoryManage.tsx`

The Comic3DViewer is integrated into the StoryManage page below the seasons section, providing a complete 3D comic viewing experience.

## Technical Implementation

### 3D Model Integration
The component uses the `<model-viewer>` web component from Google's Model Viewer library:

```typescript
// Model viewer setup
useEffect(() => {
  const script = document.createElement('script');
  script.type = 'module';
  script.src = 'https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js';
  document.head.appendChild(script);

  return () => {
    document.head.removeChild(script);
  };
}, []);
```

### Dialogue System
Dialogues are converted to a format compatible with the 3D viewer:

```typescript
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
```

### Camera Controls
The component provides real-time camera adjustment in edit mode:

```typescript
const updateCamera = (dialogueId: number, data: Partial<Dialogue>) => {
  onDialogueUpdate?.(dialogueId, data);
  
  if (modelViewerRef.current) {
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
};
```

### Auto-playback System
The component includes an auto-playback system with speed controls:

```typescript
const startEpisode = () => {
  if (episodeDialogues.length === 0) return;
  
  setCurrentDialogueIndex(0);
  showDialogue(0);
  setIsPlaying(true);
  
  playIntervalRef.current = setInterval(() => {
    setCurrentDialogueIndex(prev => {
      if (prev < episodeDialogues.length - 1) {
        const newIndex = prev + 1;
        showDialogue(newIndex);
        return newIndex;
      } else {
        setIsPlaying(false);
        setIsShowingSummary(true);
        if (playIntervalRef.current) {
          clearInterval(playIntervalRef.current);
          playIntervalRef.current = null;
        }
        return prev;
      }
    });
  }, playSpeed);
};
```

## Data Flow

### 1. Story Management Integration
The Comic3DViewer is integrated into the StoryManage component:

```typescript
// In StoryManage.tsx
<Comic3DViewer
  episodes={allEpisodes}
  dialogues={allDialogues}
  storyId={Number(id)}
  onEpisodeSelect={(episode) => {
    console.log('Episode selected:', episode);
  }}
  onDialogueUpdate={(dialogueId, data) => {
    updateDialogue(dialogueId, data);
  }}
/>
```

### 2. Data Loading
Episodes and dialogues are loaded for the entire story:

```typescript
const loadAllEpisodesAndDialogues = useCallback(async (storyId: number) => {
  try {
    // Load episodes for each season
    for (const season of seasons) {
      await loadEpisodes(season.id);
    }
    
    // Collect all episodes from the context
    setAllEpisodes(episodes);
    
    // Load dialogues for each episode
    for (const episode of episodes) {
      await loadDialogues(episode.id);
    }
    
    // Collect all dialogues from the context
    setAllDialogues(dialogues);
    
  } catch (error) {
    console.error('Error loading episodes and dialogues:', error);
  }
}, [seasons, episodes, dialogues, loadEpisodes, loadDialogues]);
```

## API Integration

### Required API Methods
The component requires the following API methods from the ApiContext:

- `loadEpisodes(seasonId: number)` - Load episodes for a season
- `loadDialogues(episodeId: number)` - Load dialogues for an episode
- `updateDialogue(id: number, data: Partial<Dialogue>)` - Update dialogue data

### Data Models
The component works with the following data models:

```typescript
// Episode interface
export interface Episode {
  id: number;
  title: string;
  episode_number: number;
  description: string;
  summary: string;
  is_published: boolean;
  season: number;
  model_gltf?: string;  // 3D model URL
  created_at: string;
  updated_at: string;
}

// Dialogue interface
export interface Dialogue {
  id: number;
  character: number; // Character ID
  text: string;
  camera_orbit: string; // Format: "0deg 75deg 3m"
  camera_target: string; // Format: "0m 1.6m 0m"
  field_of_view: number;
  zoom_speed: number;
  episode: number;
  order: number;
  created_at: string;
  updated_at: string;
}
```

## Testing

### Unit Tests
**Location**: `/home/chris/applications/vybz/vybzapp/frontend/src/components/__tests__/Comic3DViewer.test.tsx`

The component includes comprehensive unit tests covering:
- Basic rendering
- Episode selection
- Dialogue navigation
- Playback controls
- Edit mode functionality
- Error handling

### Integration Tests
**Location**: `/home/chris/applications/vybz/vybzapp/frontend/src/pages/__tests__/StoryManage.3DViewer.test.tsx`

Integration tests verify the component works correctly with the StoryManage page.

### Manual Testing
**Location**: `/home/chris/applications/vybz/vybzapp/frontend/src/components/__tests__/Comic3DViewer.manual.test.md`

Comprehensive manual testing guide covering:
- Basic functionality
- 3D model loading
- Dialogue navigation
- Edit mode
- Responsive design
- Error scenarios

## Usage Examples

### Basic Usage
```typescript
import Comic3DViewer from '../components/Comic3DViewer';

<Comic3DViewer
  episodes={episodes}
  dialogues={dialogues}
  storyId={storyId}
  onEpisodeSelect={(episode) => console.log('Selected:', episode)}
  onDialogueUpdate={(id, data) => updateDialogue(id, data)}
/>
```

### With Custom Styling
```typescript
<div className="custom-3d-viewer">
  <Comic3DViewer
    episodes={episodes}
    dialogues={dialogues}
    storyId={storyId}
  />
</div>
```

## Browser Compatibility

### Supported Browsers
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

### Requirements
- WebGL support
- ES6+ support
- Modern JavaScript features

### Mobile Support
- Responsive design
- Touch-friendly controls
- Optimized for mobile viewing

## Performance Considerations

### Optimization Strategies
1. **Lazy Loading**: 3D models are loaded only when needed
2. **Memory Management**: Proper cleanup of intervals and event listeners
3. **Efficient Rendering**: Minimal re-renders with proper state management
4. **Asset Optimization**: Compressed 3D models and optimized textures

### Best Practices
1. Use compressed GLTF/GLB files
2. Implement proper error boundaries
3. Monitor memory usage with large models
4. Provide fallbacks for unsupported browsers

## Troubleshooting

### Common Issues

#### 3D Model Not Loading
- Check model URL accessibility
- Verify CORS settings
- Ensure model file format (GLTF/GLB)
- Check browser console for errors

#### Camera Not Updating
- Verify dialogue data format
- Check camera_orbit and camera_target values
- Ensure model-viewer element reference
- Verify model is fully loaded

#### Edit Mode Not Working
- Check edit mode state
- Verify dialogue data structure
- Ensure onDialogueUpdate callback
- Check slider event handlers

#### Performance Issues
- Reduce model complexity
- Optimize dialogue data
- Check for memory leaks
- Use smaller model files

## Future Enhancements

### Planned Features
1. **Hotspot System**: Interactive character hotspots
2. **Animation Support**: Character animations
3. **Audio Integration**: Voice acting and sound effects
4. **VR Support**: Virtual reality viewing
5. **Collaborative Editing**: Real-time collaborative editing

### Technical Improvements
1. **WebGL Optimization**: Better rendering performance
2. **Progressive Loading**: Incremental model loading
3. **Caching System**: Intelligent asset caching
4. **Offline Support**: Offline viewing capabilities

## Conclusion

The Comic3DViewer provides a powerful and flexible 3D comic viewing experience that integrates seamlessly with the existing stories app. It offers a modern, interactive way to experience 3D comics with full editing capabilities and responsive design.

The implementation follows React best practices, includes comprehensive testing, and provides a solid foundation for future enhancements. The component is designed to be maintainable, extensible, and performant across different devices and browsers.


