#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

npm run build

rm -rf /tmp/bao-site
cp -a out /tmp/bao-site
rm -f /tmp/bao-site/art/family-*.png /tmp/bao-site/art/body-head.png
rm -f /tmp/bao-site/file.svg /tmp/bao-site/globe.svg /tmp/bao-site/next.svg /tmp/bao-site/vercel.svg /tmp/bao-site/window.svg
node scripts/shrink-art.mjs /tmp/bao-site/art
cp -f harvis.json /tmp/bao-site/harvis.json

CI=1 npx --yes hosting deploy /tmp/bao-site --name bao-bao-ting-ting
