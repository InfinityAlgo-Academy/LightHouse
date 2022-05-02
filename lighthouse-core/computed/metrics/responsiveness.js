/**
 * @license Copyright 2022 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @fileoverview Returns a high-percentle (usually 98th) measure of how long it
 * takes the page to visibly respond to user input (or null, if there was no
 * user input in the provided trace).
 */

const makeComputedArtifact = require('../computed-artifact.js');
const ProcessedTrace = require('../processed-trace.js');

class Responsiveness {
  /**
   * @param {LH.Artifacts.ProcessedTrace} processedTrace
   * @return {{timing: number}|null}
   */
  static getHighPercentileResponsiveness(processedTrace) {
    const durations = processedTrace.frameTreeEvents
      // https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/core/timing/responsiveness_metrics.cc;l=146-150;drc=a1a2302f30b0a58f7669a41c80acdf1fa11958dd
      .filter(e => e.name === 'Responsiveness.Renderer.UserInteraction')
      .map(evt => evt.args.data?.maxDuration)
      .filter(/** @return {duration is number} */duration => duration !== undefined)
      .sort((a, b) => b - a);

    // If there were no interactions with the page, the metric is N/A.
    if (durations.length === 0) {
      return null;
    }

    // INP is the "nearest-rank"/inverted_cdf 98th percentile, except Chrome only
    // keeps the 10 worst events around, so it can never be more than the 10th from
    // last array element. To keep things simpler, sort desc and pick from front.
    // See https://source.chromium.org/chromium/chromium/src/+/main:components/page_load_metrics/browser/responsiveness_metrics_normalization.cc;l=45-59;drc=cb0f9c8b559d9c7c3cb4ca94fc1118cc015d38ad
    const index = Math.min(9, Math.floor(durations.length / 50));

    return {
      timing: durations[index],
    };
  }

  /**
   * @param {{trace: LH.Trace, settings: Immutable<LH.Config.Settings>}} data
   * @param {LH.Artifacts.ComputedContext} context
   * @return {Promise<LH.Artifacts.Metric|null>}
   */
  static async compute_(data, context) {
    if (data.settings.throttlingMethod === 'simulate') {
      throw new Error('Responsiveness currently unsupported by simulated throttling');
    }

    const processedTrace = await ProcessedTrace.request(data.trace, context);
    return Responsiveness.getHighPercentileResponsiveness(processedTrace);
  }
}

module.exports = makeComputedArtifact(Responsiveness, [
  'trace',
  'settings',
]);
