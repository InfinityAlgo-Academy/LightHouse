/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const log = require('lighthouse-logger');
const Audit = require('../audits/audit.js');
const NetworkRecords = require('./network-records.js');
const makeComputedArtifact = require('./computed-artifact.js');
const SDK = require('../lib/cdt/SDK.js');

/**
 * @typedef {import('../lib/cdt/generated/SourceMap.js').TextSourceMap} TextSourceMap
 */

/**
 * @typedef Sizes
 * @property {Record<string, number>} files
 * @property {number} unmappedBytes
 * @property {number} totalBytes
*/

/**
 * @typedef Bundle
 * @property {LH.Artifacts.RawSourceMap} rawMap
 * @property {LH.Artifacts.ScriptElement} script
 * @property {LH.Artifacts.NetworkRequest=} networkRecord
 * @property {TextSourceMap} map
 * @property {Sizes} sizes
*/

/**
 * Calculate the number of bytes contributed by each source file
 * @param {TextSourceMap} map
 * @param {string} content
 */
function computeGeneratedFileSizes(map, content) {
  const lines = content.split('\n');
  /** @type {Record<string, number>} */
  const files = {};
  const totalBytes = content.length;
  let unmappedBytes = totalBytes;

  // If the map + contents don't line up, return a result that
  // denotes nothing is mapped.
  const failureResult = {files: {}, unmappedBytes, totalBytes};

  // @ts-ignore: This function is added in SDK.js
  map.computeLastGeneratedColumns();

  for (const mapping of map.mappings()) {
    const source = mapping.sourceURL;
    const lineNum = mapping.lineNumber;
    const colNum = mapping.columnNumber;
    // @ts-ignore: `lastColumnNumber` is not on types yet.
    const lastColNum = /** @type {number=} */ (mapping.lastColumnNumber);

    // Webpack sometimes emits null mappings.
    // https://github.com/mozilla/source-map/pull/303
    if (!source) continue;

    // Lines are 1-based
    const line = lines[lineNum];
    if (line === null) {
      log.error('BundleAnalysis', `${map.url()} mapping for line out of bounds: ${lineNum + 1}`);
      return failureResult;
    }

    // Columns are 0-based
    if (colNum > line.length) {
      // eslint-disable-next-line max-len
      log.error('BundleAnalysis', `${map.url()} mapping for column out of bounds: ${lineNum + 1}:${colNum}`);
      return failureResult;
    }

    let mappingLength = 0;
    if (lastColNum !== undefined) {
      if (lastColNum > line.length) {
        // eslint-disable-next-line max-len
        log.error('BundleAnalysis', `${map.url()} mapping for last column out of bounds: ${lineNum + 1}:${lastColNum}`);
        return failureResult;
      }
      mappingLength = lastColNum - colNum;
    } else {
      // TODO Buffer.byteLength?
      // Add +1 to account for the newline.
      mappingLength = line.length - colNum + 1;
    }
    files[source] = (files[source] || 0) + mappingLength;
    unmappedBytes -= mappingLength;
  }

  return {
    files,
    unmappedBytes,
    totalBytes,
  };
}

class BundleAnalysis {
  /**
   * @param {Pick<LH.Artifacts, 'SourceMaps'|'ScriptElements'|'devtoolsLogs'>} artifacts
   * @param {LH.Audit.Context} context
   */
  static async compute_(artifacts, context) {
    const {SourceMaps, ScriptElements} = artifacts;
    const devtoolsLog = artifacts.devtoolsLogs[Audit.DEFAULT_PASS];
    const networkRecords = await NetworkRecords.request(devtoolsLog, context);

    /** @type {Bundle[]} */
    const bundles = [];

    // Collate map, script, and network record.
    for (const SourceMap of SourceMaps) {
      if (!SourceMap.map) continue;
      const {scriptUrl, map: rawMap} = SourceMap;

      const scriptElement = ScriptElements.find(s => s.src === scriptUrl);
      const networkRecord = networkRecords.find(r => r.url === scriptUrl);
      if (!scriptElement) continue;

      // Lazily generate expensive things.
      /** @type {TextSourceMap=} */
      let map;
      /** @type {Sizes=} */
      let sizes;

      const bundle = {
        rawMap,
        script: scriptElement,
        networkRecord,
        get map() {
          if (map) return map;
          const compiledUrl = SourceMap.scriptUrl || 'compiled.js';
          const mapUrl = SourceMap.sourceMapUrl || 'compiled.js.map';
          // @ts-ignore: CDT has some funny ideas about what properties of a source map are required.
          return map = new SDK.TextSourceMap(compiledUrl, mapUrl, rawMap);
        },
        get sizes() {
          if (sizes) return sizes;
          const content = scriptElement && scriptElement.content ? scriptElement.content : '';
          return sizes = computeGeneratedFileSizes(bundle.map, content);
        },
      };
      bundles.push(bundle);
    }

    return bundles;
  }
}

module.exports = makeComputedArtifact(BundleAnalysis);
