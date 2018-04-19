/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('./audit');
const Util = require('../report/v2/renderer/util.js');

class FirstCPUIdle extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      name: 'first-cpu-idle',
      description: 'First CPU Idle',
      helpText: 'First CPU Idle marks the first time at which the page\'s main thread is ' +
          'quiet enough to handle input. ' +
          '[Learn more](https://developers.google.com/web/tools/lighthouse/audits/first-interactive).',
      scoreDisplayMode: Audit.SCORING_MODES.NUMERIC,
      requiredArtifacts: ['traces'],
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
   * Identify the time the page is "first interactive"
   * @see https://docs.google.com/document/d/1GGiI9-7KeY3TPqS3YT271upUVimo-XiL5mwWorDUD4c/edit#
   *
   * @param {Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<AuditResult>}
   */
  static async audit(artifacts, context) {
    const trace = artifacts.traces[Audit.DEFAULT_PASS];
    const devtoolsLog = artifacts.devtoolsLogs[Audit.DEFAULT_PASS];
    const metricComputationData = {trace, devtoolsLog, settings: context.settings};
    const metricResult = await artifacts.requestFirstCPUIdle(metricComputationData);

    return {
      score: Audit.computeLogNormalScore(
        metricResult.timing,
        context.options.scorePODR,
        context.options.scoreMedian
      ),
      rawValue: metricResult.timing,
      displayValue: Util.formatMilliseconds(metricResult.timing),
    };
  }
}

module.exports = FirstCPUIdle;
