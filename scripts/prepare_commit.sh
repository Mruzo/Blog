#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  scripts/prepare_commit.sh
  scripts/prepare_commit.sh --stage

Shows git status from the repository root, no matter which subfolder you run it from.

Options:
  --stage    Stage all tracked, deleted, and untracked files from the repository root.

After reviewing staged changes, commit normally:
  git commit -m "Your message"
EOF
}

stage_all=false

case "${1:-}" in
  "")
    ;;
  --stage)
    stage_all=true
    ;;
  -h|--help)
    usage
    exit 0
    ;;
  *)
    echo "Unknown option: $1" >&2
    usage >&2
    exit 2
    ;;
esac

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

echo "Repository root: $repo_root"
echo

if [[ "$stage_all" == true ]]; then
  git add -A
  echo "Staged all changes from the repository root."
  echo
fi

git status
