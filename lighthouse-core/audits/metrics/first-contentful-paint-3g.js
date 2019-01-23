/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('../audit.js');
const regular3G = require('../../config/constants.js').throttling.mobileRegluar3G;
const i18n = require('../../lib/i18n/i18n.js');
const FCP = require('./first-contentful-paint.js');
const ComputedFcp = require('../../computed/metrics/first-contentful-paint.js');

const i18nFilename = require.resolve('./first-contentful-paint.js');
const str_ = i18n.createMessageInstanceIdFn(i18nFilename, FCP.UIStrings);

class FirstContentfulPaint3G extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'first-contentful-paint-3g',
      title: str_(FCP.UIStrings.title),
      description: str_(FCP.UIStrings.description),
      scoreDisplayMode: Audit.SCORING_MODES.NUMERIC,
      requiredArtifacts: ['traces', 'devtoolsLogs'],
    };
  }

  /**
   * @return {LH.Audit.ScoreOptions}
   */
  static get defaultOptions() {
    return {
      // 75th and 95th percentiles HTTPArchive on Fast 3G -> multiply by 1.5 for RTT differential -> median and PODR
      // https://bigquery.cloud.google.com/table/httparchive:lighthouse.2018_04_01_mobile?pli=1
      scorePODR: 3000,
      scoreMedian: 6000,
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
    /** @type {LH.Config.Settings} */
    const settings = {...context.settings, throttlingMethod: 'simulate', throttling: regular3G};
    const metricComputationData = {trace, devtoolsLog, settings};
    const metricResult = await ComputedFcp.request(metricComputationData, context);

    return {
      score: Audit.computeLogNormalScore(
        metricResult.timing,
        context.options.scorePODR,
        context.options.scoreMedian
      ),
      rawValue: metricResult.timing,
      displayValue: str_(i18n.UIStrings.seconds, {timeInMs: metricResult.timing}),
    };
  }
}

module.exports = FirstContentfulPaint3G;
