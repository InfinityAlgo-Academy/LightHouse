#!/usr/bin/env bash

##
# @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
# Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
# Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
##

set -euo pipefail

if [ -z "$1" ]; then
    echo "ERROR: No URL provided."
    exit 1
fi

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
export LH_ROOT="$( cd "$SCRIPT_DIR/../../.." && pwd )"

# Setup dependencies.
TEST_DIR="$LH_ROOT/.tmp/chromium-web-tests"
export DEPOT_TOOLS_PATH="$TEST_DIR/depot-tools"
export DEVTOOLS_PATH=${DEVTOOLS_PATH:-"$TEST_DIR/devtools/devtools-frontend"}
export BLINK_TOOLS_PATH="$TEST_DIR/blink_tools"
export PATH=$DEPOT_TOOLS_PATH:$PATH

bash "$SCRIPT_DIR/download-depot-tools.sh"
bash "$SCRIPT_DIR/download-devtools.sh"
bash "$SCRIPT_DIR/download-blink-tools.sh"
bash "$SCRIPT_DIR/download-content-shell.sh"

bash "$SCRIPT_DIR/roll-devtools.sh"

# Add test to run lighthouse in DevTools and print LHR.
echo "
(async function() {
  await TestRunner.navigatePromise('$1');

  await TestRunner.loadModule('lighthouse_test_runner');
  await TestRunner.showPanel('lighthouse');

  LighthouseTestRunner.getRunButton().click();
  const {lhr} = await LighthouseTestRunner.waitForResults();
  TestRunner.addResult(JSON.stringify(lhr));

  TestRunner.completeTest();
})();
" > "$DEVTOOLS_PATH/test/webtests/http/tests/devtools/lighthouse/lighthouse-run-dt.js"

set +e
bash "$SCRIPT_DIR/web-test-server.sh" --no-show-results --time-out-ms=60000 http/tests/devtools/lighthouse/lighthouse-run-dt.js
set -e

# Copy results to latest-run folder.
# Sometimes there will be extra output before the line with LHR. To get around this, only copy the last line with content.
grep "lighthouseVersion" -m 1 \
"$LH_ROOT/.tmp/layout-test-results/http/tests/devtools/lighthouse/lighthouse-run-dt-actual.txt" \
> "$LH_ROOT/latest-run/devtools-lhr.json" 

echo "Open the LHR at $LH_ROOT/latest-run/devtools-lhr.json"
