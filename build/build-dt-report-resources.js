/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const browserify = require('browserify');
const fs = require('fs');
const path = require('path');
const rimraf = require('rimraf');
const assert = require('assert');

const distDir = path.join(__dirname, '..', 'dist', 'dt-report-resources');
const bundleOutFile = `${distDir}/report-generator.js`;
const generatorFilename = `./lighthouse-core/report/report-generator.js`;
const htmlReportAssets = require('../lighthouse-core/report/html/html-report-assets.js');

/**
 * Used to save cached resources (Runtime.cachedResources). Content must be converted to ascii.
 * @param {string} name
 * @param {string} content
 */
function convertToAsciiAndWriteFile(name, content) {
  assert(content);
  // eslint-disable-next-line no-control-regex
  const escaped = content.replace(/[^\x00-\x7F]/g, c => '\\\\u' + c.charCodeAt(0).toString(16));
  fs.writeFileSync(`${distDir}/${name}`, escaped);
}

rimraf.sync(distDir);
fs.mkdirSync(distDir);

convertToAsciiAndWriteFile('report.js', htmlReportAssets.REPORT_JAVASCRIPT);
convertToAsciiAndWriteFile('report.css', htmlReportAssets.REPORT_CSS);
convertToAsciiAndWriteFile('template.html', htmlReportAssets.REPORT_TEMPLATE);
convertToAsciiAndWriteFile('templates.html', htmlReportAssets.REPORT_TEMPLATES);

const pathToReportAssets = require.resolve('../clients/devtools-report-assets.js');
browserify(generatorFilename, {standalone: 'Lighthouse.ReportGenerator'})
  // Shims './html/html-report-assets' to resolve to devtools-report-assets.
  .require(pathToReportAssets, {expose: './html/html-report-assets'})
  .bundle((err, src) => {
    if (err) throw err;
    fs.writeFileSync(bundleOutFile, src.toString());
  });
