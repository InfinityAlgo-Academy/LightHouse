#!/usr/bin/env bash

##
# @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
# Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
# Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
##

# Do not use directly. Requires setting up multiple environment variables first,
# see test-locally.sh for example.

set -u

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
export LH_ROOT="$SCRIPT_DIR/../../.."

bash "$SCRIPT_DIR/web-test-server.sh" http/tests/devtools/lighthouse $*
status=$?

if [ ! $status -eq 0 ]; then
  # Print failure diffs to stdout.
  find "$LH_ROOT/.tmp/layout-test-results/retry_3" -name '*-diff.txt' -exec cat {} \;
  echo "❌❌❌ webtests failed. to rebaseline run: yarn update:test-devtools ❌❌❌"
fi

exit $status
