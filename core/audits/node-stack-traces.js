/**
 * @license Copyright 2022 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import {Audit} from './audit.js';

class NodeStackTraces extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'node-stack-traces',
      scoreDisplayMode: Audit.SCORING_MODES.INFORMATIVE,
      title: 'Node stack traces',
      description: 'Stack traces of JavaScript created HTML elements',
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

    // Don't just serialize NodeStackTraces–it's way too big!
    // Instead, use a series of cache lookup arrays to greatly compress the data.

    /** @type {string[]} */
    const urls = [];

    /** @type {Array<{url: number, line: number, column: number}>} */
    const frames = [];

    /** @type {Array<number[]>} */
    const stacks = [];

    /** @param {number[]} frames */
    function dedupeStack(frames) {
      let stackIndex = stacks.findIndex(s => {
        return s.length === frames.length && s.every((value, index) => frames[index] === value);
      });
      if (stackIndex === -1) {
        stackIndex = stacks.length;
        stacks.push(frames);
      }
      return stackIndex;
    }

    /** @type {Record<string, {creation: number}>} */
    const nodes = {};
    for (const [lhId, stackTraces] of Object.entries(artifacts.NodeStackTraces)) {
      if (!stackTraces.creation) continue;

      nodes[lhId] = {
        creation: dedupeStack(stackTraces.creation.callFrames.map(frame => {
          let urlIndex = urls.indexOf(frame.url);
          if (urlIndex === -1) {
            urlIndex = urls.length;
            urls.push(frame.url);
          }

          let frameIndex = frames.findIndex(f =>
            f.url === urlIndex && f.line === frame.lineNumber && f.column === frame.columnNumber);
          if (frameIndex === -1) {
            frameIndex = frames.length;
            frames.push({url: urlIndex, line: frame.lineNumber, column: frame.columnNumber});
          }

          return frameIndex;
        })),
      };
    }

    return {
      score: 1,
      details: {
        type: 'debugdata',
        urls,
        frames,
        stacks,
        nodes,
      },
    };
  }
}

export default NodeStackTraces;
