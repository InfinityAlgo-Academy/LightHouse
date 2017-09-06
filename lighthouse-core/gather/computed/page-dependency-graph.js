/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const ComputedArtifact = require('./computed-artifact');
const NetworkNode = require('./dependency-graph/network-node');
const GraphEstimator = require('./dependency-graph/estimator/estimator');

class PageDependencyGraphArtifact extends ComputedArtifact {
  get name() {
    return 'PageDependencyGraph';
  }

  get requiredNumberOfArtifacts() {
    return 2;
  }

  /**
   * @param {!WebInspector.NetworkRequest} record
   * @return {!Array<string>}
   */
  static getNetworkInitiators(record) {
    if (!record._initiator) return [];
    if (record._initiator.url) return [record._initiator.url];
    if (record._initiator.type === 'script') {
      const frames = record._initiator.stack.callFrames;
      return Array.from(new Set(frames.map(frame => frame.url))).filter(Boolean);
    }

    return [];
  }

  /**
   * @param {!TraceOfTabArtifact} traceOfTab
   * @param {!Array<!WebInspector.NetworkRequest>} networkRecords
   * @return {!Node}
   */
  static createGraph(traceOfTab, networkRecords) {
    const idToNodeMap = new Map();
    const urlToNodeMap = new Map();

    networkRecords.forEach(record => {
      const node = new NetworkNode(record);
      idToNodeMap.set(record.requestId, node);

      if (urlToNodeMap.has(record.url)) {
        // If duplicate requests have been made to this URL we can't be certain which node is being
        // referenced, so act like we don't know the URL at all.
        urlToNodeMap.set(record.url, undefined);
      } else {
        urlToNodeMap.set(record.url, node);
      }
    });

    const rootRequest = networkRecords
        .reduce((min, next) => min.startTime < next.startTime ? min : next);
    const rootNode = idToNodeMap.get(rootRequest.requestId);
    networkRecords.forEach(record => {
      const initiators = PageDependencyGraphArtifact.getNetworkInitiators(record);
      const node = idToNodeMap.get(record.requestId);
      if (initiators.length) {
        initiators.forEach(initiator => {
          const parent = urlToNodeMap.get(initiator) || rootNode;
          parent.addDependent(node);
        });
      } else if (record !== rootRequest) {
        rootNode.addDependent(node);
      }
    });

    return rootNode;
  }

  /**
   * @param {!Node} rootNode
   * @return {number}
   */
  static computeGraphDuration(rootNode) {
    return new GraphEstimator(rootNode).estimate();
  }

  /**
   *
   * @param {!Node} rootNode
   */
  static printGraph(rootNode, widthInCharacters = 100) {
    function padRight(str, target, padChar = ' ') {
      return str + padChar.repeat(Math.max(target - str.length, 0));
    }

    const nodes = [];
    rootNode.traverse(node => nodes.push(node));
    nodes.sort((a, b) => a.startTime - b.startTime);

    const min = nodes[0].startTime;
    const max = nodes.reduce((max, node) => Math.max(max, node.endTime), 0);

    const totalTime = max - min;
    const timePerCharacter = totalTime / widthInCharacters;
    nodes.forEach(node => {
      const offset = Math.round((node.startTime - min) / timePerCharacter);
      const length = Math.ceil((node.endTime - node.startTime) / timePerCharacter);
      const bar = padRight('', offset) + padRight('', length, '=');
      // eslint-disable-next-line
      console.log(padRight(bar, widthInCharacters), `| ${node.record._url.slice(0, 30)}`);
    });
  }

  /**
   * @param {!Trace} trace
   * @param {!DevtoolsLog} devtoolsLog
   * @param {!ComputedArtifacts} artifacts
   * @return {!Promise<!Node>}
   */
  compute_(trace, devtoolsLog, artifacts) {
    const promises = [
      artifacts.requestTraceOfTab(trace),
      artifacts.requestNetworkRecords(devtoolsLog),
    ];

    return Promise.all(promises).then(([traceOfTab, networkRecords]) => {
      return PageDependencyGraphArtifact.createGraph(traceOfTab, networkRecords);
    });
  }
}

module.exports = PageDependencyGraphArtifact;
