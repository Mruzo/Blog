# Fix Production Server Pull Error

## Current Situation
- Production has modified build files in `vybzapp/frontend/build/` that conflict
- Untracked `frontend/` folder exists
- Production branch is 64 commits ahead of remote

## Solution - Run these commands on your production server:

### Option 1: Stash changes and pull (Recommended)

```bash
# 1. Stash the modified build files (they'll be regenerated anyway)
git stash push -m "Stash build files before pull" vybzapp/frontend/build/

# 2. Remove the untracked frontend/ folder
rm -rf frontend/

# 3. Now pull should work
git pull https://github.com/Mruzo/Blog.git vybz

# 4. Rebuild the frontend (this will regenerate the build files)
cd vybzapp/frontend
npm install
npm run build
cd ../..
```

### Option 2: Discard build file changes and pull

```bash
# 1. Discard changes to build files (they're just build artifacts)
git restore vybzapp/frontend/build/asset-manifest.json
git restore vybzapp/frontend/build/index.html
git restore vybzapp/frontend/build/static/js/

# 2. Remove the untracked frontend/ folder
rm -rf frontend/

# 3. Pull
git pull https://github.com/Mruzo/Blog.git vybz

# 4. Rebuild frontend
cd vybzapp/frontend
npm install
npm run build
cd ../..
```

### Option 3: Commit build files first, then pull

```bash
# 1. Add and commit the build file changes
git add vybzapp/frontend/build/
git commit -m "Update build files before pull"

# 2. Remove untracked frontend/ folder
rm -rf frontend/

# 3. Pull (may have merge conflicts in build files - resolve by regenerating)
git pull https://github.com/Mruzo/Blog.git vybz

# 4. If there are conflicts in build files, regenerate them:
cd vybzapp/frontend
npm run build
cd ../..
git add vybzapp/frontend/build/
git commit -m "Regenerate build files after merge"
```

## Why This Happens

Build files (`asset-manifest.json`, `index.html`, JS bundles) are generated artifacts. They change every time you run `npm run build`. The remote has different build files than production, causing conflicts.

## Best Practice Going Forward

Add build files to `.gitignore` or always regenerate them after pull:

```bash
# After every pull, rebuild frontend
cd vybzapp/frontend && npm run build && cd ../..
```

## Verify After Fix

```bash
# Should show no frontend/ folder
ls -la frontend/ 2>&1  # Should error: No such file

# Should show vybzapp/frontend/ exists
ls -la vybzapp/frontend/

# Test build works
cd vybzapp/frontend && npm run build && cd ../..
```
