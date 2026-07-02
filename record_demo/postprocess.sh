#!/usr/bin/env bash
# Turn a raw Playwright recording into a polished mp4: speed-up, fixed frame
# rate, web-friendly H.264. ffmpeg is required.
#
# Usage: postprocess.sh <input.webm> <output.mp4> [speed] [fps]
#   speed  playback multiplier (default 2 = twice as fast)
#   fps    output frame rate   (default 60)
set -euo pipefail

input="${1:?input file required}"
output="${2:?output file required}"
speed="${3:-2}"
fps="${4:-60}"

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "ffmpeg is required but was not found on PATH." >&2
  echo "Install it with: brew install ffmpeg (macOS) or apt-get install ffmpeg (Debian/Ubuntu)." >&2
  exit 3
fi

# setpts divides presentation timestamps to speed up; -an drops the (silent) audio track.
ffmpeg -y -i "${input}" \
  -filter:v "setpts=PTS/${speed},fps=${fps}" \
  -an -c:v libx264 -pix_fmt yuv420p -movflags +faststart \
  "${output}" >&2

echo "${output}"
