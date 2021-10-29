#!/usr/bin/env bash

##
# @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
# Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
# Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
##

set -euxo pipefail

echo $*

node node_modules/.bin/c8 \
  --include '{lighthouse-core,lighthouse-cli,viewer,treemap,build/plugins,report,flow-report}' \
  --exclude third_party \
  --exclude '**/test/' \
  --exclude '**/scripts/' \
  --exclude 'lighthouse-core/lib/page-functions.js' \
  --exclude 'lighthouse-core/util-commonjs.js' \
  $*

# util-commonjs is a copy of renderer/util, which has its own test coverage.
# Admittedly, util-commonjs is used in different ways, but we don't expect it to also have complete
# coverage as some methods are renderer-specific.  Ideally, we'd combine the coverage, but in the
# meantime we'll ignore coverage requirements for this file.
