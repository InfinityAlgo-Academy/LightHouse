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
const replaceLHRLocale = require('./i18n/swap-in-new-locale.js');

const ReportGenerator = require('../../lighthouse-core/report/report-generator.js');
const lhr = /** @type {LH.Result} */ (require('../../lighthouse-core/test/results/sample_v2.json'));

(async function() {
  const filenameToLhr = {
    'index.ar.html': replaceLHRLocale(JSON.parse(JSON.stringify(lhr)), 'ar'),
    // Last file to be written is served as the root
    'index.html': lhr,
  };

  // Generate and write reports
  Object.entries(filenameToLhr).forEach(([filename, lhr]) => {
    const html = ReportGenerator.generateReport(lhr, 'html');
    const filepath = path.join(__dirname, `../../dist/${filename}`);
    fs.writeFileSync(filepath, html, {encoding: 'utf-8'});
    console.log('✅', filepath, 'written.');
  });
})();
