# Scripts

Reusable repository scripts live here.

## Maintained Scripts

- `cleanup_production_root.sh`: dry-run-first cleanup for legacy duplicate folders on production servers.

## Local Scripts

Do not commit one-off diagnostics or temporary migration probes. Put local-only scripts in `scripts/local/` or use root-level names like `check_*.py`, `debug_*.py`, `inspect_*.py`, or `*.local.sh`; these are ignored by Git.
