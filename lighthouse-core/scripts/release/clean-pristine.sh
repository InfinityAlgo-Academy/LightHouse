#!/usr/bin/env bash

DIRNAME="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
LH_ROOT="$DIRNAME/../../.."
cd $LH_ROOT

set -euxo pipefail

# Setup a pristine git environment
cd ../lighthouse-pristine

if [[ -z "$(git status --porcelain)" ]]; then
  echo "Pristine repo already clean!"
  exit 0
fi

git clean -fx
