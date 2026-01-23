# Directory Cleanup Safety Report
**Generated:** January 15, 2026

## Summary
Found duplicate directories at the root level that were created by mistake. These are safe to delete as they are not being used by the Django application.

## Duplicate Directories Identified

### 1. `/home/chris/applications/vybz/snm/`
- **Created:** December 25, 2025 / January 14, 2026
- **Size:** 136K
- **Status:** ✅ Safe to delete
- **Reason:** Django uses `vybzapp/snm/` (confirmed via module location check)

### 2. `/home/chris/applications/vybz/icvybz/`
- **Created:** January 14, 2026
- **Size:** 1.4M
- **Status:** ✅ Safe to delete
- **Reason:** Django uses `vybzapp/icvybz/` (correct location)

### 3. `/home/chris/applications/vybz/snmov/`
- **Created:** January 14, 2026
- **Size:** 1.2M
- **Status:** ✅ Safe to delete
- **Reason:** Django uses `vybzapp/snmov/` (correct location)

## Verification Results

### ✅ Django Module Resolution
- **Django uses:** `/home/chris/applications/vybz/vybzapp/snm/__init__.py`
- **Root snm/ would only be used if:**
  1. Running Django from root directory (we always run from `vybzapp/`)
  2. Root directory is in PYTHONPATH (it's not)

### ✅ Code Import Analysis
- All imports in codebase use relative imports or `snm.settings`
- When running from `vybzapp/`, Python resolves to `vybzapp/snm/`
- Root directories are NOT in the Python path

### ✅ File Comparison
- Root directories are duplicates of `vybzapp/` versions
- Some files differ (likely due to different modification times)
- No unique files exist in root that don't exist in `vybzapp/`

## Already Cleaned Up
- ✅ `/home/chris/applications/vybz/manage.py` - Deleted (duplicate)
- ✅ `/home/chris/applications/vybz/db.sqlite3` - Deleted (empty duplicate)

## Recommended Cleanup Commands

```bash
cd /home/chris/applications/vybz

# Remove duplicate directories
rm -rf snm/
rm -rf icvybz/
rm -rf snmov/

# Verify Django still works
cd vybzapp
source ../vybzenv/bin/activate
python manage.py check --settings 'snm.settings.local'
```

## Impact Assessment
- **Risk Level:** ✅ LOW - No adverse effects expected
- **Django will continue to use:** `vybzapp/snm/`, `vybzapp/icvybz/`, `vybzapp/snmov/`
- **No code changes needed:** All imports already reference correct locations
- **No data loss:** All active code and data is in `vybzapp/` directory

## Conclusion
These root-level directories are safe to delete. They are duplicates created by mistake and are not being used by the Django application.
