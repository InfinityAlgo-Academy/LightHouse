/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('../audit.js');
const CumulativeLQD = require('../../computed/metrics/cumulative-long-queuing-delay.js');

// TODO(deepanjanroy): i18n strings once metric is final.
const UIStringsNotExported = {
  title: 'Cumulative Long Queuing Delay',
  description: '[Experimental metric] Total time period between FCP and Time to Interactive ' +
      'during which queuing time for any input event would be higher than 50ms.',
};

class CumulativeLongQueuingDelay extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'cumulative-long-queuing-delay',
      title: UIStringsNotExported.title,
      description: UIStringsNotExported.description,
      scoreDisplayMode: Audit.SCORING_MODES.NUMERIC,
      requiredArtifacts: ['traces', 'devtoolsLogs'],
    };
  }

  /**
   * @return {LH.Audit.ScoreOptions}
   */
  static get defaultOptions() {
    return {
      // According to a cluster telemetry run over top 10k sites on mobile, 5th percentile was 0ms,
      // 25th percentile was 270ms and median was 895ms. These numbers include 404 pages. Picking
      // thresholds according to our 25/75-th rule will be quite harsh scoring (a single 350ms task)
      // after FCP will yield a score of .5. The following coefficients are semi-arbitrarily picked
      // to give 600ms jank a score of .5 and 100ms jank a score of .999. We can tweak these numbers
      // in the future. See https://www.desmos.com/calculator/a7ib75kq3g
      scoreMedian: 600,
      scorePODR: 200,
    };
  }

  /**
   * Audits the page to calculate Cumulative Long Queuing Delay.
   *
   * We define Long Queuing Delay Region as any time interval in the loading timeline where queuing
   * time for an input event would be longer than 50ms. For example, if there is a 110ms main thread
   * task, the first 60ms of it is Long Queuing Delay Region, because any input event occuring in
   * that region has to wait more than 50ms. Cumulative Long Queuing Delay is the sum of all Long
   * Queuing Delay Regions between First Contentful Paint and Interactive Time (TTI).
   *
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const trace = artifacts.traces[Audit.DEFAULT_PASS];
    const devtoolsLog = artifacts.devtoolsLogs[Audit.DEFAULT_PASS];
    const metricComputationData = {trace, devtoolsLog, settings: context.settings};
    const metricResult = await CumulativeLQD.request(metricComputationData, context);

    return {
      score: Audit.computeLogNormalScore(
        metricResult.timing,
        context.options.scorePODR,
        context.options.scoreMedian
      ),
      numericValue: metricResult.timing,
      displayValue: 10 * Math.round(metricResult.timing / 10) + '\xa0ms',
    };
  }
}

module.exports = CumulativeLongQueuingDelay;
