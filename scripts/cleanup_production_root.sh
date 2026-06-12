#!/usr/bin/env bash
# Remove legacy duplicate folders at the repo root on production.
# Canonical app lives in vybzapp/ (manage.py, apps, templates, static, frontend).
#
# Usage (from repo root, e.g. ~/sites/vybz_live):
#   ./scripts/cleanup_production_root.sh           # dry run (default)
#   ./scripts/cleanup_production_root.sh --execute # actually delete
#
# After --execute, rebuild and restart:
#   cd vybzapp/frontend && npm ci && npm run build && cd ../..
#   cd vybzapp && python manage.py collectstatic --noinput --settings=snm.settings.pro
#   sudo systemctl restart gunicorn   # or your supervisor command

set -euo pipefail

EXECUTE=false
INCLUDE_VYBZAPP_MEDIA=false
INCLUDE_VYBZAPP_LIVE_STATIC=false

for arg in "$@"; do
  case "$arg" in
    --execute) EXECUTE=true ;;
    --include-vybzapp-media) INCLUDE_VYBZAPP_MEDIA=true ;;
    --include-vybzapp-live-static) INCLUDE_VYBZAPP_LIVE_STATIC=true ;;
    -h|--help)
      sed -n '2,12p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown option: $arg (try --help)" >&2
      exit 1
      ;;
  esac
done

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f vybzapp/manage.py ]]; then
  echo "ERROR: vybzapp/manage.py not found. Run from the vybz_live repo root." >&2
  exit 1
fi

remove_path() {
  local path="$1"
  if [[ ! -e "$path" ]]; then
    return 0
  fi
  if $EXECUTE; then
    rm -rf "$path"
    echo "REMOVED  $path"
  else
    echo "WOULD REMOVE  $path"
  fi
}

echo "Repo root: $ROOT"
if $EXECUTE; then
  echo "Mode: EXECUTE"
else
  echo "Mode: DRY RUN (pass --execute to delete)"
fi
echo

# --- Legacy duplicates at repo root (Django uses vybzapp/*) ---
for path in \
  snmov \
  static \
  templates \
  media \
  live-static \
  image \
  db.sqlite3 \
  pyvenv.cfg \
  .backup_before_pull \
  .gitignore.local_backup \
  requirements.txt.backup \
  check_collaborators.py \
  run_progressive_saving_tests.py \
  "Todo List"
do
  remove_path "$path"
done

# --- Dev junk inside vybzapp/ (not needed on production) ---
for path in \
  vybzapp/pyvenv.cfg \
  vybzapp/db.sqlite3 \
  vybzapp/MagicMock \
  vybzapp/__pycache__ \
  vybzapp/requirements.txt.backup \
  vybzapp/check_collaborators.py \
  vybzapp/run_progressive_saving_tests.py \
  vybzapp/TEST_PDF_GENERATION.md \
  vybzapp/VIEWS_SHARES_TESTS.md \
  vybzapp/snmov/bin \
  vybzapp/vybzapp \
  vybzapp/frontend/test-backup-redundant-* \
  vybzapp/frontend/test-backup-2025-* \
  vybzapp/frontend/test-consolidated-*.js \
  vybzapp/frontend/debug-loading-issues.js \
  vybzapp/frontend/detect-loading-issues.js \
  vybzapp/frontend/cleanup-old-tests.js
do
  # glob paths may not exist
  for match in $path; do
    remove_path "$match"
  done
done

if $INCLUDE_VYBZAPP_LIVE_STATIC; then
  remove_path vybzapp/live-static
else
  echo "SKIP  vybzapp/live-static (regenerate with collectstatic; pass --include-vybzapp-live-static to remove)"
fi

if $INCLUDE_VYBZAPP_MEDIA; then
  remove_path vybzapp/media
else
  echo "SKIP  vybzapp/media (prod uses S3; pass --include-vybzapp-media only if uploads are in the bucket)"
fi

echo
if $EXECUTE; then
  echo "Done. Remaining top-level layout:"
  ls -la "$ROOT" | sed 's/^/  /'
  echo
  echo "Next: npm run build, collectstatic, restart gunicorn."
else
  echo "Dry run complete. Re-run with --execute to apply."
fi
