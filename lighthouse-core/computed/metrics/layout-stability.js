/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const makeComputedArtifact = require('../computed-artifact.js');
const MetricArtifact = require('./metric');
const LHError = require('../../lib/lh-error');

class LayoutStability extends MetricArtifact {
  /**
   * @param {LH.Artifacts.MetricComputationData} data
   * @param {LH.Audit.Context} _
   * @return {Promise<LH.Artifacts.LanternMetric>}
   */
  static computeSimulatedMetric(data, _) {
    // @ts-ignore There's no difference between Simulated and Observed for LS
    return LayoutStability.computeObservedMetric(data);
  }

  /**
   * @param {LH.Artifacts.MetricComputationData} data
   * @return {Promise<LH.Artifacts.Metric>}
   */
  static computeObservedMetric(data) {
    const layoutJankEvts = data.traceOfTab.mainThreadEvents
      .filter(evt => evt.name === 'FrameLayoutJank')
      .filter(e => e.args && e.args.data && e.args.data.is_main_frame);

    if (layoutJankEvts.length === 0) throw new LHError(LHError.errors.NO_LAYOUT_JANK);

    const finalLayoutJank = layoutJankEvts.slice(-1)[0];
    const layoutStabilityScore =
      finalLayoutJank.args &&
      finalLayoutJank.args.data &&
      finalLayoutJank.args.data.cumulative_score;

    if (layoutStabilityScore === undefined) throw new LHError(LHError.errors.NO_LAYOUT_JANK);

    return Promise.resolve({
      timing: layoutStabilityScore,
    });
  }
}

module.exports = makeComputedArtifact(LayoutStability);
