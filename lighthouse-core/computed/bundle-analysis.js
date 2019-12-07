/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('../audits/audit.js');
const NetworkRecords = require('./network-records.js');
const makeComputedArtifact = require('./computed-artifact.js');

/**
 * @typedef {typeof import('../lib/cdt/SDK.js')} SDK
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
 * @property {SDK['TextSourceMap']} map
 * @property {Sizes} sizes
*/

// Lifted from source-map-explorer.
/** Calculate the number of bytes contributed by each source file */
// @ts-ignore
function computeGeneratedFileSizesForCDT(sourceMapData) {
  const {map, content} = sourceMapData;
  const lines = content.split('\n');
  /** @type {Record<string, number>} */
  const files = {};
  let mappedBytes = 0;

  map.computeLastGeneratedColumns();

  // @ts-ignore
  for (const mapping of map.mappings()) {
    const source = mapping.sourceURL;
    const generatedLine = mapping.lineNumber + 1;
    const generatedColumn = mapping.columnNumber;
    const lastGeneratedColumn = mapping.lastColumnNumber;

    // Webpack seems to sometimes emit null mappings.
    // https://github.com/mozilla/source-map/pull/303
    if (!source) continue;

    // Lines are 1-based
    const line = lines[generatedLine - 1];
    if (line === null) {
      // throw new AppError({
      //   code: 'InvalidMappingLine',
      //   generatedLine: generatedLine,
      //   maxLine: lines.length,
      // });
    }

    // Columns are 0-based
    if (generatedColumn >= line.length) {
      // throw new AppError({
      //   code: 'InvalidMappingColumn',
      //   generatedLine: generatedLine,
      //   generatedColumn: generatedColumn,
      //   maxColumn: line.length,
      // });
      continue;
    }

    let mappingLength = 0;
    if (lastGeneratedColumn !== undefined) {
      if (lastGeneratedColumn >= line.length) {
        // throw new AppError({
        //   code: 'InvalidMappingColumn',
        //   generatedLine: generatedLine,
        //   generatedColumn: lastGeneratedColumn,
        //   maxColumn: line.length,
        // });
        continue;
      }
      mappingLength = lastGeneratedColumn - generatedColumn + 0;
    } else {
      // TODO Buffer.byteLength?
      mappingLength = line.length - generatedColumn;
    }
    files[source] = (files[source] || 0) + mappingLength;
    mappedBytes += mappingLength;
  }

  // TODO: remove?
  // Don't count newlines as original version didn't count newlines
  const totalBytes = content.length - lines.length + 1;

  return {
    files,
    unmappedBytes: totalBytes - mappedBytes,
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
      /** @type {SDK['TextSourceMap']=} */
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
          return sizes = computeGeneratedFileSizesForCDT({
            map: bundle.map,
            content: scriptElement && scriptElement.content,
          });
        },
      };
      bundles.push(bundle);
    }

    return bundles;
  }
}

module.exports = makeComputedArtifact(BundleAnalysis);
