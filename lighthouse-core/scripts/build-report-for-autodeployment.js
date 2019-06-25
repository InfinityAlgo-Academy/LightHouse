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
const mkdirp = require('mkdirp').sync;
const swapLocale = require('../lib/i18n/swap-locale.js');

const ReportGenerator = require('../../lighthouse-core/report/report-generator.js');
const lhr = /** @type {LH.Result} */ (require('../../lighthouse-core/test/results/sample_v2.json'));

const DIST = path.join(__dirname, `../../dist`);

// Add a plugin to demo plugin rendering.
lhr.categories['lighthouse-plugin-someplugin'] = {
  id: 'lighthouse-plugin-someplugin',
  title: 'Plugin',
  score: 0.5,
  auditRefs: [],
};

(async function() {
  const filenameToLhr = {
    'english': lhr,
    'espanol': swapLocale(lhr, 'es').lhr,
    'arabic': swapLocale(lhr, 'ar').lhr,
  };

  mkdirp(DIST);

  // Generate and write reports
  Object.entries(filenameToLhr).forEach(([filename, lhr]) => {
    let html = ReportGenerator.generateReportHtml(lhr);
    for (const variant of ['', '-devtools']) {
      if (variant === '-devtools') {
        html = html.replace(`"lh-root lh-vars"`, `"lh-root lh-vars lh-devtools"`)
      }
      const filepath = `${DIST}/${filename}${variant}/index.html`;
      mkdirp(path.dirname(filepath));
      fs.writeFileSync(filepath, html, {encoding: 'utf-8'});
      console.log('✅', filepath, 'written.');
    }
  });
})();
