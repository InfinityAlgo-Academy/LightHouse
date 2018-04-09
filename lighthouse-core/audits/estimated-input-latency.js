/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('./audit');
const Util = require('../report/v2/renderer/util');
const TracingProcessor = require('../lib/traces/tracing-processor');
const LHError = require('../lib/errors');

class EstimatedInputLatency extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      name: 'estimated-input-latency',
      description: 'Estimated Input Latency',
      helpText: 'The score above is an estimate of how long your app takes to respond to user ' +
          'input, in milliseconds. There is a 90% probability that a user encounters this amount ' +
          'of latency, or less. 10% of the time a user can expect additional latency. If your ' +
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

  static calculate(tabTrace, context) {
    const startTime = tabTrace.timings.firstMeaningfulPaint;
    if (!startTime) {
      throw new LHError(LHError.errors.NO_FMP);
    }

    const latencyPercentiles = TracingProcessor.getRiskToResponsiveness(tabTrace, startTime);
    const ninetieth = latencyPercentiles.find(result => result.percentile === 0.9);
    const rawValue = parseFloat(ninetieth.time.toFixed(1));

    const score = Audit.computeLogNormalScore(
      ninetieth.time,
      context.options.scorePODR,
      context.options.scoreMedian
    );

    return {
      score,
      rawValue,
      displayValue: Util.formatMilliseconds(rawValue, 1),
      extendedInfo: {
        value: latencyPercentiles,
      },
    };
  }

  /**
   * Audits the page to estimate input latency.
   * @see https://github.com/GoogleChrome/lighthouse/issues/28
   * @param {!Artifacts} artifacts The artifacts from the gather phase.
   * @param {LH.Audit.Context} context
   * @return {!Promise<!AuditResult>} The score from the audit, ranging from 0-100.
   */
  static audit(artifacts, context) {
    const trace = artifacts.traces[this.DEFAULT_PASS];

    return artifacts.requestTraceOfTab(trace)
        .then(traceOfTab => EstimatedInputLatency.calculate(traceOfTab, context));
  }
}

module.exports = EstimatedInputLatency;
