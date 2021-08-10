/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert').strict;
const {LH_ROOT} = require('../root.js');

const distDir = path.join(LH_ROOT, 'dist', 'devtools', 'report-resources');

/**
 * Used to save cached resources (Runtime.cachedResources).
 * @param {string} name
 * @param {string} content
 */
function writeFile(name, content) {
  assert(content);
  fs.writeFileSync(`${distDir}/${name}`, content);
}

async function main() {
  fs.mkdirSync(distDir, {recursive: true}); // Ensure dist is present, else rmdir will throw. COMPAT: when dropping Node 12, replace with fs.rm(p, {force: true})
  fs.rmdirSync(distDir, {recursive: true});
  fs.mkdirSync(distDir, {recursive: true});

  // TODO(esmodules): static import when build/ is esm.
  const htmlReportAssets = await import('../report/report-assets.js');
  writeFile('report.js', htmlReportAssets.REPORT_JAVASCRIPT);
  writeFile('report.css', htmlReportAssets.REPORT_CSS);
  writeFile('standalone-template.html', htmlReportAssets.REPORT_TEMPLATE);
  writeFile('report.d.ts', 'export {}');
}

main();
