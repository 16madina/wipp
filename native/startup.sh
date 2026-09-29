#!/bin/sh
set -eu
cd /workspace
if curl -sf -o /dev/null --max-time 2 http://127.0.0.1:8080/; then
  exit 0
fi
# Expo web preview for Lot 2 native app
npx expo start --web --host lan --port 8080 >>/tmp/app-startup.log 2>&1 &
