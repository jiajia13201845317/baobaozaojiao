#!/usr/bin/env bash
set -u
cd "$(dirname "$0")/.."
mkdir -p /tmp/toy-logs
while true; do
  /usr/bin/env node scripts/serve.mjs >> /tmp/toy-logs/static.log 2>&1
  echo "serve exited $? at $(date -Is)" >> /tmp/toy-logs/static.log
  sleep 1
done
