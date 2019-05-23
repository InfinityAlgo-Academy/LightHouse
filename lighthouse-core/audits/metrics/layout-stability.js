/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('../audit');
const ComputedLS = require('../../computed/metrics/layout-stability.js');
const i18n = require('../../lib/i18n/i18n');

const UIStrings = {
  /** The name of the metric "Layout Stability" that indicates how much the page changes its layout while it loads. If big segments of the page shift their location during load, the layout instability will be higher. Shown to users as the label for the numeric metric value. Ideally fits within a ~40 character limit. */
  title: 'Layout Instability',
  /** Description of the Layout Stability metric that indicates how much the page changes its layout while it loads. If big segments of the page shift their location during load, the layout instability will be higher. This description is displayed within a tooltip when the user hovers on the metric name to see more. No character length limits. 'Learn More' becomes link text to additional documentation. */
  description: 'The more the page\'s layout changes during its load, the higher the instability. ' +
      'Perfectly solid == 0. Unpleasant experience >= 0.5.',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

/**
 * @fileoverview This metric is the duration of the longest task after FCP. It is meant to capture
 * the worst case First Input Delay that a user might experience.
 * Tasks before FCP are excluded because it is unlikely that the user will try to interact with a page before it has painted anything.
 */
class LayoutStability extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'layout-stability',
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
      // TODO: calibrate these
      scorePODR: 0.1,
      scoreMedian: 0.5,
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
    const metricResult = await ComputedLS.request(metricComputationData, context);

    return {
      score: Audit.computeLogNormalScore(
        metricResult.timing,
        context.options.scorePODR,
        context.options.scoreMedian
      ),
      numericValue: metricResult.timing,
      displayValue: `${metricResult.timing.toLocaleString()} %`, // TODO: i18n
    };
  }
}

module.exports = LayoutStability;
module.exports.UIStrings = UIStrings;
