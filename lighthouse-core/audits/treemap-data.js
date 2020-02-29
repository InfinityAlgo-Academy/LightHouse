/**
 * @license Copyright 2020 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('./audit.js');
const JsBundles = require('../computed/js-bundles.js');
const UnusedJavaScriptSummary = require('../computed/unused-javascript-summary.js');
const NetworkRecords = require('../computed/network-records.js');
const ResourceSummary = require('../computed/resource-summary.js');

/**
 * @typedef SourceData
 * @property {number} size
 * @property {number=} wastedBytes
 */

/**
 * @typedef RootNode
 * @property {string} id
 * @property {string} group
 * @property {Node} node
 */

/**
 * @typedef Node
 * @property {string} id
 * @property {number} size
 * @property {number=} wastedBytes
 * @property {Node[]=} children
 * @property {string[]=} tags
 */

/**
 * @param {LH.Artifacts.RawSourceMap} map
 * @param {Record<string, SourceData>} sourcesData
 */
function prepareTreemapNodes(map, sourcesData) {
  /**
   * @param {string} id
   */
  function newNode(id) {
    return {
      id,
      size: 0,
      wastedBytes: 0,
    };
  }

  /**
   * @param {string} source
   * @param {SourceData} data
   * @param {*} node
   */
  function addNode(source, data, node) {
    // Strip off the shared root.
    const sourcePathSegments = source.replace(map.sourceRoot || '', '').split('/');
    node.size += data.size;
    if (data.wastedBytes) node.wastedBytes += data.wastedBytes;

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
      node.size += data.size;
      if (data.wastedBytes) node.wastedBytes += data.wastedBytes;
    });
  }

  const rootNode = newNode('/');
  for (const [source, data] of Object.entries(sourcesData)) {
    addNode(source || `<unmapped>`, data, rootNode);
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

  // TODO(cjamcl): Should this structure be flattened for space savings?
  // Less JSON (no super nested children, and no repeated property names).

  return rootNode;
}

class TreemapData extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'treemap-data',
      scoreDisplayMode: Audit.SCORING_MODES.INFORMATIVE,
      title: 'Treemap Data',
      description: 'Used for treemap visualization.',
      requiredArtifacts: ['traces', 'devtoolsLogs', 'SourceMaps', 'ScriptElements', 'JsUsage', 'URL'],
    };
  }

  /**
   * @param {LH.Artifacts.Bundle} bundle
   * @param {LH.Artifacts.NetworkRequest[]} networkRecords
   * @param {LH.Artifacts['JsUsage']} JsUsage
   * @param {LH.Audit.Context} context
   */
  static async getSourcesWastedBytes(bundle, networkRecords, JsUsage, context) {
    const networkRecord = networkRecords.find(record => record.url === bundle.script.src);
    if (!networkRecord) return;
    const scriptCoverages = JsUsage[bundle.script.src || ''];
    if (!scriptCoverages) return;
    const unusedJsSumary =
      await UnusedJavaScriptSummary.request({ networkRecord, scriptCoverages, bundle }, context);
    return unusedJsSumary.sourcesWastedBytes;
  }

  /**
   * @param {LH.Artifacts.ScriptElement} ScriptElement
   * @param {LH.Artifacts.Bundle[]} bundles
   * @param {LH.Artifacts.NetworkRequest[]} networkRecords
   * @param {LH.Artifacts['JsUsage']} JsUsage
   * @param {LH.Audit.Context} context
   */
  static async getUnusedJavascriptSummary(ScriptElement, bundles, networkRecords, JsUsage, context) {
    const bundle = bundles.find(bundle => bundle.script.src === bundle.script.src);
    const networkRecord = networkRecords.find(record => record.url === ScriptElement.src);
    if (!networkRecord) return;
    const scriptCoverages = JsUsage[ScriptElement.src || ''];
    if (!scriptCoverages) return;
    const unusedJsSumary =
      await UnusedJavaScriptSummary.request({ networkRecord, scriptCoverages, bundle }, context);
    return unusedJsSumary;
  }

  /**
   * @param {Record<string, {count: number, size: number}>} resourceSummary 
   */
  static makeResourceSummaryRootNode(resourceSummary) {
    let totalCount = 0;
    let totalSize = 0;

    const children = [];
    for (const [resourceType, { count, size }] of Object.entries(resourceSummary)) {
      if (resourceType === 'third-party') continue;
      if (resourceType === 'total') {
        totalCount = count;
        totalSize = size;
        continue;
      }

      children.push({
        id: `${resourceType} (${count})`,
        size,
      });
    }

    return {
      id: 'Resource Summary',
      group: 'misc',
      node: {
        id: `${totalCount} requests`,
        size: totalSize,
        children,
      },
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const bundles = await JsBundles.request(artifacts, context);
    const devtoolsLog = artifacts.devtoolsLogs[Audit.DEFAULT_PASS];
    const networkRecords = await NetworkRecords.request(devtoolsLog, context);

    /** @type {RootNode[]} */
    const rootNodes = [];
    for (const ScriptElement of artifacts.ScriptElements) {
      const bundle = bundles.find(bundle => bundle.script.src === ScriptElement.src);
      const unusedJavascriptSummary = await TreemapData.getUnusedJavascriptSummary(
        ScriptElement, bundles, networkRecords, artifacts.JsUsage, context);
      const id = ScriptElement.src || `inline (${ScriptElement.devtoolsNodePath})`;

      let node;
      if (bundle && unusedJavascriptSummary && unusedJavascriptSummary.sourcesWastedBytes) {
        /** @type {Record<string, SourceData>} */
        const sourcesData = {};
        for (const source of Object.keys(bundle.sizes.files)) {
          sourcesData[source] = {
            size: bundle.sizes.files[source],
            wastedBytes: unusedJavascriptSummary.sourcesWastedBytes[source],
          };
        }
        node = prepareTreemapNodes(bundle.rawMap, sourcesData);
      } else if (unusedJavascriptSummary) {
        node = {
          id,
          size: unusedJavascriptSummary.totalBytes,
          wastedBytes: unusedJavascriptSummary.wastedBytes,
        };
      } else {
        // ...?
        node = {
          id,
          size: ScriptElement.content ? ScriptElement.content.length : 0,
          wastedBytes: 0,
        };
      }

      rootNodes.push({
        id,
        group: 'javascript',
        node,
      });
    }

    const resourceSummary =
      await ResourceSummary.compute_({ URL: artifacts.URL, devtoolsLog }, context);
    rootNodes.push(TreemapData.makeResourceSummaryRootNode(resourceSummary));

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

module.exports = TreemapData;
