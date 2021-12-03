#!/usr/bin/env bash

##
# @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
# Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
# Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
##

set -euo pipefail

roll_devtools() {
  # Roll devtools. Besides giving DevTools the latest lighthouse source files,
  # this also copies over the webtests.
  cd "$LH_ROOT"
  yarn devtools "$DEVTOOLS_PATH"
  cd -
}

cd "$DEVTOOLS_PATH"
git --no-pager log -1
roll_devtools
# Build devtools. The creates `out/Default/gen/front_end`,
# which is served as `inspector-sources` by the webtests server.
autoninja -C out/Default
cd -
