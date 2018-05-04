/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('./audit');
const UnusedBytes = require('./byte-efficiency/byte-efficiency-audit');

class Redirects extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      name: 'redirects',
      description: 'Avoid multiple page redirects',
      scoreDisplayMode: Audit.SCORING_MODES.NUMERIC,
      helpText: 'Redirects introduce additional delays before the page can be loaded. [Learn more](https://developers.google.com/speed/docs/insights/AvoidRedirects).',
      requiredArtifacts: ['URL', 'devtoolsLogs', 'traces'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const settings = context.settings;
    const trace = artifacts.traces[Audit.DEFAULT_PASS];
    const devtoolsLog = artifacts.devtoolsLogs[Audit.DEFAULT_PASS];

    const traceOfTab = await artifacts.requestTraceOfTab(trace);
    const networkRecords = await artifacts.requestNetworkRecords(devtoolsLog);
    const mainResource = await artifacts.requestMainResource({URL: artifacts.URL, devtoolsLog});

    const metricComputationData = {trace, devtoolsLog, traceOfTab, networkRecords, settings};
    const metricResult = await artifacts.requestLanternInteractive(metricComputationData);

    /** @type {Map<string, LH.Gatherer.Simulation.NodeTiming>} */
    const nodeTimingsByUrl = new Map();
    for (const [node, timing] of metricResult.pessimisticEstimate.nodeTimings.entries()) {
      if (node.type === 'network') {
        const networkNode = /** @type {LH.Gatherer.Simulation.GraphNetworkNode} */ (node);
        nodeTimingsByUrl.set(networkNode.record.url, timing);
      }
    }

    // redirects is only available when redirects happens
    const redirectRequests = Array.from(mainResource.redirects || []);

    // add main resource to redirectRequests so we can use it to calculate wastedMs
    redirectRequests.push(mainResource);

    let totalWastedMs = 0;
    const pageRedirects = [];

    // Kickoff the results table (with the initial request) if there are > 1 redirects
    if (redirectRequests.length > 1) {
      pageRedirects.push({
        url: `(Initial: ${redirectRequests[0].url})`,
        wastedMs: 0,
      });
    }

    for (let i = 1; i < redirectRequests.length; i++) {
      const initialRequest = redirectRequests[i - 1];
      const redirectedRequest = redirectRequests[i];

      const initialTiming = nodeTimingsByUrl.get(initialRequest.url);
      const redirectedTiming = nodeTimingsByUrl.get(redirectedRequest.url);
      if (!initialTiming || !redirectedTiming) {
        throw new Error('Could not find redirects in graph');
      }

      // @ts-ignore TODO(phulce): split NodeTiming typedef, these are always defined
      const wastedMs = redirectedTiming.startTime - initialTiming.startTime;
      totalWastedMs += wastedMs;

      pageRedirects.push({
        url: redirectedRequest.url,
        wastedMs,
      });
    }

    const headings = [
      {key: 'url', itemType: 'text', text: 'Redirected URL'},
      {key: 'wastedMs', itemType: 'ms', text: 'Time for Redirect'},
    ];
    const summary = {wastedMs: totalWastedMs};
    const details = Audit.makeTableDetails(headings, pageRedirects, summary);

    return {
      // We award a passing grade if you only have 1 redirect
      score: redirectRequests.length <= 2 ? 1 : UnusedBytes.scoreForWastedMs(totalWastedMs),
      rawValue: totalWastedMs,
      displayValue: ['%d\xa0ms', totalWastedMs],
      extendedInfo: {
        value: {
          wastedMs: totalWastedMs,
        },
      },
      details,
    };
  }
}

module.exports = Redirects;
