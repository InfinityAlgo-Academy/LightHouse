/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('./audit');

class Metrics extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      name: 'metrics',
      informative: true,
      description: 'Metrics',
      helpText: 'Collects all available metrics.',
      requiredArtifacts: ['traces', 'devtoolsLogs'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const trace = artifacts.traces[Audit.DEFAULT_PASS];
    const devtoolsLog = artifacts.devtoolsLogs[Audit.DEFAULT_PASS];
    const metricComputationData = {trace, devtoolsLog, settings: context.settings};

    const traceOfTab = await artifacts.requestTraceOfTab(trace);
    const speedline = await artifacts.requestSpeedline(trace);
    const firstContentfulPaint = await artifacts.requestFirstContentfulPaint(metricComputationData);
    const firstMeaningfulPaint = await artifacts.requestFirstMeaningfulPaint(metricComputationData);
    const firstCPUIdle = await artifacts.requestFirstCPUIdle(metricComputationData);
    const interactive = await artifacts.requestInteractive(metricComputationData);
    const speedIndex = await artifacts.requestSpeedIndex(metricComputationData);
    const estimatedInputLatency = await artifacts.requestEstimatedInputLatency(metricComputationData); // eslint-disable-line max-len
    const metrics = [];

    // Include the simulated/observed performance metrics
    const metricsMap = {
      firstContentfulPaint,
      firstMeaningfulPaint,
      firstCPUIdle,
      interactive,
      speedIndex,
      estimatedInputLatency,
    };

    for (const [metricName, values] of Object.entries(metricsMap)) {
      metrics.push({
        metricName,
        timing: Math.round(values.timing),
        timestamp: values.timestamp,
      });
    }

    // Include all timestamps of interest from trace of tab
    const timingsEntries = /** @type {Array<[keyof LH.Artifacts.TraceTimes, number]>} */
      (Object.entries(traceOfTab.timings));
    for (const [traceEventName, timing] of timingsEntries) {
      const uppercased = traceEventName.slice(0, 1).toUpperCase() + traceEventName.slice(1);
      const metricName = `observed${uppercased}`;
      const timestamp = traceOfTab.timestamps[traceEventName];
      metrics.push({metricName, timing, timestamp});
    }

    // Include some visual metrics from speedline
    metrics.push({
      metricName: 'observedFirstVisualChange',
      timing: speedline.first,
      timestamp: (speedline.first + speedline.beginning) * 1000,
    });
    metrics.push({
      metricName: 'observedLastVisualChange',
      timing: speedline.complete,
      timestamp: (speedline.complete + speedline.beginning) * 1000,
    });
    metrics.push({
      metricName: 'observedSpeedIndex',
      timing: speedline.speedIndex,
      timestamp: (speedline.speedIndex + speedline.beginning) * 1000,
    });

    const headings = [
      {key: 'metricName', itemType: 'text', text: 'Name'},
      {key: 'timing', itemType: 'ms', granularity: 10, text: 'Value (ms)'},
    ];

    const tableDetails = Audit.makeTableDetails(headings, metrics);

    return {
      score: 1,
      rawValue: interactive.timing,
      details: tableDetails,
    };
  }
}

module.exports = Metrics;
