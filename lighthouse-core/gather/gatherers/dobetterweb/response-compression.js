/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

/**
  * @fileoverview Determines optimized gzip/br/deflate filesizes for all responses by
  *   checking the content-encoding header.
  */
'use strict';

const Gatherer = require('../gatherer');
const gzip = require('zlib').gzip;

const compressionHeaders = ['content-encoding', 'x-original-content-encoding'];
const compressionTypes = ['gzip', 'br', 'deflate'];
const binaryMimeTypes = ['image', 'audio', 'video'];
const CHROME_EXTENSION_PROTOCOL = 'chrome-extension:';

class ResponseCompression extends Gatherer {
  /**
   * @param {Array<LH.WebInspector.NetworkRequest>} networkRecords
   * @return {LH.Artifacts['ResponseCompression']}
   */
  static filterUnoptimizedResponses(networkRecords) {
    /** @type {LH.Artifacts['ResponseCompression']} */
    const unoptimizedResponses = [];

    networkRecords.forEach(record => {
      const mimeType = record._mimeType;
      const resourceType = record._resourceType;
      const resourceSize = record._resourceSize;

      const isBinaryResource = mimeType && binaryMimeTypes.some(type => mimeType.startsWith(type));
      const isTextBasedResource = !isBinaryResource && resourceType && resourceType.isTextType();
      const isChromeExtensionResource = record.url.startsWith(CHROME_EXTENSION_PROTOCOL);

      if (!isTextBasedResource || !resourceSize || !record.finished ||
        isChromeExtensionResource || !record.transferSize || record.statusCode === 304) {
        return;
      }

      const isContentEncoded = (record._responseHeaders || []).find(header =>
        compressionHeaders.includes(header.name.toLowerCase()) &&
        compressionTypes.includes(header.value)
      );

      if (!isContentEncoded) {
        unoptimizedResponses.push({
          requestId: record.requestId,
          url: record.url,
          mimeType: mimeType,
          transferSize: record.transferSize,
          resourceSize: resourceSize,
          gzipSize: 0,
        });
      }
    });

    return unoptimizedResponses;
  }

  /**
   * @param {LH.Gatherer.PassContext} passContext
   * @param {LH.Gatherer.LoadData} loadData
   * @return {Promise<LH.Artifacts['ResponseCompression']>}
   */
  afterPass(passContext, loadData) {
    const networkRecords = loadData.networkRecords;
    const textRecords = ResponseCompression.filterUnoptimizedResponses(networkRecords);

    const driver = passContext.driver;
    return Promise.all(textRecords.map(record => {
      return driver.getRequestContent(record.requestId).then(content => {
        // if we don't have any content, gzipSize is already set to 0
        if (!content) {
          return record;
        }

        return new Promise((resolve, reject) => {
          return gzip(content, (err, res) => {
            if (err) {
              return reject(err);
            }

            // get gzip size
            record.gzipSize = Buffer.byteLength(res, 'utf8');

            resolve(record);
          });
        });
      });
    }));
  }
}

module.exports = ResponseCompression;
