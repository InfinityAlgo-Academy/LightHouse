#!/usr/bin/env bash

##
# @license Copyright 2017 Google Inc. All Rights Reserved.
# Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
# Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
##

# usage:

#   yarn devtools

# with a custom devtools front_end location:
#   yarn devtools node_modules/temp-devtoolsfrontend/front_end/

chromium_dir="$HOME/chromium/src"

if [[ -n "$1" ]]; then
  frontend_dir="$1"
else
  frontend_dir="$chromium_dir/third_party/blink/renderer/devtools/front_end"
fi

if [[ ! -d "$frontend_dir" || ! -a "$frontend_dir/Runtime.js" ]]; then
  echo -e "\033[31m✖ Error!\033[39m"
  echo "This script requires a devtools frontend folder. We didn't find one here:"
  echo "    $frontend_dir"
  exit 1
else
  echo -e "\033[96m ✓\033[39m Chromium folder in place."
fi

report_dir="lighthouse-core/report"
fe_lh_dir="$frontend_dir/audits2/lighthouse"

lh_bg_js="dist/lighthouse-dt-bundle.js"
lh_worker_dir="$frontend_dir/audits2_worker/lighthouse"

# copy report files
cp -pPR $report_dir/report-generator.js "$fe_lh_dir"
cp -pPR $report_dir/html/renderer "$fe_lh_dir"
# import report assets
node -e "
  const fs = require('fs');
  const htmlReportAssets = require('./lighthouse-core/report/html/html-report-assets.js');
  for (const [name, content] of Object.entries(htmlReportAssets)) {
    const unicodeEscaped = content.replace(/[^\x00-\x7F]/g, c => '\\\\u' + c.charCodeAt(0).toString(16));
    fs.writeFileSync('$fe_lh_dir/' + name, unicodeEscaped, 'ascii');
  }
"
echo -e "\033[32m ✓\033[39m Report renderer files copied."

# copy lighthouse-dt-bundle (potentially stale)
cp -pPR "$lh_bg_js" "$lh_worker_dir/lighthouse-dt-bundle.js"
echo -e "\033[96m ✓\033[39m (Potentially stale) lighthouse-dt-bundle copied."
