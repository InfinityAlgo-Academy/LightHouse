/**
 * @license Copyright 2032 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

require('../../clients/devtools-entry.js');
const ReportGenerator = require('../../report/generator/report-generator.js');


// If invoked as CLI, we're gonna read latest-run's trace and analyze that (as desktop)
if (require.main !== module) {
  console.error('Must invoke as CLI');
}

/** @type {LH.Trace} */
const trace = JSON.parse(
  // Gather with:
  //     lighthouse https://www.theverge.com/ --preset=desktop --only-categories=performance -GA --throttling-method=devtools
    require('fs').readFileSync(__dirname + '/../../latest-run/defaultPass.trace.json', 'utf8')
);

/**
   * @param {LH.Trace} trace
   */
const getInitialUrl = trace => {
  // TODO: this technique is wrong. it broke on the rv camping site.
  const urls = trace.traceEvents
  .filter(e =>
      (e.name === 'navigationStart' && e?.args?.data?.isLoadingMainFrame === true) ||
      e.name === 'NavigationBodyLoader::StartLoadingBody'
  )
  .map(e => e.args.data?.documentLoaderURL || e.args.url);
  // find most common item: https://stackoverflow.com/a/20762713/89484
  return urls.sort(
    (a, b) => urls.filter(v => v === a).length - urls.filter(v => v === b).length).pop();
};

// @ts-expect-error
global.analyzeTrace(trace, {
  device: 'desktop',
  url: getInitialUrl(trace),
}).then(runnerResult => {
  const json = JSON.stringify(runnerResult.lhr, 2, null);
  const html = ReportGenerator.generateReportHtml(runnerResult.lhr);

  require('fs').writeFileSync('./tracereport.json', json, 'utf8');
  require('fs').writeFileSync('./tracereport.html', html, 'utf8');
  console.log('done. written to ./tracereport.html');
});


// find clients/ lighthouse-core/ lighthouse-core/audits/metrics/ -iname "*.js" | grep -v test | entr bash -c "node clients/devtools-entry.js && node lighthouse-core/scripts/cleanup-LHR-for-diff.js ./tracereport.json && git --no-pager diff --no-index --color=always ./tracereport-base.json ./tracereport.json; echo 'done' "

/**
 * See also:
 *     node lighthouse-core/test/lib/network-records-from-trace-test.js
 * which compares the network requests we constructed from trace compared to the dtlog ones.
 * it currently only tests 1 netreq at a time.
 */

/**
 * todo:
 * - removal of devtoolsLog from requiredArtifacts when its unused now
 */

