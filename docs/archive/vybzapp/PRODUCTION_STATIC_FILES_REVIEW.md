# Production Static Files Configuration Review

## Current Configuration Analysis

### React Build Location
- **Path:** `vybzapp/frontend/build/`
- **Build Command:** `npm run build` or `npm run build:prod` (with `PUBLIC_URL=/v2`)
- **Contents:** `index.html`, `static/` folder (JS, CSS, assets)

### Django Static Files Settings

**Current `STATICFILES_DIRS` (base.py):**
```python
STATICFILES_DIRS = [
    os.path.join(BASE_DIR, 'static')  # Only includes static/ folder
]
```

**Missing:** React build folder is NOT included in `STATICFILES_DIRS`

**Production Settings (pro.py):**
```python
STATICFILES_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
STATIC_URL = 'https://%s/%s/' % (AWS_S3_CUSTOM_DOMAIN, AWS_LOCATION)
AWS_LOCATION = 'static'
```

## Problem Identified

❌ **The React build folder is NOT included in Django's static files configuration.**

**Impact:**
1. React static files (JS, CSS, assets) are NOT collected by `python manage.py collectstatic`
2. React static files are NOT uploaded to S3 in production
3. React app will fail to load in production (404s for JS/CSS files)
4. Only the `static/` folder is being collected and uploaded

## Required Change for Production

### ✅ Solution: Add React Build Folder to STATICFILES_DIRS

**File:** `vybzapp/snm/settings/base.py`

**Current Code (Line 215-217):**
```python
STATICFILES_DIRS = [
    os.path.join(BASE_DIR, 'static')
]
```

**Required Change:**
```python
STATICFILES_DIRS = [
    os.path.join(BASE_DIR, 'static'),
    os.path.join(BASE_DIR, 'frontend', 'build'),  # ADD THIS LINE - React build folder
]
```

### Why This Works

1. **collectstatic** will now find React build files
2. Files will be copied to `STATIC_ROOT` (live-static/static-root/)
3. In production, files automatically upload to S3 via `STATICFILES_STORAGE`
4. Files will be accessible at: `https://bucket.s3.amazonaws.com/static/...`

### Production Deployment Steps

1. **Build React App:**
   ```bash
   cd frontend
   npm run build:prod  # Uses PUBLIC_URL=/v2
   ```

2. **Verify Build Exists:**
   ```bash
   ls -la frontend/build/static/
   ```

3. **Update Django Settings:**
   - Add React build folder to `STATICFILES_DIRS`

4. **Collect Static Files:**
   ```bash
   python manage.py collectstatic --noinput
   ```

5. **Verify Files in STATIC_ROOT:**
   ```bash
   ls -la live-static/static-root/
   ```

6. **In Production:**
   - `collectstatic` will automatically upload to S3
   - Files accessible via S3 URL

### Important Notes

1. **Build Before Collectstatic:**
   - Always run `npm run build:prod` BEFORE `python manage.py collectstatic`
   - Ensure build folder exists before Django tries to collect files

2. **File Structure in S3:**
   - With `AWS_LOCATION = 'static'`, React files will be at:
     - `s3://bucket/static/static/js/main.abc123.js`
     - `s3://bucket/static/static/css/main.def456.css`
   - The nested `static/` folder comes from React's build structure

3. **PUBLIC_URL Consideration:**
   - `build:prod` uses `PUBLIC_URL=/v2`
   - This affects asset paths in `index.html` and manifest files
   - Django `STATIC_URL` should match or be configured accordingly
   - Current production `STATIC_URL` is S3-based, which should work

4. **Index.html Serving:**
   - `index.html` will be collected but needs to be served by Django view
   - Consider creating a view that serves `index.html` for React routes
   - Or configure web server (nginx/Apache) to serve React app

## Summary

**Required Change:** Add one line to `STATICFILES_DIRS` in `base.py`:

```python
os.path.join(BASE_DIR, 'frontend', 'build')
```

This ensures React static files are included in Django's static files collection and uploaded to S3 in production.

