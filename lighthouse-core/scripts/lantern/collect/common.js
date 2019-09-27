/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/** @typedef {{devtoolsLog?: string, lhr: string, trace: string}} Result */
/** @typedef {{url: string, wpt: Result[], unthrottled: Result[]}} Summary */

const fs = require('fs');
const {promisify} = require('util');
const archiver = require('archiver');
const streamFinished = promisify(require('stream').finished);

const LH_ROOT = `${__dirname}/../../../..`;
const collectFolder = `${LH_ROOT}/dist/collect-lantern-traces`;
const summaryPath = `${collectFolder}/summary.json`;
const goldenFolder = `${LH_ROOT}/dist/golden-lantern-traces`;

/**
 * @param {string} archiveDir
 * @param {string} outputPath
 */
function archive(archiveDir, outputPath) {
  const archive = archiver('zip', {
    zlib: {level: 9},
  });

  const writeStream = fs.createWriteStream(outputPath);
  archive.pipe(writeStream);
  archive.directory(archiveDir, false);
  archive.finalize();
  return streamFinished(archive);
}

/**
 * @return {Summary[]}
 */
function loadSummary() {
  if (fs.existsSync(summaryPath)) {
    return JSON.parse(fs.readFileSync(summaryPath, 'utf-8'));
  } else {
    return [];
  }
}

/**
 * @param {Summary[]} summary
 */
function saveSummary(summary) {
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
}

module.exports = {
  collectFolder,
  goldenFolder,
  archive,
  loadSummary,
  saveSummary,
};
