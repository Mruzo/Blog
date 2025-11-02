# Production Static Files Configuration

## Current Situation

### React Build Folder Location
- **Build Folder:** `/home/chris/applications/vybz/vybzapp/frontend/build/`
- **Contents:** 
  - `index.html`
  - `static/` folder with JS, CSS, and asset files
  - Other static assets (fonts, images, etc.)

### Django Static Files Configuration

**Current Configuration (base.py):**
```python
STATIC_ROOT = os.path.join(BASE_DIR, 'live-static', 'static-root')
STATICFILES_DIRS = [
    os.path.join(BASE_DIR, 'static')
]
# STATIC_URL is not explicitly set (defaults to '/static/')
```

**Production Configuration (pro.py):**
```python
STATIC_URL = 'https://%s/%s/' % (AWS_S3_CUSTOM_DOMAIN, AWS_LOCATION)
STATICFILES_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
AWS_LOCATION = 'static'
```

### React Build Script
- **Standard build:** `npm run build` (outputs to `frontend/build/`)
- **Production build:** `npm run build:prod` (uses `PUBLIC_URL=/v2`)

## Issue Identified

**❌ PROBLEM:** The React build folder is **NOT** included in Django's `STATICFILES_DIRS`. This means:

1. React static files (JS, CSS, assets) are not collected by `python manage.py collectstatic`
2. React static files are not uploaded to S3 in production
3. React app will not be accessible in production unless manually configured

## Required Changes for Production

### Option 1: Add React Build Folder to STATICFILES_DIRS (Recommended)

**Update `snm/settings/base.py`:**
```python
STATICFILES_DIRS = [
    os.path.join(BASE_DIR, 'static'),
    os.path.join(BASE_DIR, 'frontend', 'build'),  # Add React build folder
    os.path.join(BASE_DIR, 'frontend', 'build', 'static'),  # Add React static folder
]
```

**Pros:**
- ✅ Simple and straightforward
- ✅ Works with existing Django static files system
- ✅ Files automatically collected to STATIC_ROOT and uploaded to S3
- ✅ Follows Django best practices

**Cons:**
- ⚠️ Need to rebuild React app before collectstatic
- ⚠️ Need to ensure build folder exists before Django starts

### Option 2: Copy React Build to Static Directory (Alternative)

**Manual Process:**
```bash
# After React build
cp -r frontend/build/* static/react-build/
```

**Or Add to Deploy Script:**
```bash
cd frontend && npm run build:prod && cd ..
cp -r frontend/build/* static/react-build/
python manage.py collectstatic --noinput
```

**Pros:**
- ✅ Keeps static files in one location
- ✅ Easier to manage

**Cons:**
- ⚠️ Requires manual copying step
- ⚠️ More complex deployment process

### Option 3: Serve React Build as Separate Static Location

**Update `snm/settings/base.py`:**
```python
STATICFILES_DIRS = [
    os.path.join(BASE_DIR, 'static'),
]

# Add separate configuration for React build
REACT_BUILD_DIR = os.path.join(BASE_DIR, 'frontend', 'build')
REACT_BUILD_STATIC_DIR = os.path.join(REACT_BUILD_DIR, 'static')
```

**Update `snm/urls.py` to serve React build:**
```python
from django.conf import settings
from django.views.static import serve
from django.views.generic import TemplateView

urlpatterns = [
    # ... existing patterns ...
    
    # Serve React build folder (development only)
    path('static/', include('django.contrib.staticfiles.urls')),
    
    # Serve React app for all routes (SPA fallback)
    path('<path:path>', TemplateView.as_view(template_name='react_app.html'), name='react_app'),
]

# For production, use reverse proxy or S3 for static files
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    # Serve React build in development
    urlpatterns += static('/react/', document_root=settings.REACT_BUILD_DIR)
```

**Pros:**
- ✅ Keeps React separate from Django static files
- ✅ Allows for different serving strategies

**Cons:**
- ⚠️ More complex configuration
- ⚠️ Requires additional URL routing for SPA

## Recommended Solution: Option 1

### Implementation Steps

1. **Update `snm/settings/base.py`:**
```python
STATICFILES_DIRS = [
    os.path.join(BASE_DIR, 'static'),
    os.path.join(BASE_DIR, 'frontend', 'build'),  # React build folder
]
```

2. **Build React App for Production:**
```bash
cd frontend
npm run build:prod  # Uses PUBLIC_URL=/v2
cd ..
```

3. **Collect Static Files:**
```bash
python manage.py collectstatic --noinput
```

4. **Deploy to S3 (production):**
```bash
# Static files will be automatically uploaded to S3 via STATICFILES_STORAGE
python manage.py collectstatic --noinput
```

### Production Deployment Checklist

- [ ] Build React app: `cd frontend && npm run build:prod`
- [ ] Verify build folder exists: `ls -la frontend/build/`
- [ ] Add React build to STATICFILES_DIRS in settings
- [ ] Run collectstatic: `python manage.py collectstatic --noinput`
- [ ] Verify files in STATIC_ROOT: `ls -la live-static/static-root/`
- [ ] In production, verify S3 upload via collectstatic
- [ ] Test React app loading in production

### Additional Considerations

1. **PUBLIC_URL Configuration:**
   - Current production build uses `PUBLIC_URL=/v2`
   - Ensure Django URLs serve static files from `/static/` or match `/v2/`
   - May need to update `STATIC_URL` or React `PUBLIC_URL` to match

2. **S3 Upload Structure:**
   - With `AWS_LOCATION = 'static'`, files will be at: `s3://bucket/static/...`
   - React build files will be at: `s3://bucket/static/static/js/...`
   - Consider if this nesting is acceptable or if React build should be at root

3. **Cache Headers:**
   - React build files have hashed filenames (e.g., `main.abc123.js`)
   - S3 cache headers (`max-age=86400`) should work well
   - Consider longer cache for React static files

4. **Index.html Handling:**
   - `index.html` should be served by Django view for SPA routing
   - Static files (JS/CSS) should be served from S3/CDN
   - May need custom view to serve `index.html` for all React routes

## Summary

**Required Change:** Add React build folder to `STATICFILES_DIRS` in Django settings.

**File to Update:** `vybzapp/snm/settings/base.py`

**Change:**
```python
STATICFILES_DIRS = [
    os.path.join(BASE_DIR, 'static'),
    os.path.join(BASE_DIR, 'frontend', 'build'),  # ADD THIS LINE
]
```

This ensures React static files are collected and uploaded to S3 in production.

