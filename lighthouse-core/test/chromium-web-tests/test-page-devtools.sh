#!/usr/bin/env bash

##
# @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
# Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
# Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
##

# USAGE:
#
# URL list file: yarn run-devtools < lighthouse-core/scripts/gcp-collection/urls.txt
#                yarn run-devtools lighthouse-core/scripts/gcp-collection/urls.txt
# Single URL: echo "https://example.com" | yarn run-devtools
#

set -euo pipefail

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

WEB_TEST_DIR="$DEVTOOLS_PATH/test/webtests/http/tests/devtools/lighthouse-run"

# Remove any tests leftover from previous run.
if [ -d "$WEB_TEST_DIR" ]; then
  rm -rf "$WEB_TEST_DIR"
fi
mkdir -p "$WEB_TEST_DIR"

echo "Creating test files for URLs"
COUNTER=0
while read url; do
  [[ -z $url || ${url:0:1} == "#" ]] && continue
  echo "
  (async function() {
    await TestRunner.navigatePromise('$url');

    await TestRunner.loadModule('lighthouse_test_runner');
    await TestRunner.showPanel('lighthouse');

    LighthouseTestRunner.getRunButton().click();
    const {lhr} = await LighthouseTestRunner.waitForResults();
    TestRunner.addResult(JSON.stringify(lhr));

    TestRunner.completeTest();
  })();
  " > "$WEB_TEST_DIR/lighthouse-run-$COUNTER.js"
  COUNTER=$[$COUNTER +1]
done <"${1:-/dev/stdin}"

set +e
bash "$SCRIPT_DIR/web-test-server.sh" \
  --no-show-results \
  --no-retry-failures \
  --time-out-ms=60000 \
  --additional-driver-flag=--disable-blink-features=TrustTokens,TrustTokensAlwaysAllowIssuance \
  http/tests/devtools/lighthouse-run
set -e

OUTPUT_DIR="$LH_ROOT/latest-run/devtools-lhrs" 
if [ -d "$OUTPUT_DIR" ]; then
  rm -rf "$OUTPUT_DIR"
fi
mkdir -p "$OUTPUT_DIR"

# Copy results to latest-run folder.
# Sometimes there will be extra output before the line with LHR. To get around this, only copy the last line with content.
COUNTER=0
for file in "$LH_ROOT/.tmp/layout-test-results/http/tests/devtools/lighthouse-run"/lighthouse-run-*-actual.txt; do
  grep "lighthouseVersion" -m 1 "$file" > "$OUTPUT_DIR/devtools-lhr-$COUNTER.json" 
  COUNTER=$[$COUNTER +1]
done

echo "Open the LHRs at $OUTPUT_DIR"
