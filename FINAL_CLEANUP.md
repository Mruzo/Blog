# Final Cleanup - Production Server

## Current Situation
- You're in `vybzapp/` subdirectory
- Git still shows root-level `frontend/` folder with modified/deleted files
- Need to remove the old `frontend/` folder completely

## Solution - Run these commands on production server:

```bash
# 1. Go back to repo root (if you're in vybzapp/)
cd /path/to/vybz_live  # or just: cd ..

# 2. Check if frontend/ folder exists
ls -la frontend/ 2>&1 | head -5

# 3. Remove the old frontend/ folder completely (it's the duplicate)
rm -rf frontend/

# 4. Discard all changes to frontend/ in git (since we're deleting it)
git restore frontend/ 2>/dev/null || true
git clean -fd frontend/ 2>/dev/null || true

# 5. Remove frontend/ from git tracking (if it's still tracked)
git rm -r --cached frontend/ 2>/dev/null || true

# 6. Commit the removal
git add -A
git commit -m "Remove duplicate root-level frontend folder, keep only vybzapp/frontend"

# 7. Verify only vybzapp/frontend exists
ls -la vybzapp/frontend/ | head -5
git ls-files | grep "^frontend/"  # Should return nothing
git ls-files | grep "^vybzapp/frontend/" | head -5  # Should show files

# 8. Rebuild frontend to get fresh build files
cd vybzapp/frontend
npm install  # If needed
npm run build
cd ../..

# 9. Add the new build files
git add vybzapp/frontend/build/
git status  # Should show clean or only new build files

# 10. Final status check
git status
```

## Quick One-Liner Version

If you want to be more aggressive:

```bash
# From repo root
cd /path/to/vybz_live

# Remove frontend folder and all its git tracking
rm -rf frontend/
git rm -r frontend/ 2>/dev/null || true
git add -A
git commit -m "Remove duplicate frontend folder"

# Rebuild
cd vybzapp/frontend && npm run build && cd ../..

# Verify
git status
ls -la frontend/ 2>&1  # Should error: No such file
ls -la vybzapp/frontend/  # Should exist
```

## What This Does

1. Removes the physical `frontend/` folder
2. Removes it from git tracking
3. Commits the deletion
4. Rebuilds `vybzapp/frontend/` to get fresh build files
5. Verifies only `vybzapp/frontend/` remains

After this, you should have a clean state with only `vybzapp/frontend/` existing.
