/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/** @fileoverview
 *  This audit evaluates if a page's load performance is fast enough for it to be considered a PWA.
 *  We are doublechecking that the network requests were throttled (or slow on their own)
 *  Afterwards, we report if the TTI is less than 10 seconds.
 */

const isDeepEqual = require('lodash.isequal');
const Audit = require('./audit');
const mobileThrottling = require('../config/constants').throttling.mobileSlow4G;
const Interactive = require('../gather/computed/metrics/interactive.js');

const displayValueText = `Interactive at %d\xa0s`;
const displayValueTextWithOverride = `Interactive on simulated mobile network at %d\xa0s`;

// Maximum TTI to be considered "fast" for PWA baseline checklist
//   https://developers.google.com/web/progressive-web-apps/checklist
const MAXIMUM_TTI = 10 * 1000;

class LoadFastEnough4Pwa extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'load-fast-enough-for-pwa',
      title: 'Page load is fast enough on mobile networks',
      failureTitle: 'Page load is not fast enough on mobile networks',
      description:
        'A fast page load over a cellular network ensures a good mobile user experience. ' +
        '[Learn more](https://developers.google.com/web/tools/lighthouse/audits/fast-3g).',
      requiredArtifacts: ['traces', 'devtoolsLogs'],
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

    // If throttling was default devtools or lantern slow 4G throttling, then reuse the given settings
    // Otherwise, we'll force the usage of lantern slow 4G.
    const settingOverrides = {throttlingMethod: 'simulate', throttling: mobileThrottling};

    // Override settings for interactive if provided throttling was used or network
    // throttling was not consistent with standard `mobile network throttling`
    const override = context.settings.throttlingMethod === 'provided' ||
      !isDeepEqual(context.settings.throttling, mobileThrottling);

    const displayValueFinal = override ? displayValueTextWithOverride : displayValueText;

    const settings = override ? Object.assign({}, context.settings, settingOverrides) :
      context.settings;

    const metricComputationData = {trace, devtoolsLog, settings};
    const tti = await Interactive.request(metricComputationData, context);

    const score = Number(tti.timing < MAXIMUM_TTI);

    /** @type {LH.Audit.DisplayValue|undefined} */
    let displayValue;
    /** @type {string|undefined} */
    let explanation;
    if (!score) {
      displayValue = [displayValueFinal, tti.timing / 1000];
      explanation = 'Your page loads too slowly and is not interactive within 10 seconds. ' +
        'Look at the opportunities and diagnostics in the "Performance" section to learn how to ' +
        'improve.';
    }

    return {
      score,
      displayValue,
      explanation,
      rawValue: tti.timing,
    };
  }
}

module.exports = LoadFastEnough4Pwa;
