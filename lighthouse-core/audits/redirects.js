/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('./audit');
const Util = require('../report/v2/renderer/util');
const UnusedBytes = require('./byte-efficiency/byte-efficiency-audit');

class Redirects extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      name: 'redirects',
      description: 'Avoids page redirects',
      failureDescription: 'Has multiple page redirects',
      helpText: 'Redirects introduce additional delays before the page can be loaded. [Learn more](https://developers.google.com/speed/docs/insights/AvoidRedirects).',
      requiredArtifacts: ['URL', 'devtoolsLogs'],
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    return artifacts.requestMainResource(artifacts.devtoolsLogs[Audit.DEFAULT_PASS])
      .then(mainResource => {
        // redirects is only available when redirects happens
        const redirectRequests = Array.from(mainResource.redirects || []);
        // add main resource to redirectRequests so we can use it to calculate wastedMs
        redirectRequests.push(mainResource);
        let totalWastedMs = 0;

        const pageRedirects = [];
        for (let i = 1; i < redirectRequests.length; i++) {
          const request = redirectRequests[i - 1];
          const nextRequest = redirectRequests[i];
          const wastedMs = (nextRequest.startTime - request.startTime) * 1000;

          // We skip the first redirect in our calculations but show it in the table below.
          // We allow 1 redirect (www. => m.)
          if (i > 1) {
            totalWastedMs += wastedMs;
          }

          pageRedirects.push({
            url: request.url,
            wastedMs: Util.formatMilliseconds(wastedMs),
          });
        }

        const headings = [
          {key: 'url', itemType: 'text', text: 'URL'},
          {key: 'wastedMs', itemType: 'text', text: 'Time for Redirect'},
        ];
        const details = Audit.makeTableDetails(headings, pageRedirects);

        return {
          score: UnusedBytes.scoreForWastedMs(totalWastedMs),
          rawValue: totalWastedMs,
          displayValue: Util.formatMilliseconds(totalWastedMs),
          extendedInfo: {
            value: {
              wastedMs: totalWastedMs,
            },
          },
          details,
        };
      });
  }
}

module.exports = Redirects;
