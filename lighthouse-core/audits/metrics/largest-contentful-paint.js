/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('../audit.js');
const i18n = require('../../lib/i18n/i18n.js');
const ComputedLcp = require('../../computed/metrics/largest-contentful-paint.js');

const UIStrings = {
  /** The name of the metric that marks the time at which the largest text or image is painted by the browser. Shown to users as the label for the numeric metric value. Ideally fits within a ~40 character limit. */
  title: 'Largest Contentful Paint',
  /** Description of the Largest Contentful Paint (LCP) metric, which marks the time at which the largest text or image is painted by the browser. This is displayed within a tooltip when the user hovers on the metric name to see more. No character length limits. 'Learn More' becomes link text to additional documentation. */
  description: 'Largest Contentful Paint marks the time at which the largest text or image is ' +
      `painted. [Learn More](https://web.dev/largest-contentful-paint)`, // TODO: waiting on LH specific doc.
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

class LargestContentfulPaint extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'largest-contentful-paint',
      title: str_(UIStrings.title),
      description: str_(UIStrings.description),
      scoreDisplayMode: Audit.SCORING_MODES.NUMERIC,
      requiredArtifacts: ['traces', 'devtoolsLogs'],
    };
  }

  /**
   * @return {LH.Audit.ScoreOptions}
   */
  static get defaultOptions() {
    return {
      // TODO: Reusing FCP's scoring curve. Set correctly once distribution of results is available.
      scorePODR: 2000,
      scoreMedian: 4000,
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
    const metricResult = await ComputedLcp.request(metricComputationData, context);

    return {
      score: Audit.computeLogNormalScore(
        metricResult.timing,
        context.options.scorePODR,
        context.options.scoreMedian
      ),
      numericValue: metricResult.timing,
      displayValue: str_(i18n.UIStrings.seconds, {timeInMs: metricResult.timing}),
    };
  }
}

module.exports = LargestContentfulPaint;
module.exports.UIStrings = UIStrings;
