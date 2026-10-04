#!/bin/zsh
# Converts Grok animation videos (black background + sound) into:
#   public/wipp-media/fx/surprise/anims/<id>.webp  transparent animated WebP (black keyed out)
#   public/wipp-media/fx/surprise/anims/<id>.m4a   the original soundtrack
#   native/assets/wipp/fx/surprise/anims/<id>-poster.png  still frame shown instantly in the app
# Usage: convert-grok-anims.sh <video-dir> <id=file.mp4> ...
set -e
SRC=$1; shift
ROOT=${0:A:h}/../..
WEB=$ROOT/public/wipp-media/fx/surprise/anims
APP=$ROOT/native/assets/wipp/fx/surprise/anims
mkdir -p $WEB $APP
KEY="format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='clip((max(max(r(X,Y),g(X,Y)),b(X,Y))-14)*5,0,255)'"
for pair in "$@"; do
  id=${pair%%=*}; file=${pair#*=}
  tmp=$(mktemp -d)
  ffmpeg -v error -y -i "$SRC/$file" -an -vf "fps=15,scale=360:640,$KEY" "$tmp/f%04d.png"
  img2webp -loop 0 -lossy -q 62 -m 4 -d 67 $tmp/f*.png -o "$WEB/$id.webp" >/dev/null 2>&1
  ffmpeg -v error -y -i "$SRC/$file" -vn -c:a aac -b:a 96k "$WEB/$id.m4a"
  ffmpeg -v error -y -ss 4 -i "$SRC/$file" -frames:v 1 -vf "scale=360:640,$KEY" "$APP/$id-poster.png"
  rm -rf $tmp
  echo "$id $(du -k $WEB/$id.webp | cut -f1)K"
done
