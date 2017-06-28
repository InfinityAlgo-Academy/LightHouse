/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('./audit');
const Util = require('../report/v2/renderer/util');
const URL = require('../lib/url-shim');

const TTFB_THRESHOLD = 200;
const TTFB_THRESHOLD_BUFFER = 15;

class TTFBMetric extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Performance',
      name: 'time-to-firstbyte',
      description: 'Time To First Byte (TTFB)',
      informative: true,
      helpText: 'Time To First Byte identifies the time at which your server sends a response.' +
        '[Learn more](https://developers.google.com/web/tools/chrome-devtools/network-performance/issues).',
      requiredArtifacts: ['networkRecords']
    };
  }

  static caclulateTTFB(record) {
    const timing = record._timing;

    return timing.receiveHeadersEnd - timing.sendEnd;
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    const networkRecords = artifacts.networkRecords[Audit.DEFAULT_PASS];
    const results = [];
    const walk = (node) => {
      const children = Object.keys(node);

      children.forEach(id => {
        const child = node[id];

        const networkRecord = networkRecords.find(record => record._requestId === id);

        if (networkRecord) {
          const ttfb = TTFBMetric.caclulateTTFB(networkRecord);
          results.push({
            url: URL.getURLDisplayName(networkRecord._url),
            ttfb: Util.formatMilliseconds(Math.round(ttfb), 1),
            rawTTFB: ttfb
          });
        }

        if (child.children) {
          walk(child.children);
        }
      });
    };

    return artifacts.requestCriticalRequestChains(networkRecords).then(tree => {
      walk(tree);

      const recordsOverBudget = results.filter(row =>
          row.rawTTFB > TTFB_THRESHOLD + TTFB_THRESHOLD_BUFFER);
      let displayValue;

      if (recordsOverBudget.length) {
        const thresholdDisplay = Util.formatMiliseconds(TTFB_THRESHOLD, 1);
        const recordsOverBudgetDisplay = Util.formatNumber(recordsOverBudget.length);
        displayValue = `${recordsOverBudgetDisplay} critical request(s) went over` +
          ` the ${thresholdDisplay} threshold`;
      }

      return {
        rawValue: recordsOverBudget.length === 0,
        displayValue,
        extendedInfo: {
          value: {
            results,
            tableHeadings: {
              url: 'Request URL',
              ttfb: 'Time To First Byte',
            },
          },
        },
      };
    });
  }
}

module.exports = TTFBMetric;
