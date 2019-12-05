/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('../audits/audit.js');
const NetworkRecords = require('./network-records.js');
const makeComputedArtifact = require('./computed-artifact.js');

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
    // Defer global pollution.
    const SDK = require('../lib/cdt/SDK.js');

    const {SourceMaps, ScriptElements} = artifacts;
    const devtoolsLog = artifacts.devtoolsLogs[Audit.DEFAULT_PASS];
    const networkRecords = await NetworkRecords.request(devtoolsLog, context);

    /**
     * @typedef Sizes
     * @property {Record<string, number>} files
     * @property {number} unmappedBytes
     * @property {number} totalBytes
    */

    /** @type {Array<{map: LH.Artifacts.RawSourceMap, script: LH.Artifacts.ScriptElement, networkRecord?: LH.Artifacts.NetworkRequest, sizes: Sizes}>} */
    const sourceMapDatas = [];

    // Collate map, script, and network record.
    for (let mapIndex = 0; mapIndex < SourceMaps.length; mapIndex++) {
      const {scriptUrl, map} = SourceMaps[mapIndex];
      if (!map) continue;

      const scriptElement = ScriptElements.find(s => s.src === scriptUrl);
      const networkRecord = networkRecords.find(r => r.url === scriptUrl);
      if (!scriptElement) continue;

      // @ts-ignore: TODO: `sections` in map
      const sdkSourceMap = new SDK.TextSourceMap(`compiled.js`, `compiled.js.map`, map);
      const sizes = computeGeneratedFileSizesForCDT({map: sdkSourceMap, content: scriptElement.content});

      const sourceMapData = {
        map,
        script: scriptElement,
        networkRecord,
        sizes,
      };
      sourceMapDatas.push(sourceMapData);
    }

    return sourceMapDatas;
  }
}

module.exports = makeComputedArtifact(BundleAnalysis);
