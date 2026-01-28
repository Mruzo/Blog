# Console Log Replacement Script

This script replaces `console.log`, `console.warn`, `console.debug`, and `console.error` with the production-safe `logger` utility.

## Usage

### Dry Run (Preview Changes)
```bash
cd frontend
node scripts/replace-console-logs.js --dry-run
```

### Apply Changes
```bash
node scripts/replace-console-logs.js
```

### Process Specific File
```bash
node scripts/replace-console-logs.js --file=src/components/Comic3DViewer.tsx
```

### Verbose Output
```bash
node scripts/replace-console-logs.js --dry-run --verbose
```

## What It Does

1. **Finds all console statements** in `.ts`, `.tsx`, `.js`, `.jsx` files
2. **Replaces them** with appropriate logger methods:
   - `console.log` → `logger.log` (or `logger.camera`/`logger.verbose` for special cases)
   - `console.warn` → `logger.warn`
   - `console.debug` → `logger.debug`
   - `console.error` → `logger.error`
3. **Adds logger import** if not already present
4. **Smart detection**:
   - Camera-related logs → `logger.camera()` (only logs if `debug:camera=true` in localStorage)
   - Debug/verbose patterns → `logger.verbose()` (only in development)

## Exclusions

The script automatically excludes:
- Test files (`.test.`, `.spec.`)
- `node_modules`, `.git`, `build`, `dist`
- `__tests__`, `__mocks__` directories

## Safety

- Always run with `--dry-run` first to preview changes
- The script preserves code formatting
- Only modifies files that contain console statements
- Creates no backups (use git to track changes)

## Example Output

```
🔍 Finding console.log statements...

Found 46 files to check

✓ Updated: src/components/Comic3DViewer.tsx
✓ Updated: src/pages/Stories.tsx
...

============================================================
Summary:
  Files processed: 46
  Replacements made: 557

✅ Changes applied successfully!
```
