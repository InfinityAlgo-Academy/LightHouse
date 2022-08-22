#!/usr/bin/env bash

##
# @license Copyright 2022 The Lighthouse Authors. All Rights Reserved.
# Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
# Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
##

# Runs the devtools e2e tests in third-party/devtools-tests using the latest
# Lighthouse and DevTools

set -euo pipefail

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

source "$SCRIPT_DIR/setup.sh"
bash "$SCRIPT_DIR/roll-devtools.sh"
bash "$SCRIPT_DIR/run-e2e-tests.sh" $*
