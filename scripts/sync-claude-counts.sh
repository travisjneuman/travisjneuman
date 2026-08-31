#!/bin/bash
# Sync .claude toolkit counts into README.md using the canonical generator.

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
GENERATOR="${TJN_CLAUDE_COUNTS_GENERATOR:-$HOME/.claude/scripts/generate-counts.mjs}"

if [ ! -f "$GENERATOR" ]; then
  echo "Error: $GENERATOR not found. Update ~/.claude or set TJN_CLAUDE_COUNTS_GENERATOR."
  exit 1
fi

node "$GENERATOR" --write --travis-repo="$REPO_ROOT"
echo "Done. Review changes with: git diff -- README.md"
