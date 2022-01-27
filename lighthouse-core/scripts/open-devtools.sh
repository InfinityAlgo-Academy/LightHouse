#!/usr/bin/env bash

set -euo pipefail

##
# @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
# Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
# Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
##

# 1) Builds DevTools with current Lighthouse
# 2) Opens $CHROME_PATH using new devtools frontend build, passing any additional args to Chrome.
#
# Specify `$DEVTOOLS_PATH` to use a different devtools repo.

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
LH_ROOT="$SCRIPT_DIR/../.."

if [ -z "${CHROME_PATH:-}" ]; then
  echo 'Must set $CHROME_PATH'
  exit 1
fi

# If using the default .tmp devtools checkout, make sure it's up to date first.
if [ -z "${DEVTOOLS_PATH:-}" ]; then
  source "$LH_ROOT/lighthouse-core/test/chromium-web-tests/setup.sh"
fi

echo "CHROME_PATH: $CHROME_PATH"

bash "$LH_ROOT/lighthouse-core/scripts/build-devtools.sh"

"$CHROME_PATH" --custom-devtools-frontend=file://"$DEVTOOLS_PATH"/out/Default/gen/front_end $*
