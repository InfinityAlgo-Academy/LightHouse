/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('./audit');
const Util = require('../report/v2/renderer/util');

// Parameters (in ms) for log-normal CDF scoring. To see the curve:
//   https://www.desmos.com/calculator/rjp0lbit8y
const SCORING_POINT_OF_DIMINISHING_RETURNS = 1700;
const SCORING_MEDIAN = 10000;

class PredictivePerf extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      name: 'predictive-perf',
      description: 'Predicted Performance (beta)',
      helpText:
        'Predicted performance evaluates how your site will perform under ' +
        'a 3G connection on a mobile device.',
      scoreDisplayMode: Audit.SCORING_MODES.NUMERIC,
      requiredArtifacts: ['traces', 'devtoolsLogs'],
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static async audit(artifacts) {
    const trace = artifacts.traces[Audit.DEFAULT_PASS];
    const devtoolsLog = artifacts.devtoolsLogs[Audit.DEFAULT_PASS];
    const fcp = await artifacts.requestLanternFirstContentfulPaint({trace, devtoolsLog});
    const fmp = await artifacts.requestLanternFirstMeaningfulPaint({trace, devtoolsLog});
    const ttci = await artifacts.requestLanternConsistentlyInteractive({trace, devtoolsLog});
    const ttfcpui = await artifacts.requestLanternFirstCPUIdle({trace, devtoolsLog});
    const si = await artifacts.requestLanternSpeedIndex({trace, devtoolsLog});

    const values = {
      roughEstimateOfFCP: fcp.timing,
      optimisticFCP: fcp.optimisticEstimate.timeInMs,
      pessimisticFCP: fcp.pessimisticEstimate.timeInMs,

      roughEstimateOfFMP: fmp.timing,
      optimisticFMP: fmp.optimisticEstimate.timeInMs,
      pessimisticFMP: fmp.pessimisticEstimate.timeInMs,

      roughEstimateOfTTCI: ttci.timing,
      optimisticTTCI: ttci.optimisticEstimate.timeInMs,
      pessimisticTTCI: ttci.pessimisticEstimate.timeInMs,

      roughEstimateOfTTFCPUI: ttfcpui.timing,
      optimisticTTFCPUI: ttfcpui.optimisticEstimate.timeInMs,
      pessimisticTTFCPUI: ttfcpui.pessimisticEstimate.timeInMs,

      roughEstimateOfSI: si.timing,
      optimisticSI: si.optimisticEstimate.timeInMs,
      pessimisticSI: si.pessimisticEstimate.timeInMs,
    };

    const score = Audit.computeLogNormalScore(
      values.roughEstimateOfTTCI,
      SCORING_POINT_OF_DIMINISHING_RETURNS,
      SCORING_MEDIAN
    );

    return {
      score,
      rawValue: values.roughEstimateOfTTCI,
      displayValue: Util.formatMilliseconds(values.roughEstimateOfTTCI),
      extendedInfo: {value: values},
    };
  }
}

module.exports = PredictivePerf;
