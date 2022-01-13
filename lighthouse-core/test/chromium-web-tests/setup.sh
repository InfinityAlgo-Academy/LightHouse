#!/usr/bin/env bash

##
# @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
# Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
# Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
##

# Setup dependencies for local layout test runner.
# Set SKIP_DOWNLOADS to skip all the downloading and just export variables.

set -euo pipefail

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
LH_ROOT="$SCRIPT_DIR/../../.."
TEST_DIR="$LH_ROOT/.tmp/chromium-web-tests"

export DEPOT_TOOLS_PATH="$TEST_DIR/depot-tools"
export DEVTOOLS_PATH=${DEVTOOLS_PATH:-"$TEST_DIR/devtools/devtools-frontend"}
export BLINK_TOOLS_PATH="$TEST_DIR/blink_tools"
export PATH=$DEPOT_TOOLS_PATH:$PATH

if [ -z ${SKIP_DOWNLOADS+x} ]
then
  echo "========================================"
  echo "Downloading dependencies, including latest content_shell and DevTools"
  echo "To skip this step, set SKIP_DOWNLOADS=1"
  echo "========================================"
  echo

  bash "$SCRIPT_DIR/download-depot-tools.sh"
  bash "$SCRIPT_DIR/download-devtools.sh"
  bash "$SCRIPT_DIR/download-blink-tools.sh"
  bash "$SCRIPT_DIR/download-content-shell.sh"
fi
