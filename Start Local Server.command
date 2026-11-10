#!/bin/zsh
# Runs the project only on this computer so the browser can grant camera access
# and Mozilla Readability can extract articles from URLs.
cd "$(dirname "$0")"
if lsof -nP -iTCP:4173 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Port 4173 is already in use. Close the older Reading Room Terminal window (or press Control-C there), then run this file again."
  read "?Press Return to close this window."
  exit 1
fi
if [[ ! -d node_modules ]]; then
  echo "Installing the open-source local reader components…"
  npm install || exit 1
fi
node server.js &
server_pid=$!
sleep 1
open "http://127.0.0.1:4173"
echo "Proxemic Typography is running at http://127.0.0.1:4173"
echo "Keep this Terminal window open while using the camera. Press Control-C to stop."
wait "$server_pid"
