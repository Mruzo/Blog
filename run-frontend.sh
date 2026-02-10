#!/usr/bin/env bash
# Run the React frontend from the canonical app directory only.
# Use this from the repo root: /home/chris/applications/vybz
# Do not run the app from worktrees (e.g. jaq).
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/vybzapp/frontend"
exec npm start
