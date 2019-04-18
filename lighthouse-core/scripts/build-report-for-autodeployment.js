#!/usr/bin/env node

/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const {runLighthouse} = require('../../lighthouse-cli/run.js');

const ReportGenerator = require('../../lighthouse-core/report/report-generator.js');
const v2 = /** @type {LH.Result} */ (require('../../lighthouse-core/test/results/sample_v2.json'));

(async function() {
  const flags = {
    auditMode: './lighthouse-core/test/results/artifacts',
    throttlingMethod: 'devtools',
    output: [],
  };
  // @ts-ignore
  const runnerResultAr = await runLighthouse(undefined, {locale: 'ar', ...flags}, undefined);

  const filenameSlugToLHR = {
    'index': v2,
    'index.ar': runnerResultAr.lhr,
  };

  // Generate and write reports
  Object.entries(filenameSlugToLHR).forEach(([slug, lhr]) => {
    const html = ReportGenerator.generateReport(lhr, 'html');
    const filename = path.join(__dirname, `../../dist/${slug}.html`);
    fs.writeFileSync(filename, html, {encoding: 'utf-8'});
    console.log('✅', filename, 'written.');
  });
})();
