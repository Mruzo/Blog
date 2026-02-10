# Resolve Merge Conflict - Production Server

## Current Situation
Git sees a rename/delete conflict:
- Remote deleted: `frontend/build/static/js/main.a13807e8.js.LICENSE.txt`
- Local has: `vybzapp/frontend/build/static/js/main.469d7dec.js.LICENSE.txt`

## Solution - Run these commands on production server:

```bash
# 1. Check current merge status
git status

# 2. Accept the new location (vybzapp/frontend) - add the new file
git add vybzapp/frontend/build/static/js/main.469d7dec.js.LICENSE.txt
git add vybzapp/frontend/build/static/js/main.469d7dec.js
git add vybzapp/frontend/build/static/js/main.469d7dec.js.map

# 3. Remove any old frontend/ references if they exist
git rm -rf frontend/build/ 2>/dev/null || true
rm -rf frontend/ 2>/dev/null || true

# 4. Complete the merge
git commit -m "Merge: Resolve frontend folder rename conflict, keep vybzapp/frontend"

# 5. Rebuild frontend to ensure build files are current
cd vybzapp/frontend
npm run build
cd ../..

# 6. Verify everything is clean
git status
```

## Alternative: If the above doesn't work, use merge strategy

```bash
# Abort current merge first
git merge --abort

# Remove frontend folder
rm -rf frontend/

# Pull with strategy to prefer remote (which has the deletion)
git pull https://github.com/Mruzo/Blog.git vybz -X theirs

# Rebuild frontend
cd vybzapp/frontend && npm run build && cd ../..
```

## What's Happening

The conflict occurs because:
1. Your local production had `frontend/build/...` files
2. The remote commit deleted `frontend/` and has `vybzapp/frontend/build/...` 
3. Git sees this as "file deleted vs file renamed" conflict

The solution is to accept the new location (`vybzapp/frontend/`) and complete the merge.
