/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('./audit.js');
const BundleAnalysis = require('../computed/bundle-analysis.js');

/**
 * @param {LH.Artifacts.RawSourceMap} map
 * @param {Record<string, number>} sourceBytes
 */
function prepareTreemapNodes(map, sourceBytes) {
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
    // Strip off the shared root.
    const sourcePathSegments = source.replace(map.sourceRoot || '', '').split('/');
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


  const rootNode = newNode('/');
  for (const [sourceURL, bytes] of Object.entries(sourceBytes)) {
    const source = sourceURL === null ? `<unmapped>` : sourceURL;
    addNode(source, bytes, rootNode);
  }

  /**
   * Collapse nodes that have just one child + grandchild.
   * @param {*} node
   * @param {*} parent
   */
  function collapse(node, parent) {
    if (parent && parent.children && parent.children.length === 1 && node.children && node.children.length === 1) {
      parent.id += '/' + node.id;
      parent.children = node.children;
    }

    if (node.children) {
      for (const child of node.children) {
        collapse(child, node);
      }
    }
  }
  collapse(rootNode, null);

  // sizes for a 1163017 byte bundle
  // first impl - 26779 bytes
  // collapse - 25914 bytes
  // defer addSizeToTitle - 20491 bytes
  // TODO: flatten to get more savings.

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
      rootNodes[script.src] = prepareTreemapNodes(map, sizes.files);
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
