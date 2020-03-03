/**
 * @license Copyright 2020 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const makeComputedArtifact = require('./computed-artifact.js');
const NetworkRecords = require('./network-records.js');
const URL = require('../lib/url-shim.js');

/** @typedef {{count: number, size: number}} ResourceEntry */
class OriginSummary {
  /**
   * @param {Array<LH.Artifacts.NetworkRequest>} networkRecords
   * @return {Record<string,ResourceEntry>}
   */
  static summarize(networkRecords) {
    /** @type {Record<string,ResourceEntry>} */
    const resourceSummary = {
      total: {count: 0, size: 0},
    };

    for (const record of networkRecords) {
      const origin = URL.getOrigin(record.url);
      if (!origin) continue;
      if (!resourceSummary[origin]) {
        resourceSummary[origin] = {count: 0, size: 0};
      }
      resourceSummary[origin].count++;
      resourceSummary[origin].size += record.transferSize;

      resourceSummary.total.count++;
      resourceSummary.total.size += record.transferSize;
    }
    return resourceSummary;
  }

  /**
   * @param {LH.DevtoolsLog} devtoolsLog
   * @param {LH.Audit.Context} context
   * @return {Promise<Record<string,ResourceEntry>>}
   */
  static async compute_(devtoolsLog, context) {
    const networkRecords = await NetworkRecords.request(devtoolsLog, context);
    return OriginSummary.summarize(networkRecords);
  }
}

module.exports = makeComputedArtifact(OriginSummary);
