/**
 * @license Copyright 2020 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const ByteEfficiencyAudit = require('./byte-efficiency-audit.js');
const JsBundles = require('../../computed/js-bundles.js');
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

const IGNORE_THRESHOLD_IN_BYTES = 1024;

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
      requiredArtifacts: ['devtoolsLogs', 'traces', 'SourceMaps', 'ScriptElements'],
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

    /**
     * @typedef SourceData
     * @property {string} normalizedSource
     * @property {number} size
     */

    /** @type {Map<LH.Artifacts.RawSourceMap, SourceData[]>} */
    const sourceDatasMap = new Map();

    // Determine size of each `sources` entry.
    for (const {rawMap, sizes} of bundles) {
      /** @type {SourceData[]} */
      const sourceDatas = [];
      sourceDatasMap.set(rawMap, sourceDatas);

      for (let i = 0; i < rawMap.sources.length; i++) {
        const source = rawMap.sources[i];
        // Trim trailing question mark - b/c webpack.
        let normalizedSource = source.replace(/\?$/, '');
        // Normalize paths for dependencies by keeping everything after the last `node_modules`.
        const lastNodeModulesIndex = normalizedSource.lastIndexOf('node_modules');
        if (lastNodeModulesIndex !== -1) {
          normalizedSource = source.substring(lastNodeModulesIndex);
        }

        // Ignore bundle overhead.
        if (normalizedSource.includes('webpack/bootstrap')) continue;
        if (normalizedSource.includes('(webpack)/buildin')) continue;
        // Ignore shims.
        if (normalizedSource.includes('external ')) continue;

        const fullSource = (rawMap.sourceRoot || '') + source;
        const sourceSize = sizes.files[fullSource];

        sourceDatas.push({
          normalizedSource,
          size: sourceSize,
        });
      }
    }

    /** @type {Map<string, Array<{scriptUrl: string, size: number}>>} */
    const sourceDataAggregated = new Map();
    for (const {rawMap, script} of bundles) {
      const sourceDatas = sourceDatasMap.get(rawMap);
      if (!sourceDatas) continue;

      for (const sourceData of sourceDatas) {
        let data = sourceDataAggregated.get(sourceData.normalizedSource);
        if (!data) {
          data = [];
          sourceDataAggregated.set(sourceData.normalizedSource, data);
        }
        data.push({
          scriptUrl: script.src || '',
          size: sourceData.size,
        });
      }
    }

    /**
     * @typedef ItemSubrows
     * @property {string[]} urls
     * @property {number[]} sourceBytes
     */

    /**
     * @typedef {LH.Audit.ByteEfficiencyItem & ItemSubrows} Item
     */

    /** @type {Item[]} */
    const items = [];

    /** @type {Map<string, number>} */
    const wastedBytesByUrl = new Map();
    for (const [key, sourceDatas] of sourceDataAggregated.entries()) {
      if (sourceDatas.length === 1) continue;

      // One copy of this module is treated as the canonical version - the rest will have
      // non-zero `wastedBytes`. In the case of all copies being the same version, all sizes are
      // equal and the selection doesn't matter. When the copies are different versions, it does
      // matter. Ideally the newest version would be the canonical copy, but version information
      // is not present. Instead, size is used as a heuristic for latest version. This makes the
      // audit conserative in its estimation.
      // TODO: instead, choose the "first" script in the DOM as the canonical?

      sourceDatas.sort((a, b) => b.size - a.size);
      const urls = [];
      const bytesValues = [];
      let wastedBytesTotal = 0;
      for (let i = 0; i < sourceDatas.length; i++) {
        const sourceData = sourceDatas[i];
        const url = sourceData.scriptUrl;
        urls.push(url);
        bytesValues.push(sourceData.size);
        if (i === 0) continue;
        wastedBytesTotal += sourceData.size;
        wastedBytesByUrl.set(url, (wastedBytesByUrl.get(url) || 0) + sourceData.size);
      }

      items.push({
        source: key,
        wastedBytes: wastedBytesTotal,
        // Not needed, but keeps typescript happy.
        url: '',
        // Not needed, but keeps typescript happy.
        totalBytes: 0,
        urls,
        sourceBytes: bytesValues,
      });
    }

    /** @type {Item} */
    const otherItem = {
      source: 'Other',
      wastedBytes: 0,
      url: '',
      totalBytes: 0,
      urls: [],
      sourceBytes: [],
    };
    for (const item of items.filter(item => item.wastedBytes <= IGNORE_THRESHOLD_IN_BYTES)) {
      otherItem.wastedBytes += item.wastedBytes;
      for (let i = 0; i < item.urls.length; i++) {
        const url = item.urls[i];
        if (!otherItem.urls.includes(url)) {
          otherItem.urls.push(url);
        }
      }
      items.splice(items.indexOf(item), 1);
    }
    if (otherItem.wastedBytes) {
      items.push(otherItem);
    }

    // TODO: explore a cutoff.
    // if (process.env.DEBUG) {
    //   console.log(sourceDataAggregated.keys());

    //   const all = sum(items);
    //   // @ts-ignore
    //   function sum(arr) {
    //     // @ts-ignore
    //     return arr.reduce((acc, cur) => acc + cur.wastedBytes, 0);
    //   }
    //   function print(x) {
    //     const sum_ = sum(items.filter(item => item.wastedBytes >= x));
    //     console.log(x, sum_, (all - sum_) / all * 100);
    //   }
    //   for (let i = 0; i < 100; i += 10) {
    //     print(i);
    //   }
    //   for (let i = 100; i < 1500; i += 100) {
    //     print(i);
    //   }
    //   /*
    //   initial thoughts: "0KB" is noisy in the report

    //   Could make an Other entry, but then that is unactionable.

    //   Just ignoring all the items is not a good idea b/c the sum of all the small items
    //   can be meaningful - <500 bytes is ~5.5%. Is that too much to ignore?

    //   EDIT: oh, granularity is a thing. let's set that to 0.05 and make 100 bytes the threshold.

    //   https://www.coursehero.com/

    //   0 176188.36490136734 0
    //   10 176188.36490136734 0
    //   20 176188.36490136734 0
    //   30 176141.61108744194 0.026536266428022284
    //   40 176141.61108744194 0.026536266428022284
    //   50 176141.61108744194 0.026536266428022284
    //   60 176141.61108744194 0.026536266428022284
    //   70 176141.61108744194 0.026536266428022284
    //   80 176062.75412877792 0.07129345496778063
    //   90 175975.1834931716 0.12099630319805638
    //   100 175975.1834931716 0.12099630319805638
    //   200 174014.05824632183 1.2340807273299335
    //   300 172646.30987490347 2.010379645924272
    //   400 169433.15980658625 3.834081267831022
    //   500 166372.66452209078 5.5711399471647995
    //   600 162028.34675652898 8.036863360849814
    //   700 159503.6408045566 9.469821747963366
    //   800 157215.92153878932 10.768272566238442
    //   900 153868.20003692358 12.668353484600928
    //   1000 153868.20003692358 12.668353484600928
    //   1100 153868.20003692358 12.668353484600928
    //   1200 152701.58106087992 13.330496513566967
    //   1300 152701.58106087992 13.330496513566967
    //   1400 151370.21055005147 14.086148290898443

    //   */
    // }

    /** @type {LH.Audit.Details.OpportunityColumnHeading[]} */
    const headings = [
      {key: 'source', valueType: 'code', subRows: {key: 'urls', valueType: 'url'}, label: str_(i18n.UIStrings.columnName)}, // TODO: or 'Source'?
      {key: '_', valueType: 'bytes', subRows: {key: 'sourceBytes'}, granularity: 0.05, label: str_(i18n.UIStrings.columnSize)},
      {key: 'wastedBytes', valueType: 'bytes', granularity: 0.05, label: str_(i18n.UIStrings.columnWastedBytes)},
    ];

    // TODO: show warning somewhere if no source maps.
    return {
      items,
      headings,
      wastedBytesByUrl,
    };
  }
}

module.exports = BundleDuplication;
module.exports.UIStrings = UIStrings;
