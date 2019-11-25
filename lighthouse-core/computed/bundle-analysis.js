/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const makeComputedArtifact = require('./computed-artifact.js');

class BundleAnalysis {
  /**
   * @param {{SourceMaps: LH.Artifacts['SourceMaps']}} data
   * @param {LH.Audit.Context} context
   */
  static async compute_(data, context) {
    const {SourceMaps} = data;

    const results = [];

    for (const {scriptUrl, map} of SourceMaps) {
      if (!map) continue;
      console.log('========', scriptUrl);

      const result = {scriptUrl, sourceSizes: [0]};
      for (let i = 0; i < map.sources.length; i++) {
        const content = map.sourcesContent && map.sourcesContent[i];
        const size = content !== undefined ? content.length : -1;
        result.sourceSizes.push(size);

        console.log(map.sources[i], size);
      }

      results.push(result);
    }

    // console.dir(results);

    return results;
  }
}

module.exports = makeComputedArtifact(BundleAnalysis);
