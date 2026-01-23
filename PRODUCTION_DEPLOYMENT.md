# Production Deployment Guide

## Handling Frontend Build Files During Git Pull

When deploying to production, you may encounter this error:
```
Your local changes to the following files would be overwritten by merge:
frontend/build/asset-manifest.json
frontend/build/index.html
```

### Why This Happens

The `frontend/build/` directory is tracked in Git (intentionally, so Django can serve the React app). When you run `npm run build` in production, it generates new files with different hashes/timestamps, which Git sees as local modifications.

### Solution

**Option 1: Stash and Rebuild (Recommended)**
```bash
# Stash the local build changes
git stash push -m "Stashing production build files" frontend/build/

# Pull the latest changes
git pull origin master  # or your branch name

# Rebuild the frontend in production
cd frontend
npm run build
cd ..
```

**Option 2: Discard Local Changes and Rebuild**
```bash
# Discard local build changes
git checkout -- frontend/build/

# Pull the latest changes
git pull origin master  # or your branch name

# Rebuild the frontend in production
cd frontend
npm run build
cd ..
```

**Option 3: Force Pull (Use with Caution)**
```bash
# This will overwrite local changes
git fetch origin
git reset --hard origin/master  # or your branch name

# Rebuild the frontend
cd frontend
npm run build
cd ..
```

### Recommended Production Deployment Workflow

1. **Pull latest code:**
   ```bash
   git stash push -m "Stashing build files" frontend/build/
   git pull origin master
   ```

2. **Install/update dependencies (if package.json changed):**
   ```bash
   cd frontend
   npm install
   ```

3. **Build the frontend:**
   ```bash
   npm run build
   cd ..
   ```

4. **Run Django migrations (if any):**
   ```bash
   python manage.py migrate
   ```

5. **Collect static files:**
   ```bash
   python manage.py collectstatic --noinput
   ```

6. **Restart your web server:**
   ```bash
   # For systemd
   sudo systemctl restart gunicorn
   # Or for supervisor
   sudo supervisorctl restart vybz
   ```

### Why frontend/build/ is Tracked

The `frontend/build/` directory is tracked in Git because:
- Django needs to serve the React app's static files
- It ensures the production server has the built files even if npm build fails
- It provides a fallback if the build process has issues

However, you should always rebuild in production after pulling to ensure you have the latest version with correct hashes and timestamps.
