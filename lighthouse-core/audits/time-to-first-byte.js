/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('./audit');

const TTFB_THRESHOLD = 600;

class TTFBMetric extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'time-to-first-byte',
      title: 'Keep server response times low (TTFB)',
      description: 'Time To First Byte identifies the time at which your server sends a response.' +
        ' [Learn more](https://developers.google.com/web/tools/lighthouse/audits/ttfb).',
      requiredArtifacts: ['devtoolsLogs', 'URL'],
    };
  }

  /**
   * @param {LH.Artifacts.NetworkRequest} record
   */
  static caclulateTTFB(record) {
    const timing = record.timing;
    return timing ? timing.receiveHeadersEnd - timing.sendEnd : 0;
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @return {Promise<LH.Audit.Product>}
   */
  static audit(artifacts) {
    const devtoolsLogs = artifacts.devtoolsLogs[Audit.DEFAULT_PASS];

    return artifacts.requestNetworkRecords(devtoolsLogs)
      .then((networkRecords) => {
        /** @type {LH.Audit.DisplayValue} */
        let displayValue = '';

        const finalUrl = artifacts.URL.finalUrl;
        const finalUrlRequest = networkRecords.find(record => record.url === finalUrl);
        if (!finalUrlRequest) {
          throw new Error(`finalUrl '${finalUrl} not found in network records.`);
        }
        const ttfb = TTFBMetric.caclulateTTFB(finalUrlRequest);
        const passed = ttfb < TTFB_THRESHOLD;

        if (!passed) {
          displayValue = ['Root document took %10d', ttfb];
        }

        /** @type {LH.Result.Audit.OpportunityDetails} */
        const details = {
          type: 'opportunity',
          overallSavingsMs: ttfb - TTFB_THRESHOLD,
          headings: [],
          items: [],
        };

        return {
          rawValue: ttfb,
          score: Number(passed),
          displayValue,
          details,
          extendedInfo: {
            value: {
              wastedMs: ttfb - TTFB_THRESHOLD,
            },
          },
        };
      });
  }
}

module.exports = TTFBMetric;
