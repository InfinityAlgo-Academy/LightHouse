/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('./audit');
const Util = require('../report/html/renderer/util');

/**
 * @fileoverview This audit identifies the time the page is "consistently interactive".
 * Looks for the first period of at least 5 seconds after FMP where both CPU and network were quiet,
 * and returns the timestamp of the beginning of the CPU quiet period.
 * @see https://docs.google.com/document/d/1GGiI9-7KeY3TPqS3YT271upUVimo-XiL5mwWorDUD4c/edit#
 */
class InteractiveMetric extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      name: 'interactive',
      description: 'Time to Interactive',
      helpText: 'Interactive marks the time at which the page is fully interactive. ' +
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
      // 75th and 90th percentiles HTTPArchive -> 50 and 75
      // https://bigquery.cloud.google.com/table/httparchive:lighthouse.2018_04_01_mobile?pli=1
      // see https://www.desmos.com/calculator/dohd3b0sbr
      scorePODR: 1200,
      scoreMedian: 7300,
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
    const metricResult = await artifacts.requestInteractive(metricComputationData);
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

module.exports = InteractiveMetric;
