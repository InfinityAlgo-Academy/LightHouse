#!/bin/bash

set -euxo pipefail

whoami
export HOME="/home/lighthouse"

cd /home/lighthouse
mkdir -p ./src
cd ./src

if [[ ! -d ./lighthouse ]]; then
  git clone https://github.com/GoogleChrome/lighthouse.git
fi

cd ./lighthouse

git fetch origin
git checkout -f origin/collect-gcp
yarn install

urls=(`node -e 'console.log(require("./lighthouse-core/scripts/lantern/collect/urls.js").join("\n"))'`)

# Run the collection
xvfb-run node --max-old-space-size=4096 lighthouse-core/scripts/compare-runs.js \
  --name urls-6.0 \
  --collect \
  -n 5 \
  --lh-flags='--only-categories=performance' \
  --urls "${urls[@]}"

# Kill xvfb
kill $!
