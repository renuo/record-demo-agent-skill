#!/usr/bin/env bash
# Install the record_demo skill into a Claude Code skills directory.
#
# Usage:
#   ./install.sh                                   # -> ~/.claude/skills (all projects)
#   ./install.sh /path/to/project/.claude/skills   # -> a specific project
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
dest="${1:-$HOME/.claude/skills}"

mkdir -p "$dest"
cp -R "$here/record_demo" "$dest/"

# Never ship local install artifacts / recordings.
rm -rf "$dest/record_demo/node_modules"
rm -f "$dest/record_demo/"*.webm "$dest/record_demo/"*.mp4 2>/dev/null || true

echo "Installed record_demo skill to $dest/record_demo"
echo "Open Claude Code in a project and say: \"record a video of what you implemented\""
