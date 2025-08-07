# Branch Switching Checklist

## 🚨 BEFORE Switching Branches

### 1. Commit Current Changes
```bash
git add .
git commit -m "descriptive message"
```

### 2. Check Working Directory is Clean
```bash
git status
# Should show: "nothing to commit, working tree clean"
```

### 3. Verify Current Branch Technology
- **Model-viewer branches** (`mruzo`, `master`):
  - `base.html` loads model-viewer script
  - `sm.js` uses model-viewer API
  - Templates use `<model-viewer>` elements

- **Three.js branches** (`mruzo-threejs`):
  - `base.html` loads Three.js libraries
  - `sm.js` uses Three.js API
  - Templates use `<div id="threejs-container">` elements

## 🔄 WHEN Switching Branches

### 1. Switch Branch
```bash
git checkout <branch-name>
```

### 2. Verify Technology Consistency
```bash
# Check base.html loads correct libraries
grep -E "(model-viewer|three.js)" templates/base.html

# Check sm.js uses correct API
grep -E "(model-viewer|THREE\.)" static/snmov/js/sm.js

# Check templates use correct elements
grep -E "(model-viewer|threejs-container)" tilf/templates/
```

## 🛡️ SAFEGUARDS IN PLACE

### Pre-commit Hook
- Automatically checks for technology mismatches
- Prevents commits with wrong technology code
- Runs validation before each commit

### Branch-Specific Validation
- **Model-viewer branches**: Blocks Three.js code
- **Three.js branches**: Blocks model-viewer code

## 📋 CRITICAL FILES TO MONITOR

### Always Check These Files When Switching:
1. `templates/base.html` - Script loading
2. `static/snmov/js/sm.js` - JavaScript API
3. `tilf/templates/tilf/episode_preview.html` - Template elements
4. `tilf/templates/tilf/episode_detail.html` - Template elements

### Technology Indicators:
- **Model-viewer**: `<model-viewer>`, `model-viewer.min.js`
- **Three.js**: `three.js`, `THREE.`, `threejs-container`

## 🚨 EMERGENCY RESET

If you accidentally mix technologies:
```bash
# Reset to clean state
git reset --hard HEAD
git clean -fd

# Verify clean state
git status
```

## 📝 BRANCH TECHNOLOGY MAP

| Branch | Technology | Key Files |
|--------|------------|-----------|
| `mruzo` | Model-viewer | base.html, sm.js, templates |
| `master` | Model-viewer | base.html, sm.js, templates |
| `mruzo-threejs` | Three.js | base.html, sm.js, templates | 