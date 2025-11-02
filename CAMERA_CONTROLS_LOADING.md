# Camera Controls Loading Analysis

## Question: Do camera controls load when the studio loads?

**Short Answer:** NO. Camera controls only load when **Edit Mode is activated** on the Story Manage page.

## Loading Flow:

### 1. **Studio Load (MyStudio page)**
- ✅ Story cards load
- ✅ Season/episode counts load
- ❌ Camera controls do NOT load
- ❌ Comic3DViewer is NOT rendered

### 2. **Story Manage Page Load**
- ✅ Story details load
- ✅ Characters load
- ✅ Seasons load
- ✅ Comic3DViewer component renders
- ❌ Camera controls do NOT load yet

### 3. **Edit Mode Activation**
- User clicks "Edit Mode" button
- `isEditMode` state changes to `true`
- ✅ Camera controls NOW load and become visible

## Code Evidence:

```typescript
// From Comic3DViewer.tsx
const [isEditMode, setIsEditMode] = useState(false); // Starts as false

// Camera controls are conditionally rendered:
{isEditMode && selectedEpisode && dialogueData.length > 0 && (
  // ... camera controls rendered here ...
)}
```

## Conclusion:

**Camera controls are lazily loaded** - they only initialize and render when:
1. User navigates to Story Manage page
2. User clicks "Edit Mode" button
3. An episode with dialogues exists

This is an **optimization** to avoid loading heavy camera control logic until needed.
