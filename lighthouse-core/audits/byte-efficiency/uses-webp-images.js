/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
/*
 * @fileoverview This audit determines if the images could be smaller when compressed with WebP.
 */
'use strict';

const ByteEfficiencyAudit = require('./byte-efficiency-audit');
const URL = require('../../lib/url-shim');

const IGNORE_THRESHOLD_IN_BYTES = 8192;

class UsesWebPImages extends ByteEfficiencyAudit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'uses-webp-images',
      title: 'Serve images in next-gen formats',
      scoreDisplayMode: ByteEfficiencyAudit.SCORING_MODES.NUMERIC,
      description: 'Image formats like JPEG 2000, JPEG XR, and WebP often provide better ' +
        'compression than PNG or JPEG, which means faster downloads and less data consumption. ' +
        '[Learn more](https://developers.google.com/web/tools/lighthouse/audits/webp).',
      requiredArtifacts: ['OptimizedImages', 'devtoolsLogs'],
    };
  }

  /**
   * @param {{originalSize: number, webpSize: number}} image
   * @return {{bytes: number, percent: number}}
   */
  static computeSavings(image) {
    const bytes = image.originalSize - image.webpSize;
    const percent = 100 * bytes / image.originalSize;
    return {bytes, percent};
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @return {ByteEfficiencyAudit.ByteEfficiencyProduct}
   */
  static audit_(artifacts) {
    const images = artifacts.OptimizedImages;

    /** @type {Array<LH.Audit.ByteEfficiencyItem>} */
    const items = [];
    const warnings = [];
    for (const image of images) {
      if (image.failed) {
        warnings.push(`Unable to decode ${URL.getURLDisplayName(image.url)}`);
        continue;
      } else if (image.originalSize < image.webpSize + IGNORE_THRESHOLD_IN_BYTES) {
        continue;
      }

      const url = URL.elideDataURI(image.url);
      const webpSavings = UsesWebPImages.computeSavings(image);

      items.push({
        url,
        fromProtocol: image.fromProtocol,
        isCrossOrigin: !image.isSameOrigin,
        totalBytes: image.originalSize,
        wastedBytes: webpSavings.bytes,
      });
    }

    /** @type {LH.Result.Audit.OpportunityDetails['headings']} */
    const headings = [
      {key: 'url', valueType: 'thumbnail', label: ''},
      {key: 'url', valueType: 'url', label: 'URL'},
      {key: 'totalBytes', valueType: 'bytes', label: 'Original'},
      {key: 'wastedBytes', valueType: 'bytes', label: 'Potential Savings'},
    ];

    return {
      warnings,
      items,
      headings,
    };
  }
}

module.exports = UsesWebPImages;
