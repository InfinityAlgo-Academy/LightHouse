/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('./audit.js');
const BundleAnalysis = require('../computed/bundle-analysis.js');

/**
 * TODO: this could be pulled into webtreemap-cdt
 * @param {LH.Artifacts.RawSourceMap} map
 * @param {Record<string, number>} sourceBytes
 */
function _prepareTreemapNodes(map, sourceBytes) {
  /**
   * @param {string} id
   */
  function newNode(id) {
    return {
      id,
      size: 0,
    };
  }

  /**
   *
   * @param {string} source
   * @param {number} size
   * @param {*} node
   */
  function addNode(source, size, node) {
    const sourcePathSegments = source.replace(sharedPrefix, '').split('/');
    node.size += size;

    sourcePathSegments.forEach(sourcePathSegment => {
      if (!node.children) {
        node.children = [];
      }

      let child = node.children.find(child => child.id === sourcePathSegment);

      if (!child) {
        child = newNode(sourcePathSegment);
        node.children.push(child);
      }
      node = child;
      node.size += size;
    });
  }

  // DFS to generate each treemap node's text
  /**
   *
   * @param {any} node
   * @param {number} total
   */
  function addSizeToTitle(node, total) {
    const size = node.size;
    // node.id += ` • ${Number.bytesToString(size)} • ${Common.UIString('%.1f\xa0%%', size / total * 100)}`;
    node.id += ` • ${Math.round(size)} • ${Math.round(size / total * 100)}`;
    if (node.children) {
      for (const child of node.children) {
        addSizeToTitle(child, total);
      }
    }
  }

  const rootNode = newNode('/');

  // Strip off any shared string prefix, eg. webpack://./webpack/node_modules
  // const sharedPrefix = TextUtils.TextUtils.commonPrefix(sourceBytes.keysArray().filter(key => key !== null));
  // this does most of the above:
  const sharedPrefix = map.sourceRoot || '';

  for (const [sourceURL, bytes] of Object.entries(sourceBytes)) {
    const source = sourceURL === null ? `<unmapped>` : sourceURL;
    addNode(source, bytes, rootNode);
  }

  addSizeToTitle(rootNode, rootNode.size);

  return rootNode;
}

class BundleVisualizationData extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'bundle-visualization-data',
      scoreDisplayMode: Audit.SCORING_MODES.INFORMATIVE,
      title: 'Bundle Visualization Data',
      description: 'Used fom treemap.',
      requiredArtifacts: ['traces', 'devtoolsLogs', 'SourceMaps', 'ScriptElements'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const bundles = await BundleAnalysis.request(artifacts, context);

    /** @type {Record<string, any>} */
    const rootNodes = {};
    for (const {map, script, sizes} of bundles) {
      if (!script.src) continue; // Make typescript happy.
      rootNodes[script.src] = _prepareTreemapNodes(map, sizes.files);
    }

    /** @type {LH.Audit.Details.DebugData} */
    const details = {
      type: 'debugdata',
      rootNodes,
    };

    return {
      score: 1,
      details,
    };
  }
}

module.exports = BundleVisualizationData;
