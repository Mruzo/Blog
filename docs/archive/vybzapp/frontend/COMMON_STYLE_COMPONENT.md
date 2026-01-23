# Common Style Component Summary

## 🎨 Primary Style Component: Card with `border-0 shadow-sm`

The most common styling pattern across the React app is:

```tsx
<div className="card border-0 shadow-sm">
  <div className="card-header bg-primary text-white">
    <h5 className="mb-0">Header</h5>
  </div>
  <div className="card-body">
    {/* Content */}
  </div>
</div>
```

**Found in:**
- 10+ pages
- Used 20+ times across the application
- Standard pattern for all content cards

## 📐 Common Container Pattern

```tsx
<div className="container mt-4" style={{ maxWidth: '1200px' }}>
  {/* Page content */}
</div>
```

## 🎯 Most Common Reusable Components

1. **PageHeader** - Page headers
2. **LoadingSpinner** - Loading states
3. **BackButton** - Navigation
4. **SmallButton** - Buttons
5. **MessagePopup** - Notifications

## 📝 Font Hierarchy (Proportional)

- `subtext-btn` - Main headings (1.8rem)
- `subtext-btn-sm` - Body text (1rem)
- `subtext-btn-xs` - Small text (0.9rem)

**Most common:** `subtext-btn-sm` for most text content
