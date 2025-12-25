# Stories Page Optimization Plan

## Current Issues
1. **Eager Loading**: All story data (seasons, episodes, dialogues, collaborators) loaded immediately for ALL stories
2. **Duplicate Requests**: Same endpoints called multiple times (visible in logs)
3. **Unnecessary Data**: Dialogues loaded for all episodes even when not needed
4. **No Request Deduplication**: No caching mechanism to prevent duplicate API calls

## Recommended Modern Approach

### Option 1: Lazy Loading with Intersection Observer (Recommended)
- Load story data only when story card becomes visible
- Use Intersection Observer API to detect when cards enter viewport
- Progressive loading: seasons → episodes → dialogues (on demand)

### Option 2: React Query / SWR (Best Practice)
- Use React Query or SWR for automatic caching, deduplication, and background refetching
- Built-in request deduplication
- Automatic cache invalidation
- Background refetching

### Option 3: Hybrid Approach (Recommended Implementation)
1. **Initial Load**: Only load basic story info (already done)
2. **Lazy Load Seasons/Episodes**: When story card becomes visible
3. **On-Demand Dialogues**: Only load when episode is selected in 3D viewer
4. **Request Cache**: Simple Map-based cache to prevent duplicate requests

## Implementation Strategy

### Phase 1: Request Deduplication
- Add request cache to prevent duplicate API calls
- Use Map to track in-flight requests

### Phase 2: Lazy Loading
- Use Intersection Observer to detect visible story cards
- Load seasons/episodes only for visible stories

### Phase 3: Progressive Loading
- Load dialogues only when episode is selected
- Load collaborators only when needed (or on hover)

### Phase 4: Consider React Query
- Migrate to React Query for better data management
- Automatic caching and deduplication

