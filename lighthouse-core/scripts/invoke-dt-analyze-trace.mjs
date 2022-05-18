/**
 * @license Copyright 2022 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import fs from 'fs';

import '../../clients/devtools/devtools-entry.js';
import ReportGenerator from '../../report/generator/report-generator.js';
import {LH_ROOT} from '../../root.js';

/** @type {LH.Trace} */
const trace = JSON.parse(
  // Gather with:
  //     lighthouse https://www.nytimes.com --preset=desktop --only-categories=performance -GA --throttling-method=devtools
  fs.readFileSync(`${LH_ROOT}/latest-run/defaultPass.trace.json`, 'utf8')
);

// @ts-expect-error
global.analyzeTrace(trace, {
  device: 'desktop',
  url: 'https://placeholder.url',
}).then(runnerResult => {
  const json = JSON.stringify(runnerResult.lhr, 2, null);
  const html = ReportGenerator.generateReportHtml(runnerResult.lhr);

  fs.writeFileSync('./tracereport.json', json, 'utf8');
  fs.writeFileSync('./tracereport.html', html, 'utf8');
  console.log('done. written to ./tracereport.html');
});


// find clients/ lighthouse-core/ lighthouse-core/audits/metrics/ -iname "*.js" | grep -v test | entr bash -c "node clients/devtools-entry.js && node lighthouse-core/scripts/cleanup-LHR-for-diff.js ./tracereport.json && git --no-pager diff --no-index --color=always ./tracereport-base.json ./tracereport.json; echo 'done' "

/**
 * See also:
 *     yarn jest lighthouse-core/test/lib/network-records-from-trace-test.js
 * which compares the network requests we constructed from trace compared to the dtlog ones.
 * it currently only tests 1 netreq at a time.
 */

/**
 * todo:
 * - removal of devtoolsLog from requiredArtifacts when its unused now
 */

