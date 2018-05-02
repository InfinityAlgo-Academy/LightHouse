/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('./audit');
const Util = require('../report/html/renderer/util');

class EstimatedInputLatency extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      name: 'estimated-input-latency',
      description: 'Estimated Input Latency',
      helpText: 'The score above is an estimate of how long your app takes to respond to user ' +
          'input, in milliseconds, during the busiest 5s window of page load. If your ' +
          'latency is higher than 50 ms, users may perceive your app as laggy. ' +
          '[Learn more](https://developers.google.com/web/tools/lighthouse/audits/estimated-input-latency).',
      scoreDisplayMode: Audit.SCORING_MODES.NUMERIC,
      requiredArtifacts: ['traces'],
    };
  }

  /**
   * @return {LH.Audit.ScoreOptions}
   */
  static get defaultOptions() {
    return {
      // see https://www.desmos.com/calculator/srv0hqhf7d
      scorePODR: 50,
      scoreMedian: 100,
    };
  }

  /**
   * Audits the page to estimate input latency.
   * @see https://github.com/GoogleChrome/lighthouse/issues/28
   *
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const trace = artifacts.traces[Audit.DEFAULT_PASS];
    const devtoolsLog = artifacts.devtoolsLogs[Audit.DEFAULT_PASS];
    const metricComputationData = {trace, devtoolsLog, settings: context.settings};
    const metricResult = await artifacts.requestEstimatedInputLatency(metricComputationData);

    return {
      score: Audit.computeLogNormalScore(
        metricResult.timing,
        context.options.scorePODR,
        context.options.scoreMedian
      ),
      rawValue: metricResult.timing,
      displayValue: Util.formatMilliseconds(metricResult.timing, 1),
    };
  }
}

module.exports = EstimatedInputLatency;
