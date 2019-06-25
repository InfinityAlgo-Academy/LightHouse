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
const GatherRunner = require('../gather/gather-runner.js');
const {defaultSettings} = require('../config/constants.js');
const lighthouse = require('../index.js');
const lhr = /** @type {LH.Result} */ (require('../../lighthouse-core/test/results/sample_v2.json'));

const DIST = path.join(__dirname, `../../dist/`);

(async function() {
  addPluginCategory(lhr);
  const errorLhr = await generateErrorLHR();

  const filenameToLhr = {
    english: lhr,
    espanol: swapLocale(lhr, 'es').lhr,
    arabic: swapLocale(lhr, 'ar').lhr,
    error: errorLhr,
  };

  // Generate and write reports
  Object.entries(filenameToLhr).forEach(([filename, lhr]) => {
    let html = ReportGenerator.generateReportHtml(lhr);
    // TODO: PSI is another variant to consider
    for (const variant of ['', '-devtools']) {
      if (variant === '-devtools') {
        // TODO: Make the DevTools Audits panel "emulation" more comprehensive
        html = html.replace(`"lh-root lh-vars"`, `"lh-root lh-vars lh-devtools"`);
      }
      const filepath = `${DIST}${filename}${variant}/index.html`;
      mkdirp(path.dirname(filepath));
      fs.writeFileSync(filepath, html, {encoding: 'utf-8'});
      console.log('✅', filepath, 'written.');
    }
  });
})();

/**
 * Add a plugin to demo plugin rendering.
 * @param {LH.Result} lhr
 */
function addPluginCategory(lhr) {
  lhr.categories['lighthouse-plugin-someplugin'] = {
    id: 'lighthouse-plugin-someplugin',
    title: 'Plugin',
    score: 0.5,
    auditRefs: [],
  };
}
/**
 * Generate an LHR with errors for the renderer to display
 * We'll write an "empty" artifacts file to disk, only to use it in auditMode
 * @return {Promise<LH.Result>}
 */
async function generateErrorLHR() {
  const url = 'http://fakeurl.com';
  const options = {
    requestedUrl: url,
    settings: defaultSettings,
    driver: {
      getBrowserVersion: () => ({userAgent: 'Mozilla/5.0 ErrorUserAgent Chrome/66'}),
    },
  };
  //@ts-ignore driver isn't mocked out completely
  const artifacts = await GatherRunner.initializeBaseArtifacts(options);

  const TMP = `${DIST}/.tmp/`;
  mkdirp(TMP);
  fs.writeFileSync(`${TMP}/artifacts.json`, JSON.stringify(artifacts), 'utf-8');
  const errorRunnerResult = await lighthouse(url, {auditMode: TMP});
  return /** @type {LH.RunnerResult} */ (errorRunnerResult).lhr;
}
