/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const makeComputedArtifact = require('../computed-artifact.js');
const TraceOfTab = require('../trace-of-tab.js');
const LHError = require('../../lib/lh-error.js');

class LayoutStability {
  /**
   * @param {LH.Artifacts.MetricComputationDataInput} data
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Artifacts.MetricValue>}
   */
  static async compute_(data, context) {
    const {trace} = data;
    if (!trace) {
      throw new Error('Did not provide neccessary data for CLS computation');
    }
    const traceOfTab = await TraceOfTab.request(trace, context);

    const layoutShiftEvts = traceOfTab.mainThreadEvents
      .filter(evt => evt.name === 'LayoutShift')
      .filter(e => e.args && e.args.data && e.args.data.is_main_frame);

    // tdresser sez: In about 10% of cases, layout instability is 0, and there will be no trace events.
    // TODO: Validate that. http://crbug.com/1003459
    if (layoutShiftEvts.length === 0) {
      return Promise.resolve({
        value: 0,
        explanation: 'No LayoutShift trace events found'
      });
    }

    const finalLayoutShift = layoutShiftEvts.slice(-1)[0];
    const layoutStabilityScore =
      finalLayoutShift.args &&
      finalLayoutShift.args.data &&
      finalLayoutShift.args.data.cumulative_score;

    if (layoutStabilityScore === undefined) throw new LHError(LHError.errors.NO_LAYOUT_SHIFT);

    return Promise.resolve({
      value: layoutStabilityScore,
    });
  }
}

module.exports = makeComputedArtifact(LayoutStability);
