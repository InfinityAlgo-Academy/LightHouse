/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
/*
 * @fileoverview Audit a page to ensure that resources loaded with
 * gzip/br/deflate compression.
 */
'use strict';

const ByteEfficiencyAudit = require('./byte-efficiency-audit');
const URL = require('../../lib/url-shim');

const IGNORE_THRESHOLD_IN_BYTES = 1400;
const IGNORE_THRESHOLD_IN_PERCENT = 0.1;

class ResponsesAreCompressed extends ByteEfficiencyAudit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'uses-text-compression',
      scoreDisplayMode: ByteEfficiencyAudit.SCORING_MODES.NUMERIC,
      title: 'Enable text compression',
      description: 'Text-based responses should be served with compression (gzip, deflate or' +
        ' brotli) to minimize total network bytes.' +
        ' [Learn more](https://developers.google.com/web/tools/lighthouse/audits/text-compression).',
      requiredArtifacts: ['ResponseCompression', 'devtoolsLogs'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @return {ByteEfficiencyAudit.ByteEfficiencyProduct}
   */
  static audit_(artifacts) {
    const uncompressedResponses = artifacts.ResponseCompression;

    /** @type {Array<LH.Audit.ByteEfficiencyItem>} */
    const items = [];
    uncompressedResponses.forEach(record => {
      const originalSize = record.resourceSize;
      const gzipSize = record.gzipSize;
      const gzipSavings = originalSize - gzipSize;

      // we require at least 10% savings off the original size AND at least 1400 bytes
      // if the savings is smaller than either, we don't care
      if (1 - gzipSize / originalSize < IGNORE_THRESHOLD_IN_PERCENT ||
          gzipSavings < IGNORE_THRESHOLD_IN_BYTES ||
          record.transferSize < gzipSize
      ) {
        return;
      }

      // remove duplicates
      const url = URL.elideDataURI(record.url);
      const isDuplicate = items.find(item => item.url === url &&
        item.totalBytes === record.resourceSize);
      if (isDuplicate) {
        return;
      }

      items.push({
        url,
        totalBytes: originalSize,
        wastedBytes: gzipSavings,
      });
    });

    /** @type {LH.Result.Audit.OpportunityDetails['headings']} */
    const headings = [
      {key: 'url', valueType: 'url', label: 'Uncompressed resource URL'},
      {key: 'totalBytes', valueType: 'bytes', label: 'Original'},
      {key: 'wastedBytes', valueType: 'bytes', label: 'GZIP Savings'},
    ];

    return {
      items,
      headings,
    };
  }
}

module.exports = ResponsesAreCompressed;
