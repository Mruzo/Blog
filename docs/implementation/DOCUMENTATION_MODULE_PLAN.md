# Documentation Module Implementation Plan

## Overview
Implement a documentation system integrated with the floating action menu, following the same architecture pattern as the feedback system. Users can access contextual documentation for the current page they're viewing.

## UX Rating: ⭐⭐⭐⭐⭐ (5/5)

### Why This UX is Excellent:
1. **Contextual Help**: Documentation appears for the exact page the user is on - no hunting through menus
2. **Non-Intrusive**: Accessible via float buttons, doesn't clutter the main UI
3. **Consistent Pattern**: Uses the same interaction model as feedback (users already understand it)
4. **Progressive Disclosure**: Shows current page docs first, can expand to full docs
5. **Always Available**: Float buttons are persistent across pages
6. **Mobile-Friendly**: Works seamlessly on all screen sizes

## Architecture Overview

### Pattern: Mirror Feedback System
- **FloatingActionMenu** → Add Documentation button
- **DocumentationModal** → Similar to FeedbackModal
- **DocumentationContext** → Similar to FeedbackContext
- **Backend API** → New documentation endpoints
- **Page Detection** → Reuse `getPageName()` helper

## Implementation Phases

### Phase 1: Backend Foundation
**Goal**: Create data models and API endpoints for documentation

#### 1.1 Django Model (`icvybz/models.py`)
```python
class DocumentationPage(models.Model):
    """Documentation content for specific pages"""
    page_name = models.CharField(max_length=100, unique=True)  # e.g., "Stories", "Story Creation"
    page_path = models.CharField(max_length=200, blank=True)  # e.g., "/immersivecomics/"
    title = models.CharField(max_length=200)
    content = models.TextField()  # Markdown supported
    order = models.IntegerField(default=0)  # For ordering in full docs view
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['order', 'page_name']
        indexes = [
            models.Index(fields=['page_name', 'is_active']),
            models.Index(fields=['page_path']),
        ]
    
    def __str__(self):
        return f"{self.page_name} Documentation"
```

#### 1.2 API Endpoints (`icvybz/api_views.py`)
```python
@api_view(['GET'])
@permission_classes([AllowAny])
def get_documentation(request, page_name=None):
    """
    Get documentation for a specific page or all pages
    
    Query params:
    - page_name: Specific page (e.g., "Stories")
    - Returns: Single page doc if page_name provided, all docs if not
    """
    if page_name:
        try:
            doc = DocumentationPage.objects.get(
                page_name=page_name,
                is_active=True
            )
            serializer = DocumentationPageSerializer(doc)
            return Response(serializer.data)
        except DocumentationPage.DoesNotExist:
            return Response(
                {'error': f'Documentation not found for page: {page_name}'},
                status=404
            )
    else:
        # Return all active documentation pages
        docs = DocumentationPage.objects.filter(is_active=True).order_by('order')
        serializer = DocumentationPageSerializer(docs, many=True)
        return Response(serializer.data)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_documentation_by_path(request):
    """
    Get documentation based on current URL path
    Uses same logic as getPageName() helper
    """
    path = request.GET.get('path', '')
    page_name = get_page_name_from_path(path)  # Mirror frontend logic
    return get_documentation(request, page_name)
```

#### 1.3 Serializer (`icvybz/serializers.py`)
```python
class DocumentationPageSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentationPage
        fields = ['id', 'page_name', 'page_path', 'title', 'content', 'order']
```

#### 1.4 URL Routes (`icvybz/api_urls.py`)
```python
path('documentation/', api_views.get_documentation, name='documentation-list'),
path('documentation/<str:page_name>/', api_views.get_documentation, name='documentation-detail'),
path('documentation/by-path/', api_views.get_documentation_by_path, name='documentation-by-path'),
```

#### 1.5 Admin Interface (`icvybz/admin.py`)
```python
@admin.register(DocumentationPage)
class DocumentationPageAdmin(admin.ModelAdmin):
    list_display = ['page_name', 'title', 'order', 'is_active', 'updated_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['page_name', 'title', 'content']
    ordering = ['order', 'page_name']
```

### Phase 2: Frontend Components
**Goal**: Create documentation modal and integrate with floating menu

#### 2.1 Documentation Context (`frontend/src/contexts/DocumentationContext.tsx`)
```typescript
interface DocumentationContextType {
  page?: string;
  storyId?: number;
  storyTitle?: string;
  setContext: (context: Partial<DocumentationContextType>) => void;
  clearContext: () => void;
}

export const DocumentationContext = createContext<DocumentationContextType | null>(null);
```

#### 2.2 Documentation Modal (`frontend/src/components/DocumentationModal.tsx`)
**Features**:
- Fetches documentation for current page on open
- Displays markdown content (use `react-markdown` or similar)
- Shows "View All Documentation" link/button
- Loading states
- Error handling (no docs found)
- Responsive design matching FeedbackModal style

**Structure**:
```typescript
interface DocumentationModalProps {
  show: boolean;
  onClose: () => void;
  context?: {
    page?: string;
    storyId?: number;
    storyTitle?: string;
  };
}

const DocumentationModal: React.FC<DocumentationModalProps> = ({ show, onClose, context }) => {
  const [documentation, setDocumentation] = useState<Documentation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAllDocs, setShowAllDocs] = useState(false);
  
  // Fetch docs for current page on open
  useEffect(() => {
    if (show && context?.page) {
      fetchDocumentation(context.page);
    }
  }, [show, context]);
  
  // Render markdown content
  // Show "View All" button
  // Handle loading/error states
};
```

#### 2.3 API Service (`frontend/src/services/api.ts`)
```typescript
// Add to apiService
async getDocumentation(pageName?: string): Promise<DocumentationResponse> {
  const url = pageName 
    ? `/api/immersivecomics/documentation/${pageName}/`
    : '/api/immersivecomics/documentation/';
  return this.get(url);
}

async getDocumentationByPath(path: string): Promise<DocumentationResponse> {
  return this.get(`/api/immersivecomics/documentation/by-path/?path=${encodeURIComponent(path)}`);
}
```

#### 2.4 Update FloatingActionMenu (`frontend/src/components/FloatingActionMenu.tsx`)
**Changes**:
- Add Documentation button next to Feedback button
- Add state for documentation modal
- Import DocumentationModal
- Add click handler
- Pass context (reuse same context building logic)

```typescript
// Add to expanded menu items:
{/* Documentation Button */}
<button
  onClick={handleOpenDocumentationModal}
  className="btn btn-info shadow-lg fab-menu-item"
  style={{
    borderRadius: '50%',
    width: '50px',
    height: '50px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#17a2b8', // Info blue
    borderColor: '#17a2b8',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    transition: 'all 0.3s ease',
    cursor: 'pointer',
    border: 'none'
  }}
  title="View Documentation"
  aria-label="Open documentation"
>
  <i className="fas fa-book" style={{ fontSize: '24px', color: '#fff' }}></i>
</button>

// Add modal:
<DocumentationModal 
  show={showDocumentationModal} 
  onClose={handleCloseDocumentationModal} 
  context={context} 
/>
```

### Phase 3: Content Management
**Goal**: Create initial documentation content

#### 3.1 Initial Documentation Pages
Create via Django admin or management command:

1. **Stories** (`/immersivecomics/`)
   - How to browse stories
   - How to filter/search
   - How to view story details

2. **Story Creation** (`/immersivecomics/story/create`)
   - Step-by-step guide
   - Required fields
   - Tips and best practices

3. **Story Management** (`/immersivecomics/story/{id}/manage`)
   - Managing seasons
   - Managing episodes
   - Managing characters
   - Collaboration features

4. **Episode Management** (`/immersivecomics/season/{id}/episodes`)
   - Creating episodes
   - Adding dialogues
   - 3D model controls
   - Camera positioning

5. **My Studio** (`/immersivecomics/my-studio/`)
   - Studio overview
   - Managing collaborators
   - Studio settings

6. **Studios** (`/immersivecomics/studios/`)
   - Browsing studios
   - Joining studios
   - Studio features

#### 3.2 Content Format
- Use Markdown for rich formatting
- Include screenshots/GIFs (stored in `static/documentation/`)
- Keep content concise and scannable
- Use headings, lists, code blocks
- Add "Related" links to other docs

### Phase 4: Enhanced Features (Future)
**Goal**: Advanced documentation features

#### 4.1 Search Functionality
- Search across all documentation
- Highlight search terms
- Search suggestions

#### 4.2 Documentation Analytics
- Track which docs are viewed most
- Track which pages need more help (high feedback + low docs views)
- User feedback on documentation helpfulness

#### 4.3 Interactive Guides
- Step-by-step walkthroughs
- Tooltips on first visit
- Video tutorials embedded

#### 4.4 Multi-language Support
- Internationalization
- Language selector in modal

## File Structure

```
vybzapp/
├── icvybz/
│   ├── models.py                    # DocumentationPage model
│   ├── serializers.py               # DocumentationPageSerializer
│   ├── api_views.py                 # Documentation API endpoints
│   ├── api_urls.py                  # Documentation URL routes
│   ├── admin.py                     # DocumentationPageAdmin
│   └── migrations/
│       └── XXXX_add_documentation.py
│
├── frontend/src/
│   ├── components/
│   │   ├── DocumentationModal.tsx  # Main documentation modal
│   │   ├── FloatingActionMenu.tsx   # Updated with doc button
│   │   └── MarkdownRenderer.tsx     # Optional: Markdown component
│   ├── contexts/
│   │   └── DocumentationContext.tsx # Documentation context provider
│   ├── services/
│   │   └── api.ts                   # Updated with doc endpoints
│   └── types/
│       └── documentation.ts         # TypeScript interfaces
│
└── static/
    └── documentation/               # Documentation images/assets
        ├── screenshots/
        └── gifs/
```

## Data Flow

1. **User clicks Documentation button** in FloatingActionMenu
2. **FloatingActionMenu** builds context (page name from `getPageName()`)
3. **DocumentationModal** opens and receives context
4. **DocumentationModal** calls `apiService.getDocumentation(context.page)`
5. **Backend** looks up `DocumentationPage` by `page_name`
6. **Backend** returns documentation content (markdown)
7. **DocumentationModal** renders markdown content
8. **User** can view current page docs or "View All Documentation"

## Integration Points

### With Feedback System
- **Shared Context**: Both use same context building logic
- **Shared UI Pattern**: Both use FloatingActionMenu
- **Shared Styling**: Both modals use same design system
- **Complementary**: Feedback for issues, Docs for help

### With Existing Systems
- **Page Detection**: Reuses `getPageName()` helper
- **API Service**: Uses same axios instance and interceptors
- **Routing**: Works with React Router's `useLocation()`
- **Styling**: Uses existing Bootstrap classes and custom CSS

## Testing Strategy

### Backend Tests
- `test_get_documentation_by_page_name()`
- `test_get_documentation_by_path()`
- `test_documentation_not_found()`
- `test_documentation_inactive()`
- `test_documentation_ordering()`

### Frontend Tests
- `DocumentationModal.test.tsx`
- `FloatingActionMenu.test.tsx` (updated)
- Integration tests for context flow
- API service tests

### E2E Tests
- User opens docs from Stories page
- User opens docs from Story Creation page
- User views all documentation
- Documentation loads correctly for each page

## Migration Path

1. **Phase 1**: Backend only (models, API, admin) - No frontend changes
2. **Phase 2**: Frontend components (modal, button) - Backend ready
3. **Phase 3**: Content creation - System fully functional
4. **Phase 4**: Enhanced features - Iterative improvements

## Success Metrics

- **Adoption**: % of users who click documentation button
- **Engagement**: Average time spent viewing docs
- **Effectiveness**: Reduction in feedback tickets for documented features
- **Coverage**: % of pages with documentation
- **User Satisfaction**: Feedback on documentation helpfulness

## Dependencies

### Backend
- Django REST Framework (already installed)
- Markdown support (optional, for rich content)

### Frontend
- `react-markdown` or `marked` (for rendering markdown)
- `react-syntax-highlighter` (optional, for code blocks)
- Existing: React Router, Axios, Bootstrap

## Timeline Estimate

- **Phase 1 (Backend)**: 4-6 hours
- **Phase 2 (Frontend)**: 6-8 hours
- **Phase 3 (Content)**: 8-12 hours (ongoing)
- **Phase 4 (Enhanced)**: TBD

**Total Initial Implementation**: ~18-26 hours

## Notes

- Documentation content can be added incrementally
- Start with high-traffic pages first
- Use analytics to identify pages needing docs
- Keep documentation concise and actionable
- Update docs as features evolve
