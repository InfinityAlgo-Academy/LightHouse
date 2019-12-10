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

/**
 * @typedef {typeof import('../lib/cdt/SDK.js')['TextSourceMap']} SourceMap
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
 * @property {SourceMap} map
 * @property {Sizes} sizes
*/

/**
 * Calculate the number of bytes contributed by each source file
 * @param {SourceMap} map
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

  // @ts-ignore
  for (const mapping of map.mappings()) {
    const source = mapping.sourceURL;
    const lineNum = mapping.lineNumber;
    const colNum = mapping.columnNumber;
    const lastColNum = mapping.lastColumnNumber;

    // Webpack sometimes emits null mappings.
    // https://github.com/mozilla/source-map/pull/303
    if (!source) continue;

    // Lines are 1-based
    const line = lines[lineNum];
    if (line === null) {
      // @ts-ignore
      log.error(`${map.compiledURL} mapping for line out of bounds: ${lineNum + 1}`);
      return failureResult;
    }

    // Columns are 0-based
    if (colNum >= line.length) {
      // @ts-ignore
      log.error(`${map.compiledURL} mapping for column out of bounds: ${lineNum + 1}:${colNum}`);
      return failureResult;
    }

    let mappingLength = 0;
    if (lastColNum !== undefined) {
      if (lastColNum >= line.length) {
        // @ts-ignore
        // eslint-disable-next-line max-len
        log.error(`${map.compiledURL} mapping for last column out of bounds: ${lineNum + 1}:${lastColNum}`);
        return failureResult;
      }
      mappingLength = lastColNum - colNum;
    } else {
      // TODO Buffer.byteLength?
      mappingLength = line.length - colNum;
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
    for (let mapIndex = 0; mapIndex < SourceMaps.length; mapIndex++) {
      const {scriptUrl, map: rawMap} = SourceMaps[mapIndex];
      if (!rawMap) continue;

      const scriptElement = ScriptElements.find(s => s.src === scriptUrl);
      const networkRecord = networkRecords.find(r => r.url === scriptUrl);
      if (!scriptElement) continue;

      // Lazily generate expensive things.
      /** @type {SourceMap=} */
      let map;
      /** @type {Sizes=} */
      let sizes;

      const bundle = {
        rawMap,
        script: scriptElement,
        networkRecord,
        get map() {
          // Defer global pollution.
          const SDK = require('../lib/cdt/SDK.js');
          if (map) return map;
          // @ts-ignore: TODO: `sections` needs to be in rawMap types
          return map = new SDK.TextSourceMap(`compiled.js`, `compiled.js.map`, rawMap);
        },
        get sizes() {
          if (sizes) return sizes;
          if (!bundle.map) throw new Error('invalid map');
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
