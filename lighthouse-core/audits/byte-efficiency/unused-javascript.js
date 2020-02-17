/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const ByteEfficiencyAudit = require('./byte-efficiency-audit.js');
const JsBundles = require('../../computed/js-bundles.js');
const UnusedJavaScriptSummary = require('../../computed/unused-javascript-summary.js');
const i18n = require('../../lib/i18n/i18n.js');

const UIStrings = {
  /** Imperative title of a Lighthouse audit that tells the user to remove JavaScript that is never evaluated during page load. This is displayed in a list of audit titles that Lighthouse generates. */
  title: 'Remove unused JavaScript',
  /** Description of a Lighthouse audit that tells the user *why* they should remove JavaScript that is never needed/evaluated by the browser. This is displayed after a user expands the section to see more. No character length limits. 'Learn More' becomes link text to additional documentation. */
  description: 'Remove unused JavaScript to reduce bytes consumed by network activity. ' +
    '[Learn more](https://developers.google.com/web/fundamentals/performance/optimizing-javascript/code-splitting).',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

const IGNORE_THRESHOLD_IN_BYTES = 2048;

class UnusedJavaScript extends ByteEfficiencyAudit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'unused-javascript',
      title: str_(UIStrings.title),
      description: str_(UIStrings.description),
      scoreDisplayMode: ByteEfficiencyAudit.SCORING_MODES.NUMERIC,
      requiredArtifacts: ['JsUsage', 'SourceMaps', 'ScriptElements', 'devtoolsLogs', 'traces'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {Array<LH.Artifacts.NetworkRequest>} networkRecords
   * @param {LH.Audit.Context} context
   * @return {Promise<ByteEfficiencyAudit.ByteEfficiencyProduct>}
   */
  static async audit_(artifacts, networkRecords, context) {
    const bundles = await JsBundles.request(artifacts, context);

    const items = [];
    for (const [url, scriptCoverages] of Object.entries(artifacts.JsUsage)) {
      const networkRecord = networkRecords.find(record => record.url === url);
      if (!networkRecord) continue;
      const bundle = bundles.find(b => b.script.src === url);
      const unusedJsSummary =
        await UnusedJavaScriptSummary.request({networkRecord, scriptCoverages, bundle}, context);
      if (unusedJsSummary.wastedBytes <= IGNORE_THRESHOLD_IN_BYTES) continue;

      const item = {
        url: unusedJsSummary.url,
        totalBytes: unusedJsSummary.totalBytes,
        wastedBytes: unusedJsSummary.wastedBytes,
        wastedPercent: unusedJsSummary.wastedPercent,
      };

      // Augment with bundle data.
      if (bundle && unusedJsSummary.sourcesWastedBytes) {
        const topUnusedSourceSizes = Object.entries(unusedJsSummary.sourcesWastedBytes)
          .slice(0, 5)
          .map(([source, unused]) => {
            return {source, unused, total: bundle.sizes.files[source]};
          })
          .filter(d => d.unused >= 1024);
        Object.assign(item, {
          sources: topUnusedSourceSizes.map(d => d.source),
          sourceBytes: topUnusedSourceSizes.map(d => d.total),
          sourceWastedBytes: topUnusedSourceSizes.map(d => d.unused),
        });
      }

      items.push(item);
    }

    return {
      items,
      headings: [
        /* eslint-disable max-len */
        {key: 'url', valueType: 'url', subRows: {key: 'sources', valueType: 'code'}, label: str_(i18n.UIStrings.columnURL)},
        {key: 'totalBytes', valueType: 'bytes', subRows: {key: 'sourceBytes'}, label: str_(i18n.UIStrings.columnSize)},
        {key: 'wastedBytes', valueType: 'bytes', subRows: {key: 'sourceWastedBytes'}, label: str_(i18n.UIStrings.columnWastedBytes)},
        /* eslint-enable max-len */
      ],
    };
  }
}

module.exports = UnusedJavaScript;
module.exports.UIStrings = UIStrings;
