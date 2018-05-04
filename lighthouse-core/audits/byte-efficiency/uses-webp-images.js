/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
/*
 * @fileoverview This audit determines if the images could be smaller when compressed with WebP.
 */
// @ts-nocheck - TODO(bckenny)
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
      name: 'uses-webp-images',
      description: 'Serve images in next-gen formats',
      scoreDisplayMode: ByteEfficiencyAudit.SCORING_MODES.NUMERIC,
      helpText: 'Image formats like JPEG 2000, JPEG XR, and WebP often provide better ' +
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
   * @return {LH.Audit.ByteEfficiencyProduct}
   */
  static audit_(artifacts) {
    const images = artifacts.OptimizedImages;

    const failedImages = [];
    const results = [];
    images.forEach(image => {
      if (image.failed) {
        failedImages.push(image);
        return;
      } else if (image.originalSize < image.webpSize + IGNORE_THRESHOLD_IN_BYTES) {
        return;
      }

      const url = URL.elideDataURI(image.url);
      const webpSavings = UsesWebPImages.computeSavings(image);

      results.push({
        url,
        fromProtocol: image.fromProtocol,
        isCrossOrigin: !image.isSameOrigin,
        totalBytes: image.originalSize,
        wastedBytes: webpSavings.bytes,
      });
    });

    let debugString;
    if (failedImages.length) {
      const urls = failedImages.map(image => URL.getURLDisplayName(image.url));
      debugString = `Lighthouse was unable to decode some of your images: ${urls.join(', ')}`;
    }

    const headings = [
      {key: 'url', itemType: 'thumbnail', text: ''},
      {key: 'url', itemType: 'url', text: 'URL'},
      {key: 'totalBytes', itemType: 'bytes', displayUnit: 'kb', granularity: 1, text: 'Original'},
      {key: 'wastedBytes', itemType: 'bytes', displayUnit: 'kb', granularity: 1,
        text: 'Potential Savings'},
    ];

    return {
      debugString,
      results,
      headings,
    };
  }
}

module.exports = UsesWebPImages;
