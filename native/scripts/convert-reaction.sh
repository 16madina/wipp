#!/bin/zsh
# Grok video (green background) → animated WebP with a real transparent background, for call reactions.
# Usage: zsh scripts/convert-reaction.sh <id> <video.mp4> [size=320] [fps=20] [key=green|black]
# Output: assets/call-reactions/<id>.webp (plays once). Then set `file: require("../../../assets/call-reactions/<id>.webp")`
# for this id in src/lib/calls/reactions.ts.
set -e
id=$1; src=$2; size=${3:-320}; fps=${4:-20}; key=${5:-green}
[[ -z "$id" || ! -f "$src" ]] && { echo "usage: convert-reaction.sh <id> <video.mp4> [size] [fps] [green|black]"; exit 1; }
tmp=$(mktemp -d)
if [[ $key == black ]]; then
  filter="colorkey=0x000000:0.12:0.08"
else
  # Green screen removed, then green spill on the edges neutralised.
  filter="chromakey=0x00ff00:0.16:0.06,despill=type=green"
fi
ffmpeg -loglevel error -y -i "$src" -vf "fps=$fps,$filter,scale=$size:$size:force_original_aspect_ratio=decrease,pad=$size:$size:(ow-iw)/2:(oh-ih)/2:color=0x00000000,format=rgba" "$tmp/f_%04d.png"
frames=($tmp/f_*.png)
delay=$((1000 / fps))
out="assets/call-reactions/$id.webp"
img2webp -loop 1 -lossy -q 72 -m 6 -d $delay "${frames[@]}" -o "$out" >/dev/null
rm -rf "$tmp"
dur=$(( ${#frames[@]} * delay ))
echo "$out  $(du -h "$out" | cut -f1)  ${#frames[@]} images  ~${dur} ms  (durationMs à mettre dans reactions.ts)"
