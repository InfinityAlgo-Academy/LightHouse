#!/bin/bash

set -e

DIRNAME="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
LH_ROOT_PATH="$DIRNAME/../../.."
cd $LH_ROOT_PATH

if [[ -f lantern-data/golden.json ]] && ! [[ "$FORCE" ]]; then
  echo "Lantern data already detected, done."
  exit 0
fi

rm -rf lantern-data/
mkdir lantern-data/ && cd lantern-data/

# Collected with lighthouse-core/scripts/lantern/collect/collect.js
ZIP_URL="https://drive.google.com/a/chromium.org/uc?id=1WZ0hxoMfpKNQ6zwDLiirBspWwHlSHLNv&amp;export=download"
curl -o lantern-traces.zip -L $ZIP_URL

unzip lantern-traces.zip
rm lantern-traces.zip
