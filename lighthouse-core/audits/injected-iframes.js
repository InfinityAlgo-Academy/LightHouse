/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';


const Audit = require('./audit.js');
const i18n = require('./../lib/i18n/i18n.js');
const ComputedUserTimings = require('../computed/user-timings.js');

const UIStrings = {
  /** comment */
  title: 'Passing',
  /** comment */
  failureTitle: 'Failing',
  /** comment */
  description: 'Description here',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

class PreloadFontsAudit extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'injected-iframes',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['DOMTimeline', 'traces'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const {timestamps, windows} = artifacts.DOMTimeline;
    const trace = artifacts.traces[Audit.DEFAULT_PASS];
    let timingNormalization = 0;
    ComputedUserTimings.request(trace, context).then(computedUserTimings => {
      const userTimings = computedUserTimings.filter(timing => timing.name === 'lh_timealign');
      // can we assume that timing in client will always be <= timing on trace ?
      // are assuming that first item in userTimings / smallest will be the one we want
      timingNormalization = userTimings[0].startTime - timestamps[0].time;
    });

    const results = [];
    console.log(windows);
    for (const timestamp of timestamps) {
      const time = timestamp.time + timingNormalization;
      console.log(time);
      for (const window of windows) {
        if (time > window.start && time < window.end) {
          results.push({
            node: /** @type {LH.Audit.Details.NodeValue} */ ({
              type: 'node',
              path: timestamp.devtoolsNodePath,
              selector: timestamp.selector,
              nodeLabel: timestamp.nodeLabel,
              snippet: timestamp.snippet,
            }),
          });
        }
      }
    }

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      {key: 'node', itemType: 'node', text: str_(i18n.UIStrings.columnFailingElem)},
    ];

    return {
      score: results.length > 0 ? 0 : 1,
      details: Audit.makeTableDetails(headings, results),
      notApplicable: timestamps.length === 0,
    };
  }
}

module.exports = PreloadFontsAudit;
module.exports.UIStrings = UIStrings;
