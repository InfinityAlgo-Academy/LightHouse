/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

const fs = require('fs');
const ReportGenerator = require('../../../../report/report-generator.js');
const sampleResults = require('../../../../../lighthouse-core/test/results/sample_v2.json');
const purify = require('purify-css');
const jsdom = require('jsdom');

/* eslint-disable no-console */
function captureConsoleLog(fn) {
  const outputData = [];
  const originalLog = console.log;
  console.log = (...inputs) => (outputData.push(...inputs));
  try {
    fn();
  } finally {
    console.log = originalLog;
  }
  return outputData.join('\n');
}
/* eslint-enable no-console */

it('test purifycss behavior', () => {
  const options = {
    rejected: true,
  };

  const html = '<div class="keep-me">';

  const failingLog = captureConsoleLog(() => purify(html, '.delete-me {}', options));
  expect(failingLog).toContain('PurifyCSS - Rejected selectors');

  const passingLog = captureConsoleLog(() => purify(html, '.keep-me {}', options));
  expect(passingLog).not.toContain('PurifyCSS - Rejected selectors');
});

it('report contains no unused styles', () => {
  // Purifycss will grok the HTML input for words, and use that to determine
  // what selectors are used. Since the report generator injects the entire
  // stylesheet, it must be removed. Otherwise, Purifycss will always report
  // nothing is unused.
  const htmlOutput = ReportGenerator.generateReport(sampleResults, 'html');
  const page = new jsdom.JSDOM(htmlOutput);
  for (const styleEl of page.window.document.querySelectorAll('style')) {
    styleEl.remove();
  }
  const unstyledHtml = page.serialize();

  const reportCssPath = require.resolve('../../../../report/html/report-styles.css');
  const css = fs.readFileSync(reportCssPath, 'utf-8');
  const options = {
    rejected: true,
  };
  const log = captureConsoleLog(() => purify(unstyledHtml, css, options));
  expect(log).not.toContain('PurifyCSS - Rejected selectors');
});
