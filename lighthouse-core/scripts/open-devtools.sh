#!/usr/bin/env bash

set -euo pipefail

##
# @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
# Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
# Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
##

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
LH_ROOT="$SCRIPT_DIR/../.."
TEST_DIR="$LH_ROOT/.tmp/chromium-web-tests"
DEFAULT_DEVTOOLS_PATH="$TEST_DIR/devtools/devtools-frontend"
DEVTOOLS_PATH=${DEVTOOLS_PATH:-"$DEFAULT_DEVTOOLS_PATH"}

if [ -z "${CHROME_PATH:-}" ]; then
  echo 'Must set $CHROME_PATH'
  exit 1
fi

echo "CHROME_PATH: $CHROME_PATH"
echo "DEVTOOLS_PATH: $DEVTOOLS_PATH"

if [ ! -d "$DEVTOOLS_PATH" ]; then
  echo "No devtools found at $DEVTOOLS_PATH. Have you run 'yarn test-devtools' yet?"
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

yarn build-devtools
yarn devtools "$DEVTOOLS_PATH"

cd "$DEVTOOLS_PATH"
gn gen out/Default
gclient sync
autoninja -C out/Default

"$CHROME_PATH" --custom-devtools-frontend=file://"$DEVTOOLS_PATH"/out/Default/resources/inspector $*
