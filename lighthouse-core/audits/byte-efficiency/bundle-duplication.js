/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const ByteEfficiencyAudit = require('./byte-efficiency-audit.js');
const i18n = require('../../lib/i18n/i18n.js');

// TODO: write these.
const UIStrings = {
  /** Imperative title of a Lighthouse audit that tells the user to remove content from their CSS that isn’t needed immediately and instead load that content at a later time. This is displayed in a list of audit titles that Lighthouse generates. */
  title: 'Remove duplicated code within bundles',
  /** Description of a Lighthouse audit that tells the user *why* they should defer loading any content in CSS that isn’t needed at page load. This is displayed after a user expands the section to see more. No word length limits. 'Learn More' becomes link text to additional documentation. */
  description: 'Remove dead rules from stylesheets and defer the loading of CSS not used for ' +
    'above-the-fold content to reduce unnecessary bytes consumed by network activity. ' +
    '[Learn more](https://web.dev/unused-css-rules).',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

// const IGNORE_THRESHOLD_IN_BYTES = 1 * 1024;

/** @typedef {LH.Artifacts.CSSStyleSheetInfo & {networkRecord: LH.Artifacts.NetworkRequest, usedRules: Array<LH.Crdp.CSS.RuleUsage>}} StyleSheetInfo */

class BundleDuplication extends ByteEfficiencyAudit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'bundle-duplication',
      title: str_(UIStrings.title),
      description: str_(UIStrings.description),
      scoreDisplayMode: ByteEfficiencyAudit.SCORING_MODES.NUMERIC,
      requiredArtifacts: ['devtoolsLogs', 'traces', 'SourceMaps'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {Array<LH.Artifacts.NetworkRequest>} networkRecords
   * @return {Promise<ByteEfficiencyAudit.ByteEfficiencyProduct>}
   */
  static async audit_(artifacts, networkRecords) {
    const {SourceMaps} = artifacts;

    /** @type {Map<string, Array<{mapIndex: number, sourceIndex: number, size: number}>>} */
    const statsBySourceFile = new Map();
    /** @type {Map<string, number>} */
    const lengthOfSourceContents = new Map();

    for (let mapIndex = 0; mapIndex < SourceMaps.length; mapIndex++) {
      const {scriptUrl, map} = SourceMaps[mapIndex];
      if (!map) continue;

      const result = {scriptUrl, sourceSizes: [0]};
      for (let sourceIndex = 0; sourceIndex < map.sources.length; sourceIndex++) {
        let source = map.sources[sourceIndex];
        // Trim trailing question mark - b/c webpack.
        source = source.replace(/\?$/, '');
        // Normalize paths for dependencies by keeping everything after the last `node_modules`.
        const lastNodeModulesIndex = source.lastIndexOf('node_modules');
        if (lastNodeModulesIndex !== -1) {
          source = source.substring(lastNodeModulesIndex);
        }

        const content = map.sourcesContent && map.sourcesContent[sourceIndex];
        const size = content !== undefined ? content.length : -1;
        result.sourceSizes.push(size);

        if (size !== -1) {
          lengthOfSourceContents.set(scriptUrl,
            (lengthOfSourceContents.get(scriptUrl) || 0) + size);
        }

        let stats = statsBySourceFile.get(source);
        if (!stats) {
          stats = [];
          statsBySourceFile.set(source, stats);
        }
        stats.push({mapIndex, sourceIndex, size});
      }
    }

    /** @type {Array<{module: string, url: string, totalBytes: number, wastedBytes: number}>} */
    const items = [];
    for (const [key, stats] of statsBySourceFile.entries()) {
      if (stats.length === 1) continue;
      // Give bundle bootstraps a pass.
      if (key.includes('webpack/bootstrap') || key.includes('(webpack)/buildin')) continue;
      // Ignore shims.
      if (key.includes('external ')) continue;

      // One copy of this module is considered to be the canonical version - the rest will have
      // non-zero `wastedBytes`. In the case of all copies being the same version. all sizes are
      // equal and the selection doesn't matter. When the copies are different versions, it does
      // matter. Ideally the newest version would be the canonical copy, but version information
      // is not present. Instead, size is used as a heuristic for latest version. This makes the
      // audit conserative in its estimation.
      stats.sort((a, b) => b.size - a.size);
      for (let i = 1; i < stats.length; i++) {
        const stat = stats[i];
        const map = SourceMaps[stat.mapIndex];

        // The length of the actual, possibly minified/transpiled module cannot be easily determined.
        // Instead, an heuristic is used. The ratio of this wasted module / the total sourcesContent
        // lengths is a decent estimator.
        const sourcesContentsLength = lengthOfSourceContents.get(map.scriptUrl);
        const networkRecord = networkRecords.find(r => r.url === map.scriptUrl);
        if (!sourcesContentsLength || !networkRecord) continue; // Shouldn't happen.
        const wastedBytes = (stat.size / sourcesContentsLength) * networkRecord.resourceSize;

        items.push({
          module: key,
          url: map.scriptUrl,
          totalBytes: wastedBytes, // Not needed, but keeps typescript happy.
          wastedBytes,
        });
      }
    }

    // TODO: explore a cutoff.
    if (process.env.DEBUG) {
      console.log(statsBySourceFile.keys());

      const all = sum(items);
      function sum(arr) {
        return arr.reduce((acc, cur) => acc + cur.wastedBytes, 0);
      }
      function print(x) {
        const sum_ = sum(items.filter(item => item.wastedBytes >= x));
        console.log(x, sum_, (all - sum_) / all * 100);
      }
      for (let i = 0; i < 100; i += 10) {
        print(i);
      }
      for (let i = 100; i < 1500; i += 100) {
        print(i);
      }
      /*
      initial thoughts: "0KB" is noisy in the report

      Could make an Other entry, but then that is unactionable.

      Just ignoring all the items is not a good idea b/c the sum of all the small items
      can be meaningful - <500 bytes is ~5.5%. Is that too much to ignore?

      https://www.coursehero.com/

      0 176188.36490136734 0
      10 176188.36490136734 0
      20 176188.36490136734 0
      30 176141.61108744194 0.026536266428022284
      40 176141.61108744194 0.026536266428022284
      50 176141.61108744194 0.026536266428022284
      60 176141.61108744194 0.026536266428022284
      70 176141.61108744194 0.026536266428022284
      80 176062.75412877792 0.07129345496778063
      90 175975.1834931716 0.12099630319805638
      100 175975.1834931716 0.12099630319805638
      200 174014.05824632183 1.2340807273299335
      300 172646.30987490347 2.010379645924272
      400 169433.15980658625 3.834081267831022
      500 166372.66452209078 5.5711399471647995
      600 162028.34675652898 8.036863360849814
      700 159503.6408045566 9.469821747963366
      800 157215.92153878932 10.768272566238442
      900 153868.20003692358 12.668353484600928
      1000 153868.20003692358 12.668353484600928
      1100 153868.20003692358 12.668353484600928
      1200 152701.58106087992 13.330496513566967
      1300 152701.58106087992 13.330496513566967
      1400 151370.21055005147 14.086148290898443

      */
    }

    // TODO: how to have multi-value rows?

    /** @type {LH.Audit.Details.Opportunity['headings']} */
    const headings = [
      {key: 'module', valueType: 'code', label: str_(i18n.UIStrings.columnName)}, // TODO: or 'Module'?
      {key: 'url', valueType: 'url', label: str_(i18n.UIStrings.columnURL)},
      // {key: 'totalBytes', valueType: 'bytes', label: str_(i18n.UIStrings.columnSize)},
      {key: 'wastedBytes', valueType: 'bytes', label: str_(i18n.UIStrings.columnWastedBytes)},
    ];

    // TODO: show warning somewhere if no source maps.

    return {
      items,
      headings,
    };
  }
}

module.exports = BundleDuplication;
module.exports.UIStrings = UIStrings;
