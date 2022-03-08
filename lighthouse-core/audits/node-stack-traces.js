/**
 * @license Copyright 2022 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('./audit.js');

class FullPageScreenshot extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'node-stack-traces',
      scoreDisplayMode: Audit.SCORING_MODES.INFORMATIVE,
      title: 'Node stack traces',
      description: 'Details about JavaScript created/modified HTML nodes',
      requiredArtifacts: ['NodeStackTraces'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts) {
    if (!artifacts.NodeStackTraces) {
      return {score: 0, notApplicable: true};
    }

    /** @type {Record<string, LH.Crdp.Runtime.CallFrame>} */
    const nodes = {};
    for (const [lhId, stackTraces] of Object.entries(artifacts.NodeStackTraces.nodes)) {
      if (!stackTraces.creation) continue;
      const topCallFrame =
        stackTraces.creation.callFrames[stackTraces.creation.callFrames.length - 1];
      nodes[lhId] = topCallFrame;
    }

    return {
      score: 1,
      details: {
        type: 'debugdata',
        nodes,
      },
    };
  }
}

module.exports = FullPageScreenshot;
