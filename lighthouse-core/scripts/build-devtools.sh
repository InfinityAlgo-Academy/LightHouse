#!/usr/bin/env bash

set -euo pipefail

##
# @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
# Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
# Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
##

# 1) Builds Lighthouse bundle for DevTools
# 2) Rolls to local devtools repo. By default, this is the temporary checkout in .tmp
# 3) Builds devtools frontend with new Lighthouse roll
# 
# Run `bash lighthouse-core/test/chromium-web-tests/setup.sh` first to update the temporary devtools checkout.
# Specify `$DEVTOOLS_PATH` to use a different devtools repo.

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
LH_ROOT="$SCRIPT_DIR/../.."
TEST_DIR="$LH_ROOT/.tmp/chromium-web-tests"
DEFAULT_DEVTOOLS_PATH="$TEST_DIR/devtools/devtools-frontend"
DEVTOOLS_PATH=${DEVTOOLS_PATH:-"$DEFAULT_DEVTOOLS_PATH"}

echo "DEVTOOLS_PATH: $DEVTOOLS_PATH"

if [ ! -d "$DEVTOOLS_PATH" ]; then
  echo "No devtools found at $DEVTOOLS_PATH."
  if [ "$DEVTOOLS_PATH" = "$DEFAULT_DEVTOOLS_PATH" ]; then
    echo "Have you run 'yarn test-devtools' yet?"
  fi

  exit 1
fi

if ! which gn ; then
  # If the contributor doesn't have a separate depot tools in their path, use the tmp copy.
  DEPOT_TOOLS_PATH="$TEST_DIR/depot-tools"
  BLINK_TOOLS_PATH="$TEST_DIR/blink_tools"
  export PATH=$DEPOT_TOOLS_PATH:$PATH
  # Add typ to python path. The regular method assumes there is a Chromium checkout.
  export PYTHONPATH="${PYTHONPATH:-}:$BLINK_TOOLS_PATH/latest/third_party/typ"
fi

yarn devtools "$DEVTOOLS_PATH"

cd "$DEVTOOLS_PATH"
gn gen out/Default
gclient sync
autoninja -C out/Default
