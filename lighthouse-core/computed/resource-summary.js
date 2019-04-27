/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const makeComputedArtifact = require('./computed-artifact.js');
const NetworkRecords = require('./network-records.js');
const MainResource = require('./main-resource.js');
const URL = require('../lib/url-shim');
const Budget = require('../config/budget.js');

class ResourceSummary {
  /**
   * @param {LH.Artifacts.NetworkRequest} record
   * @return string
   */
  static determineResourceType(record) {
    switch (record.resourceType) {
      case 'Stylesheet':
      case 'Image':
      case 'Media':
      case 'Font':
      case 'Script':
      case 'Document':
        // budget.json uses lowercase for resource types
        return record.resourceType.toLowerCase();
      default:
        return 'other';
    }
  }

  /**
   * @param {Array<LH.Artifacts.NetworkRequest>} networkRecords
   * @param {string} mainResourceURL
   * @return {Object<string,{resourceType: string, count: number, size: number}>}
   */
  static summarize(networkRecords, mainResourceURL) {
    /** @type {Object<string,{resourceType: string, count: number, size: number}>} */
    const map = {};

    Budget.validResourceTypes().forEach(type => {
      map[type] = {count: 0, size: 0, resourceType: type};
    });

    for (const record of networkRecords) {
      const type = this.determineResourceType(record);
      map[type].count = map[type].count + 1;
      map[type].size = map[type].size + record.transferSize;

      map.total.count = map.total.count + 1;
      map.total.size = map.total.size + record.transferSize;

      if (!URL.rootDomainsMatch(record.url, mainResourceURL)) {
        map['third-party'].count = map['third-party'].count + 1;
        map['third-party'].size = map['third-party'].size + record.transferSize;
      }
    }
    return map;
  }

  /**
   * @param {{URL: LH.Artifacts['URL'], devtoolsLog: LH.DevtoolsLog}} data
   * @param {LH.Audit.Context} context
   * @return {Promise<Object<string,{resourceType: string, count: number, size: number}>>}
   */
  static async compute_(data, context) {
    const [networkRecords, mainResource] = await Promise.all([
      NetworkRecords.request(data.devtoolsLog, context),
      MainResource.request(data, context),
    ]);

    return ResourceSummary.summarize(networkRecords, mainResource.url);
  }
}

module.exports = makeComputedArtifact(ResourceSummary);
