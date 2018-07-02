/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const ByteEfficiencyAudit = require('./byte-efficiency-audit');
// @ts-ignore - TODO: https://github.com/DefinitelyTyped/DefinitelyTyped/pull/25410
const esprima = require('esprima');

const IGNORE_THRESHOLD_IN_PERCENT = 10;
const IGNORE_THRESHOLD_IN_BYTES = 2048;

/**
 * @fileOverview Estimates minification savings by determining the ratio of parseable JS tokens to the
 * length of the entire string. Though simple, this method is quite accurate at identifying whether
 * a script was already minified and offers a relatively conservative minification estimate (our two
 * primary goals).
 *
 * This audit only examines scripts that were independent network requests and not inlined or eval'd.
 *
 * See https://github.com/GoogleChrome/lighthouse/pull/3950#issue-277887798 for stats on accuracy.
 */
class UnminifiedJavaScript extends ByteEfficiencyAudit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'unminified-javascript',
      title: 'Minify JavaScript',

      scoreDisplayMode: ByteEfficiencyAudit.SCORING_MODES.NUMERIC,
      description: 'Minifying JavaScript files can reduce payload sizes and script parse time. ' +
        '[Learn more](https://developers.google.com/speed/docs/insights/MinifyResources).',
      requiredArtifacts: ['Scripts', 'devtoolsLogs'],
    };
  }

  /**
   * @param {string} scriptContent
   * @param {LH.Artifacts.NetworkRequest} networkRecord
   * @return {{url: string, totalBytes: number, wastedBytes: number, wastedPercent: number}}
   */
  static computeWaste(scriptContent, networkRecord) {
    const contentLength = scriptContent.length;
    let totalTokenLength = 0;

    const tokens = esprima.tokenize(scriptContent, {tolerant: true});
    if (!tokens.length && tokens.errors && tokens.errors.length) {
      throw tokens.errors[0];
    }

    for (const token of tokens) {
      totalTokenLength += token.value.length;
    }

    const totalBytes = ByteEfficiencyAudit.estimateTransferSize(networkRecord, contentLength,
      'Script');
    const wastedRatio = 1 - totalTokenLength / contentLength;
    const wastedBytes = Math.round(totalBytes * wastedRatio);

    return {
      url: networkRecord.url,
      totalBytes,
      wastedBytes,
      wastedPercent: 100 * wastedRatio,
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {Array<LH.Artifacts.NetworkRequest>} networkRecords
   * @return {ByteEfficiencyAudit.ByteEfficiencyProduct}
   */
  static audit_(artifacts, networkRecords) {
    /** @type {Array<LH.Audit.ByteEfficiencyItem>} */
    const items = [];
    const warnings = [];
    for (const requestId of Object.keys(artifacts.Scripts)) {
      const scriptContent = artifacts.Scripts[requestId];
      const networkRecord = networkRecords.find(record => record.requestId === requestId);
      if (!networkRecord || !scriptContent) continue;

      try {
        const result = UnminifiedJavaScript.computeWaste(scriptContent, networkRecord);
        // If the ratio is minimal, the file is likely already minified, so ignore it.
        // If the total number of bytes to be saved is quite small, it's also safe to ignore.
        if (result.wastedPercent < IGNORE_THRESHOLD_IN_PERCENT ||
          result.wastedBytes < IGNORE_THRESHOLD_IN_BYTES ||
          !Number.isFinite(result.wastedBytes)) continue;
        items.push(result);
      } catch (err) {
        warnings.push(`Unable to process ${networkRecord.url}: ${err.message}`);
      }
    }

    return {
      items,
      warnings,
      headings: [
        {key: 'url', valueType: 'url', label: 'URL'},
        {key: 'totalBytes', valueType: 'bytes', label: 'Original'},
        {key: 'wastedBytes', valueType: 'bytes', label: 'Potential Savings'},
      ],
    };
  }
}

module.exports = UnminifiedJavaScript;
