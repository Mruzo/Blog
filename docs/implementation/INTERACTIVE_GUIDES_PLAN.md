# Interactive Guides Implementation Plan

## Overview
Implement step-by-step interactive walkthroughs that guide users through key features and pages. These guides can work **standalone** (no backend required) but can integrate with the documentation system later.

## Can We Skip Phase 1 & 2?

**Answer: YES, but...**

### ✅ Standalone Approach (No Backend Needed)
- Guides defined in frontend code/config
- Progress tracked in localStorage
- Triggered by route/page detection
- Uses library like `react-joyride` or `react-shepherd`
- **Faster to implement** (~4-6 hours)
- **Easier to iterate** (change guides without backend)

### ⚠️ With Phase 1 & 2 (Enhanced)
- Guides stored in backend (manageable via admin)
- Links to documentation content
- Analytics tracking
- A/B testing different guide flows
- **More flexible** but **slower** (~18-26 hours total)

## Recommendation: Start Standalone, Enhance Later

**Phase A**: Standalone interactive guides (now)
**Phase B**: Integrate with documentation system (later)

---

## Phase A: Standalone Interactive Guides

### Architecture

```
Frontend Only:
├── Guide Configuration (JSON/TypeScript)
├── Guide Component (react-joyride)
├── Guide Context (React Context)
├── Progress Tracking (localStorage)
└── Trigger Logic (route-based)
```

### Technology Choice

**Option 1: react-joyride** ⭐ Recommended
- ✅ Most popular (8k+ stars)
- ✅ Well-maintained
- ✅ Highly customizable
- ✅ Mobile-friendly
- ✅ Accessible (ARIA support)
- ✅ TypeScript support

**Option 2: react-shepherd**
- ✅ Modern, clean API
- ✅ Good TypeScript support
- ⚠️ Less popular (smaller community)

**Option 3: Custom Implementation**
- ✅ Full control
- ❌ More development time
- ❌ Need to handle edge cases

### Implementation Steps

#### Step 1: Install Dependencies
```bash
cd vybzapp/frontend
npm install react-joyride
npm install --save-dev @types/react-joyride  # If needed
```

#### Step 2: Create Guide Configuration (`frontend/src/config/guides.ts`)
```typescript
import { Step } from 'react-joyride';

export interface GuideConfig {
  id: string;
  name: string;
  route: string; // Route that triggers this guide
  steps: Step[];
  showOnFirstVisit?: boolean; // Auto-show on first visit?
  showOnce?: boolean; // Only show once per user?
}

export const guides: GuideConfig[] = [
  {
    id: 'stories-page',
    name: 'Stories Page Tour',
    route: '/immersivecomics/',
    showOnFirstVisit: true,
    showOnce: true,
    steps: [
      {
        target: '.stories-list',
        content: 'Browse all available stories here. Use filters to find what you like!',
        placement: 'bottom',
      },
      {
        target: '.create-story-btn',
        content: 'Click here to create your first story!',
        placement: 'left',
      },
      {
        target: '.floating-action-menu',
        content: 'Use these buttons for quick actions like feedback or documentation.',
        placement: 'left',
      },
    ],
  },
  {
    id: 'story-creation',
    name: 'Story Creation Guide',
    route: '/immersivecomics/story/create/',
    showOnFirstVisit: true,
    showOnce: true,
    steps: [
      {
        target: '[data-step="story"]',
        content: 'Start by giving your story a title and description.',
        placement: 'bottom',
      },
      {
        target: '[data-step="characters"]',
        content: 'Add characters that will appear in your story.',
        placement: 'bottom',
      },
      {
        target: '[data-step="season"]',
        content: 'Create seasons to organize your episodes.',
        placement: 'bottom',
      },
      {
        target: '[data-step="episode"]',
        content: 'Add episodes - each episode is a scene in your story.',
        placement: 'bottom',
      },
      {
        target: '[data-step="dialogues"]',
        content: 'Write dialogues that will appear in speech bubbles.',
        placement: 'bottom',
      },
      {
        target: '[data-step="model"]',
        content: 'Upload a 3D model (GLB/GLTF) for your scene.',
        placement: 'bottom',
      },
    ],
  },
  {
    id: 'episode-management',
    name: 'Episode Management Guide',
    route: '/immersivecomics/season/',
    showOnFirstVisit: false, // Manual trigger only
    steps: [
      {
        target: '.episode-list',
        content: 'Manage all episodes in this season here.',
        placement: 'bottom',
      },
      {
        target: '.add-episode-btn',
        content: 'Click to add a new episode.',
        placement: 'left',
      },
      {
        target: '.dialogue-editor',
        content: 'Add dialogues and position the camera for each one.',
        placement: 'top',
      },
    ],
  },
  {
    id: '3d-viewer',
    name: '3D Viewer Guide',
    route: '/immersivecomics/story/', // Any story detail page
    showOnFirstVisit: false,
    steps: [
      {
        target: '.comic-3d-viewer',
        content: 'This is your 3D scene. Click and drag to rotate the camera.',
        placement: 'top',
      },
      {
        target: '.dialogue-bubble',
        content: 'Dialogues appear in speech bubbles. Click Next to advance.',
        placement: 'bottom',
      },
      {
        target: '.camera-controls',
        content: 'Adjust camera position and target for each dialogue.',
        placement: 'left',
      },
    ],
  },
];
```

#### Step 3: Create Guide Context (`frontend/src/contexts/GuideContext.tsx`)
```typescript
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { guides, GuideConfig } from '../config/guides';

interface GuideContextType {
  currentGuide: GuideConfig | null;
  isRunning: boolean;
  startGuide: (guideId: string) => void;
  stopGuide: () => void;
  hasSeenGuide: (guideId: string) => boolean;
  markGuideAsSeen: (guideId: string) => void;
}

const GuideContext = createContext<GuideContextType | null>(null);

export const GuideProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const location = useLocation();
  const [currentGuide, setCurrentGuide] = useState<GuideConfig | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  // Check if user has seen a guide
  const hasSeenGuide = (guideId: string): boolean => {
    const seen = localStorage.getItem(`guide_seen_${guideId}`);
    return seen === 'true';
  };

  // Mark guide as seen
  const markGuideAsSeen = (guideId: string): void => {
    localStorage.setItem(`guide_seen_${guideId}`, 'true');
  };

  // Start a guide
  const startGuide = (guideId: string): void => {
    const guide = guides.find(g => g.id === guideId);
    if (guide) {
      setCurrentGuide(guide);
      setIsRunning(true);
    }
  };

  // Stop current guide
  const stopGuide = (): void => {
    setIsRunning(false);
    if (currentGuide?.showOnce) {
      markGuideAsSeen(currentGuide.id);
    }
    setCurrentGuide(null);
  };

  // Auto-trigger guides on route change
  useEffect(() => {
    const matchingGuide = guides.find(guide => {
      // Check if current route matches guide route
      if (location.pathname === guide.route || location.pathname.startsWith(guide.route)) {
        // Check if should auto-show
        if (guide.showOnFirstVisit && !hasSeenGuide(guide.id)) {
          return true;
        }
      }
      return false;
    });

    if (matchingGuide) {
      // Small delay to ensure page is rendered
      setTimeout(() => {
        startGuide(matchingGuide.id);
      }, 500);
    }
  }, [location.pathname]);

  return (
    <GuideContext.Provider value={{
      currentGuide,
      isRunning,
      startGuide,
      stopGuide,
      hasSeenGuide,
      markGuideAsSeen,
    }}>
      {children}
    </GuideContext.Provider>
  );
};

export const useGuide = () => {
  const context = useContext(GuideContext);
  if (!context) {
    throw new Error('useGuide must be used within GuideProvider');
  }
  return context;
};
```

#### Step 4: Create Guide Component (`frontend/src/components/InteractiveGuide.tsx`)
```typescript
import React from 'react';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';
import { useGuide } from '../contexts/GuideContext';

const InteractiveGuide: React.FC = () => {
  const { currentGuide, isRunning, stopGuide, markGuideAsSeen } = useGuide();

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, type } = data;

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      stopGuide();
    }

    // Track analytics (optional)
    if (process.env.NODE_ENV === 'development') {
      console.log('Guide callback:', { status, type, step: data.step });
    }
  };

  if (!currentGuide || !isRunning) {
    return null;
  }

  return (
    <Joyride
      steps={currentGuide.steps}
      run={isRunning}
      continuous={true}
      showProgress={true}
      showSkipButton={true}
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: '#111e7f', // Match your brand color
          textColor: '#333',
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: '8px',
          padding: '20px',
        },
        buttonNext: {
          backgroundColor: '#111e7f',
          fontSize: '14px',
          padding: '10px 20px',
        },
        buttonBack: {
          color: '#111e7f',
          marginRight: '10px',
        },
        buttonSkip: {
          color: '#666',
        },
      }}
      locale={{
        back: 'Back',
        close: 'Close',
        last: 'Finish',
        next: 'Next',
        skip: 'Skip',
      }}
    />
  );
};

export default InteractiveGuide;
```

#### Step 5: Add Guide Button to FloatingActionMenu
```typescript
// In FloatingActionMenu.tsx

import { useGuide } from '../contexts/GuideContext';

const FloatingActionMenu: React.FC = () => {
  const { startGuide, hasSeenGuide } = useGuide();
  const location = useLocation();

  // Find available guide for current page
  const availableGuide = guides.find(g => 
    location.pathname === g.route || location.pathname.startsWith(g.route)
  );

  const handleStartGuide = () => {
    if (availableGuide) {
      startGuide(availableGuide.id);
    }
  };

  // Add guide button to expanded menu
  {availableGuide && (
    <button
      onClick={handleStartGuide}
      className="btn btn-info shadow-lg fab-menu-item"
      style={{
        borderRadius: '50%',
        width: '50px',
        height: '50px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#17a2b8',
        borderColor: '#17a2b8',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        transition: 'all 0.3s ease',
        cursor: 'pointer',
        border: 'none'
      }}
      title="Start Interactive Guide"
      aria-label="Start interactive guide"
    >
      <i className="fas fa-route" style={{ fontSize: '24px', color: '#fff' }}></i>
    </button>
  )}
};
```

#### Step 6: Integrate Guide Component in App
```typescript
// In App.tsx

import { GuideProvider } from './contexts/GuideContext';
import InteractiveGuide from './components/InteractiveGuide';

function App() {
  return (
    <GuideProvider>
      <Router>
        <Layout>
          <Routes>
            {/* ... routes ... */}
          </Routes>
          <InteractiveGuide />
        </Layout>
      </Router>
    </GuideProvider>
  );
}
```

### Step 7: Add Data Attributes to Target Elements
```typescript
// Example: In Stories.tsx
<div className="stories-list" data-tour="stories-list">
  {/* Stories content */}
</div>

// Example: In StoryCreationWizard.tsx
<div data-step="story" data-tour="story-step">
  {/* Story step content */}
</div>
```

---

## Phase B: Integration with Documentation System (Future)

Once Phase 1 & 2 are complete, enhance guides:

### Enhancements

1. **Backend-Managed Guides**
   - Store guide configs in database
   - Admin interface to edit guides
   - Version control for guides

2. **Link to Documentation**
   - Each guide step can link to full documentation
   - "Learn more" button in guide tooltips

3. **Analytics**
   - Track guide completion rates
   - Identify where users drop off
   - A/B test different guide flows

4. **Dynamic Guides**
   - Guides adapt based on user behavior
   - Show different guides for new vs. returning users
   - Context-aware guides (e.g., "You haven't created a character yet")

---

## File Structure

```
vybzapp/frontend/src/
├── components/
│   ├── InteractiveGuide.tsx          # Main guide component
│   └── FloatingActionMenu.tsx         # Updated with guide button
├── contexts/
│   └── GuideContext.tsx               # Guide state management
├── config/
│   └── guides.ts                      # Guide configurations
└── App.tsx                            # Updated with GuideProvider
```

---

## Implementation Timeline

### Phase A: Standalone (4-6 hours)
- ✅ Install react-joyride
- ✅ Create guide configs
- ✅ Create GuideContext
- ✅ Create InteractiveGuide component
- ✅ Add guide button to FloatingActionMenu
- ✅ Add data attributes to target elements
- ✅ Test guides on key pages

### Phase B: Integration (Future, 4-6 hours)
- Backend API for guide management
- Admin interface
- Analytics tracking
- Documentation linking

---

## Example Guide Flows

### 1. First-Time User Onboarding
- **Stories Page**: Show how to browse
- **Story Creation**: Full wizard walkthrough
- **Episode Management**: How to add episodes
- **3D Viewer**: How to interact with 3D scenes

### 2. Feature Discovery
- **Collaboration**: How to invite collaborators
- **Studio Management**: How to create/manage studios
- **Character Management**: How to add/edit characters

### 3. Advanced Features
- **Camera Controls**: How to position cameras
- **Dialogue System**: How to create dialogues
- **Export/Import**: How to export stories

---

## Best Practices

1. **Keep Guides Short**: 3-5 steps max per guide
2. **Progressive Disclosure**: Don't overwhelm new users
3. **Skip Option**: Always allow users to skip
4. **Mobile-Friendly**: Ensure guides work on mobile
5. **Accessible**: Use proper ARIA labels
6. **Non-Intrusive**: Don't block critical actions
7. **Contextual**: Show guides when relevant
8. **Optional**: Make guides opt-in, not forced

---

## Testing Strategy

1. **Manual Testing**: Test each guide flow
2. **Cross-Browser**: Test in Chrome, Firefox, Safari
3. **Mobile Testing**: Ensure guides work on mobile
4. **Accessibility**: Test with screen readers
5. **Edge Cases**: Test with missing elements, slow loading

---

## Success Metrics

- **Completion Rate**: % of users who complete guides
- **Skip Rate**: % of users who skip guides
- **Feature Adoption**: Do users use features after guides?
- **Support Tickets**: Reduction in "how do I..." tickets

---

## Next Steps

1. **Decide**: Standalone (Phase A) or wait for Phase 1 & 2?
2. **Choose Library**: react-joyride recommended
3. **Create First Guide**: Stories page or Story Creation
4. **Test & Iterate**: Get user feedback
5. **Expand**: Add guides for more pages/features

---

## Recommendation

**Start with Phase A (Standalone)** because:
- ✅ Faster to implement (4-6 hours vs 18-26 hours)
- ✅ Immediate value for users
- ✅ Can iterate quickly
- ✅ No backend dependencies
- ✅ Can enhance later with Phase 1 & 2 integration

Then enhance with Phase B when documentation system is ready!
