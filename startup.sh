#!/bin/sh
set -eu
cd /workspace/native
if curl -sf -o /dev/null --max-time 2 http://127.0.0.1:8080/; then
  exit 0
fi
# Expo web preview for the native WIPP app under native/
npm exec expo start -- --web --host lan --port 8080 >>/tmp/app-startup.log 2>&1 &
