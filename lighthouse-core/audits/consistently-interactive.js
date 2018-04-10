/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('./audit');
const Util = require('../report/v2/renderer/util');

/**
 * @fileoverview This audit identifies the time the page is "consistently interactive".
 * Looks for the first period of at least 5 seconds after FMP where both CPU and network were quiet,
 * and returns the timestamp of the beginning of the CPU quiet period.
 * @see https://docs.google.com/document/d/1GGiI9-7KeY3TPqS3YT271upUVimo-XiL5mwWorDUD4c/edit#
 */
class ConsistentlyInteractiveMetric extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      name: 'consistently-interactive',
      description: 'Consistently Interactive (beta)',
      helpText: 'Consistently Interactive marks the time at which the page is ' +
          'fully interactive. ' +
          '[Learn more](https://developers.google.com/web/tools/lighthouse/audits/consistently-interactive).',
      scoreDisplayMode: Audit.SCORING_MODES.NUMERIC,
      requiredArtifacts: ['traces', 'devtoolsLogs'],
    };
  }

  /**
   * @return {LH.Audit.ScoreOptions}
   */
  static get defaultOptions() {
    return {
      // see https://www.desmos.com/calculator/uti67afozh
      scorePODR: 1700,
      scoreMedian: 10000,
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {!Promise<!AuditResult>}
   */
  static async audit(artifacts, context) {
    const trace = artifacts.traces[Audit.DEFAULT_PASS];
    const devtoolsLog = artifacts.devtoolsLogs[Audit.DEFAULT_PASS];
    const metricComputationData = {trace, devtoolsLog, settings: context.settings};
    const metricResult = await artifacts.requestConsistentlyInteractive(metricComputationData);
    const timeInMs = metricResult.timing;
    const extendedInfo = {
      timeInMs,
      timestamp: metricResult.timestamp,
      optimistic: metricResult.optimisticEstimate && metricResult.optimisticEstimate.timeInMs,
      pessimistic: metricResult.pessimisticEstimate && metricResult.pessimisticEstimate.timeInMs,
    };

    return {
      score: Audit.computeLogNormalScore(
        timeInMs,
        context.options.scorePODR,
        context.options.scoreMedian
      ),
      rawValue: timeInMs,
      displayValue: Util.formatMilliseconds(timeInMs),
      extendedInfo: {
        value: extendedInfo,
      },
    };
  }
}

module.exports = ConsistentlyInteractiveMetric;
