#!/bin/bash
# Delegate to the single canonical .claude producer (not a second counter).
# This wrapper requests a write, not a consumer-only copy. For a joint profile
# and portfolio refresh invoke the producer once with both destination paths;
# do not run both repos' wrappers and measure the same inventory twice.
# No image generation is requested here.

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
GENERATOR="${TJN_CLAUDE_COUNTS_GENERATOR:-$HOME/.claude/scripts/generate-counts.mjs}"

if [ ! -f "$GENERATOR" ]; then
  echo "Error: $GENERATOR not found. Update ~/.claude or set TJN_CLAUDE_COUNTS_GENERATOR."
  exit 1
fi

if [ "$#" -ne 0 ]; then
  echo "Error: this write wrapper accepts no flags. Use the canonical producer directly for explicit options."
  exit 1
fi

node "$GENERATOR" --write --travis-repo="$REPO_ROOT"
echo "Done. Review the README count region and canonical showcase snapshot changes."
