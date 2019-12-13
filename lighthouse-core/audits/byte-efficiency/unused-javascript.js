/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const ByteEfficiencyAudit = require('./byte-efficiency-audit.js');
const BundleAnalysis = require('../../computed/bundle-analysis.js');
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

/**
 * @typedef WasteData
 * @property {Uint8Array} unusedByIndex
 * @property {number} unusedLength
 * @property {number} contentLength
 */

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
   * @param {LH.Crdp.Profiler.ScriptCoverage} scriptCoverage
   * @return {WasteData}
   */
  static computeWaste(scriptCoverage) {
    let maximumEndOffset = 0;
    for (const func of scriptCoverage.functions) {
      maximumEndOffset = Math.max(maximumEndOffset, ...func.ranges.map(r => r.endOffset));
    }

    // We only care about unused ranges of the script, so we can ignore all the nesting and safely
    // assume that if a range is unexecuted, all nested ranges within it will also be unexecuted.
    const unusedByIndex = new Uint8Array(maximumEndOffset);
    for (const func of scriptCoverage.functions) {
      for (const range of func.ranges) {
        if (range.count === 0) {
          for (let i = range.startOffset; i < range.endOffset; i++) {
            unusedByIndex[i] = 1;
          }
        }
      }
    }

    let unused = 0;
    for (const x of unusedByIndex) {
      unused += x;
    }

    return {
      unusedByIndex,
      unusedLength: unused,
      contentLength: maximumEndOffset,
    };
  }

  /**
   * @param {LH.Audit.ByteEfficiencyItem} item
   * @param {WasteData[]} wasteData
   * @param {import('../../computed/bundle-analysis.js').Bundle} bundle
   * @param {ReturnType<typeof UnusedJavaScript.determineLengths>} lengths
   */
  static createBundleMultiData(item, wasteData, bundle, lengths) {
    if (!bundle.script.content) return;

    /** @type {Record<string, number>} */
    const files = {};

    // This is 10x slower (~320ms vs 46ms for a big map), but its correctness
    // is much easier to reason about. The latter method gives the same counts,
    // except it seems to have +1 byte for each file.
    // let line = 0;
    // let column = 0;
    // for (let i = 0; i < bundle.script.content.length; i++) {
    //   column += 1;
    //   if (bundle.script.content[i] === '\n') {
    //     line += 1;
    //     column = 0;
    //   }
    //   if (wasteData.some(data => data.unusedByIndex[i] === 0)) continue;

    //   // @ts-ignore: ughhhhh the tsc doesn't work for the compiled cdt lib
    //   const mapping = bundle.map.findExactEntry(line, column);
    //   // This can be null if the source map has gaps.
    //   // For example, the webpack CommonsChunkPlugin emits code that is not mapped (`webpackJsonp`).
    //   if (mapping) {
    //     files[mapping.sourceURL] = (files[mapping.sourceURL] || 0) + 1;
    //   }
    // }

    const lineLengths = bundle.script.content.split('\n').map(l => l.length);
    let totalSoFar = 0;
    const lineOffsets = lineLengths.map(len => {
      const retVal = totalSoFar;
      totalSoFar += len + 1;
      return retVal;
    });

    let output = '';
    const chalk = require('chalk');
    // @ts-ignore
    bundle.map.computeLastGeneratedColumns();
    // @ts-ignore
    for (const mapping of bundle.map.mappings()) {
      let offset = lineOffsets[mapping.lineNumber];

      offset += mapping.columnNumber;
      const byteEnd = (mapping.lastColumnNumber - 1) || lineLengths[mapping.lineNumber];
      for (let i = mapping.columnNumber; i <= byteEnd; i++) {
        // debugging.
        if (mapping.sourceURL.includes('b.js')) {
          const unused = wasteData.every(data => data.unusedByIndex[offset] === 1);
          const fn = unused ? chalk.default.bgRedBright : chalk.default.bgGreen;
          output += fn(bundle.script.content[offset]);
          if (bundle.script.content[offset] === '\n') output += fn('\\n');
        }

        if (wasteData.every(data => data.unusedByIndex[offset] === 1)) {
          files[mapping.sourceURL] = (files[mapping.sourceURL] || 0) + 1;
        }
        offset += 1;
      }
      if (mapping.sourceURL.includes('b.js')) {
        console.log(mapping);
        console.log(files[mapping.sourceURL]);
        console.log(output);
        output = '';
      }
    }
    console.log(output);

    // debugging.
    console.log('sizes', bundle.sizes.files, {total: Object.values(bundle.sizes.files).reduce((acc, cur) => acc + cur, 0)});
    console.log({lengths});
    console.log('unused', files, {total: Object.values(files).reduce((acc, cur) => acc + cur, 0)});
    const outputAll = '';
    for (let i = 0; i < bundle.script.content.length; i++) {
      const unused = wasteData.every(data => data.unusedByIndex[i] === 1);
      const fn = unused ? chalk.default.bgRedBright : chalk.default.bgGreen;
      output += fn(bundle.script.content[i]);
      if (bundle.script.content[i] === '\n') output += fn('\\n');
    }
    console.log(outputAll);

    const transferRatio = lengths.transfer / lengths.content;
    const unusedFilesSizesSorted = Object.entries(files)
      .filter(d => d[1] * transferRatio >= 1024)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(d => {
        return {
          key: d[0],
          unused: Math.round(d[1] * transferRatio),
          total: Math.round(bundle.sizes.files[d[0]] * transferRatio),
        };
      });

    Object.assign(item, {
      sources: unusedFilesSizesSorted.map(d => d.key),
      sourceBytes: unusedFilesSizesSorted.map(d => d.total),
      sourceWastedBytes: unusedFilesSizesSorted.map(d => d.unused),
    });
  }

  /**
   * @param {WasteData[]} wasteData
   * @param {string} url
   * @param {ReturnType<typeof UnusedJavaScript.determineLengths>} lengths
   * @return {LH.Audit.ByteEfficiencyItem}
   */
  static mergeWaste(wasteData, url, lengths) {
    let unused = 0;
    let content = 0;
    // TODO: this is right for multiple script tags in an HTML document,
    // but may be wrong for multiple frames using the same script resource.
    for (const usage of wasteData) {
      unused += usage.unusedLength;
      content += usage.contentLength;
    }

    const wastedRatio = (unused / content) || 0;
    const wastedBytes = Math.round(lengths.transfer * wastedRatio);

    return {
      url: url,
      totalBytes: lengths.transfer,
      wastedBytes,
      wastedPercent: 100 * wastedRatio,
    };
  }

  /**
   * @param {WasteData[]} wasteData
   * @param {LH.Artifacts.NetworkRequest} networkRecord
   */
  static determineLengths(wasteData, networkRecord) {
    let unused = 0;
    let content = 0;
    // TODO: this is right for multiple script tags in an HTML document,
    // but may be wrong for multiple frames using the same script resource.
    for (const usage of wasteData) {
      unused += usage.unusedLength;
      content += usage.contentLength;
    }
    const transfer = ByteEfficiencyAudit.estimateTransferSize(networkRecord, content, 'Script');

    return {
      content,
      unused,
      transfer,
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {Array<LH.Artifacts.NetworkRequest>} networkRecords
   * @param {LH.Audit.Context} context
   * @return {Promise<ByteEfficiencyAudit.ByteEfficiencyProduct>}
   */
  static async audit_(artifacts, networkRecords, context) {
    const bundles = await BundleAnalysis.request(artifacts, context);

    /** @type {Map<string, Array<LH.Crdp.Profiler.ScriptCoverage>>} */
    const scriptsByUrl = new Map();
    for (const script of artifacts.JsUsage) {
      const scripts = scriptsByUrl.get(script.url) || [];
      scripts.push(script);
      scriptsByUrl.set(script.url, scripts);
    }

    const items = [];
    for (const [url, scriptCoverage] of scriptsByUrl.entries()) {
      const networkRecord = networkRecords.find(record => record.url === url);
      if (!networkRecord) continue;
      const wasteData = scriptCoverage.map(UnusedJavaScript.computeWaste);
      const lengths = UnusedJavaScript.determineLengths(wasteData, networkRecord);
      const bundle = bundles.find(b => b.script.src === url);
      const item = UnusedJavaScript.mergeWaste(wasteData, networkRecord.url, lengths);
      if (item.wastedBytes <= IGNORE_THRESHOLD_IN_BYTES) continue;
      if (bundle) {
        UnusedJavaScript.createBundleMultiData(item, wasteData, bundle, lengths);
      }
      items.push(item);
    }

    return {
      items,
      headings: [
        /* eslint-disable max-len */
        {key: 'url', valueType: 'url', multi: {key: 'sources', valueType: 'code'}, label: str_(i18n.UIStrings.columnURL)},
        {key: 'totalBytes', valueType: 'bytes', multi: {key: 'sourceBytes'}, label: str_(i18n.UIStrings.columnSize)},
        {key: 'wastedBytes', valueType: 'bytes', multi: {key: 'sourceWastedBytes'}, label: str_(i18n.UIStrings.columnWastedBytes)},
        /* eslint-enable max-len */
      ],
    };
  }
}

module.exports = UnusedJavaScript;
module.exports.UIStrings = UIStrings;
