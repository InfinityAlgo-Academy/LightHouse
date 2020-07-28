#!/usr/bin/env bash

##
# @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
# Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
# Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
##

# Setup dependencies.
export DEPOT_TOOLS=~/tools/depot-tools
export DEVTOOLS_PATH=~/tmp/devtools/devtools-frontend
export BLINK_TOOLS_PATH=~/tmp/blink_tools
export PATH=$DEPOT_TOOLS_PATH:$PATH

bash lighthouse-core/scripts/chromium-web-tests/download-depot-tools.sh
bash lighthouse-core/scripts/chromium-web-tests/download-devtools.sh
bash lighthouse-core/scripts/chromium-web-tests/download-blink-tools.sh
node lighthouse-core/scripts/chromium-web-tests/download-content-shell.js

# Run web tests.
bash lighthouse-core/scripts/chromium-web-tests/run-web-tests.sh

# Reset the results.
bash lighthouse-core/scripts/chromium-web-tests/run-web-tests.sh --reset-results
