/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
/*
 * @fileoverview Audit a page to ensure that videos are used instead of animated gifs
 */
'use strict';

const NetworkRequest = require('../../lib/network-request');
const ByteEfficiencyAudit = require('./byte-efficiency-audit');

// If GIFs are above this size, we'll flag them
// See https://github.com/GoogleChrome/lighthouse/pull/4885#discussion_r178406623 and https://github.com/GoogleChrome/lighthouse/issues/4696#issuecomment-370979920
const GIF_BYTE_THRESHOLD = 100 * 1024;

class EfficientAnimatedContent extends ByteEfficiencyAudit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'efficient-animated-content',
      scoreDisplayMode: ByteEfficiencyAudit.SCORING_MODES.NUMERIC,
      title: 'Use video formats for animated content',
      description: 'Large GIFs are inefficient for delivering animated content. Consider using ' +
        'MPEG4/WebM videos for animations and PNG/WebP for static images instead of GIF to save ' +
        'network bytes. [Learn more](https://developers.google.com/web/fundamentals/performance/optimizing-content-efficiency/replace-animated-gifs-with-video/)',
      requiredArtifacts: ['devtoolsLogs'],
    };
  }

  /**
   * Calculate rough savings percentage based on 1000 real gifs transcoded to video
   * @param {number} bytes
   * @return {number} rough savings percentage
   * @see https://github.com/GoogleChrome/lighthouse/issues/4696#issuecomment-380296510 bytes
   */
  static getPercentSavings(bytes) {
    return Math.round((29.1 * Math.log10(bytes) - 100.7)) / 100;
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {Array<LH.Artifacts.NetworkRequest>} networkRecords
   * @return {ByteEfficiencyAudit.ByteEfficiencyProduct}
   */
  static audit_(artifacts, networkRecords) {
    const unoptimizedContent = networkRecords.filter(
      record => record.mimeType === 'image/gif' &&
        record.resourceType === NetworkRequest.TYPES.Image &&
        (record.resourceSize || 0) > GIF_BYTE_THRESHOLD
    );

    /** @type {Array<{url: string, totalBytes: number, wastedBytes: number}>}*/
    const items = unoptimizedContent.map(record => {
      const resourceSize = record.resourceSize || 0;
      return {
        url: record.url,
        totalBytes: resourceSize,
        wastedBytes: Math.round(resourceSize *
          EfficientAnimatedContent.getPercentSavings(resourceSize)),
      };
    });

    /** @type {LH.Result.Audit.OpportunityDetails['headings']} */
    const headings = [
      {key: 'url', valueType: 'url', label: 'URL'},
      {key: 'totalBytes', valueType: 'bytes', label: 'Transfer Size'},
      {key: 'wastedBytes', valueType: 'bytes', label: 'Byte Savings'},
    ];

    return {
      items,
      headings,
    };
  }
}

module.exports = EfficientAnimatedContent;
