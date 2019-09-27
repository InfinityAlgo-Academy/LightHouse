/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/** @typedef {import('./common.js').Result} Result */
/** @typedef {import('./common.js').Summary} Summary */

const fs = require('fs');
const rimraf = require('rimraf');
const common = require('./common.js');

/**
 * Returns run w/ the median TTI.
 * @param {Result[]} results
 */
function getMedianResult(results) {
  const resultsWithValue = [];
  for (const result of results) {
    const lhr = loadLhr(result.lhr);
    const metricsDetails = /** @type {LH.Audit.Details.DebugData=} */ (
      lhr.audits['metrics'].details);
    /** @type {import('../../../audits/metrics.js').UberMetricsItem} */
    const metrics = metricsDetails && metricsDetails.items && metricsDetails.items[0];
    if (!metrics || !metrics.interactive) {
      // eslint-disable-next-line no-console
      console.warn(`missing metrics: ${result.lhr}`);
      continue;
    }
    resultsWithValue.push({value: metrics.interactive, result});
  }
  resultsWithValue.sort((a, b) => a.value - b.value);

  if (resultsWithValue.length % 2 === 1) {
    return resultsWithValue[Math.floor(resultsWithValue.length / 2)].result;
  }

  // Select the value that is closest to the average.
  const average = resultsWithValue.reduce((acc, cur) => acc + cur.value, 0) / resultsWithValue.length;
  const a = resultsWithValue[Math.floor(resultsWithValue.length / 2)];
  const b = resultsWithValue[Math.floor(resultsWithValue.length / 2) + 1];
  return Math.abs(a.value - average) < Math.abs(b.value - average) ? a.result : b.result;
}

/**
 * @param {string} filename
 * @return {LH.Result}
 */
function loadLhr(filename) {
  return JSON.parse(fs.readFileSync(`${common.collectFolder}/${filename}`, 'utf-8'));
}

/**
 * @param {string} filename
 */
function copyToGolden(filename) {
  fs.copyFileSync(`${common.collectFolder}/${filename}`, `${common.goldenFolder}/${filename}`);
}

/**
 * @param {string} filename
 * @param {string} data
 */
function saveGoldenData(filename, data) {
  fs.writeFileSync(`${common.goldenFolder}/${filename}`, data);
}

async function main() {
  /** @type {Summary[]} */
  const summary = common.loadSummary();

  const golden = summary.map(({url, wpt, unthrottled}) => {
    return {
      url,
      wpt: getMedianResult(wpt),
      unthrottled: getMedianResult(unthrottled),
    };
  });

  rimraf.sync(common.goldenFolder);
  fs.mkdirSync(common.goldenFolder);
  saveGoldenData('golden.json', JSON.stringify(golden, null, 2));
  for (const result of golden) {
    const filenames = [...Object.values(result.wpt), ...Object.values(result.unthrottled)];
    for (const filename of filenames) {
      if (filename) copyToGolden(filename);
    }
  }

  await common.archive(common.goldenFolder);
}

main();
