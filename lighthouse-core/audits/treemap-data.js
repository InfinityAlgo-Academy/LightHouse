/**
 * @license Copyright 2020 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @fileoverview
 * Creates treemap data for treemap app.
 */

const Audit = require('./audit.js');
const JsBundles = require('../computed/js-bundles.js');
const UnusedJavaScriptSummary = require('../computed/unused-javascript-summary.js');
const ModuleDuplication = require('../computed/module-duplication.js');
const NetworkRecords = require('../computed/network-records.js');
const ResourceSummary = require('../computed/resource-summary.js');

/**
 * A collection of root nodes, grouped by type.
 * @typedef {Record<string, RootNode[]>} TreemapData
 */

/**
 * @typedef RootNode
 * @property {string} name Arbitrary name identifier. Usually a script url.
 * @property {Node} node
 */

/**
 * @typedef Node
 * @property {string} name Arbitrary name identifier. Usually a path component from a source map.
 * @property {number} resourceBytes
 * @property {number=} unusedBytes
 * @property {number=} executionTime
 * @property {string=} duplicate If present, this module is a duplicate. String is normalized source path. See ModuleDuplication.normalizeSource
 * @property {Node[]=} children
 */

/**
 * @typedef {Omit<Node, 'name'|'children'>} SourceData
 */

class TreemapDataAudit extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'treemap-data',
      scoreDisplayMode: Audit.SCORING_MODES.INFORMATIVE,
      title: 'Treemap Data',
      description: 'Used for treemap app',
      requiredArtifacts:
        ['traces', 'devtoolsLogs', 'SourceMaps', 'ScriptElements', 'JsUsage', 'URL'],
    };
  }

  /**
   * Returns a tree data structure where leaf nodes are sources (ie. real files from source tree)
   * from a source map, and non-leaf nodes are directories. Leaf nodes have data
   * for bytes, coverage, etc., when available, and non-leaf nodes have the
   * same data as the sum of all descendant leaf nodes.
   * @param {string} sourceRoot
   * @param {Record<string, SourceData>} sourcesData
   * @return {Node}
   */
  static prepareTreemapNodes(sourceRoot, sourcesData) {
    /**
     * @param {string} name
     * @return {Node}
     */
    function newNode(name) {
      return {
        name,
        resourceBytes: 0,
      };
    }

    /**
     * Given a slash-delimited path, traverse the Node structure and increment
     * the data provided for each node in the chain. Creates nodes as needed.
     * Ex: path/to/file.js will find or create "path" on `node`, increment the data fields,
     *     and continue with "to", and so on.
     * @param {string} source
     * @param {SourceData} data
     * @param {Node} node
     */
    function addNode(source, data, node) {
      // Strip off the shared root.
      const sourcePathSegments = source.replace(sourceRoot, '').split(/\/+/);
      sourcePathSegments.forEach((sourcePathSegment, i) => {
        const isLastSegment = i === sourcePathSegments.length - 1;

        let child = node.children && node.children.find(child => child.name === sourcePathSegment);
        if (!child) {
          child = newNode(sourcePathSegment);
          node.children = node.children || [];
          node.children.push(child);
        }
        node = child;

        // Now that we've found or created the next node in the path, apply the data.
        node.resourceBytes += data.resourceBytes;
        if (data.unusedBytes) node.unusedBytes = (node.unusedBytes || 0) + data.unusedBytes;
        if (data.duplicate !== undefined && isLastSegment) {
          node.duplicate = data.duplicate;
        }
      });
    }

    const rootNode = newNode(sourceRoot);

    // For every source file, apply the data to all components
    // of the source path, creating nodes as necessary.
    for (const [source, data] of Object.entries(sourcesData)) {
      addNode(source || `<unmapped>`, data, rootNode);

      // Apply the data to the rootNode.
      rootNode.resourceBytes += data.resourceBytes;
      if (data.unusedBytes) rootNode.unusedBytes = (rootNode.unusedBytes || 0) + data.unusedBytes;
    }

    /**
     * Collapse nodes that have only one child.
     * @param {Node} node
     */
    function collapse(node) {
      while (node.children && node.children.length === 1) {
        node.name += '/' + node.children[0].name;
        node.children = node.children[0].children;
      }

      if (node.children) {
        for (const child of node.children) {
          collapse(child);
        }
      }
    }
    collapse(rootNode);

    // TODO(cjamcl): Should this structure be flattened for space savings?
    // Like DOM Snapshot.
    // Less JSON (no super nested children, and no repeated property names).

    return rootNode;
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<RootNode[]>}
   */
  static async makeJavaScriptRootNodes(artifacts, context) {
    /** @type {RootNode[]} */
    const rootNodes = [];

    const bundles = await JsBundles.request(artifacts, context);
    const duplication = await ModuleDuplication.request(artifacts, context);

    let inlineScriptLength = 0;
    for (const scriptElement of artifacts.ScriptElements) {
      // No src means script is inline.
      // Combine these ScriptElements so that inline scripts show up as a single root node.
      if (!scriptElement.src) {
        inlineScriptLength += (scriptElement.content || '').length;
      }
    }
    if (inlineScriptLength) {
      const name = artifacts.URL.finalUrl;
      rootNodes.push({
        name,
        node: {
          name,
          resourceBytes: inlineScriptLength,
          unusedBytes: 0,
          executionTime: 0,
        },
      });
    }

    for (const scriptElement of artifacts.ScriptElements) {
      if (!scriptElement.src) {
        continue;
      }

      const bundle = bundles.find(bundle => scriptElement.src === bundle.script.src);
      // No source map for this script, so skip the rest of this.
      if (!bundle) continue;

      const scriptCoverages = artifacts.JsUsage[scriptElement.src];
      if (!scriptCoverages) continue;

      const unusedJavascriptSummary = await UnusedJavaScriptSummary.request(
        {url: scriptElement.src, scriptCoverages, bundle}, context);

      const length = (scriptElement.content || '').length;
      const name = scriptElement.src;

      let node;
      if (bundle && unusedJavascriptSummary && unusedJavascriptSummary.sourcesWastedBytes) {
        /** @type {Record<string, SourceData>} */
        const sourcesData = {};
        for (const source of Object.keys(bundle.sizes.files)) {
          /** @type {SourceData} */
          const sourceData = {
            resourceBytes: bundle.sizes.files[source],
          };

          if (unusedJavascriptSummary && unusedJavascriptSummary.sourcesWastedBytes) {
            sourceData.unusedBytes = unusedJavascriptSummary.sourcesWastedBytes[source];
          }

          const key = ModuleDuplication.normalizeSource(source);
          if (duplication.has(key)) sourceData.duplicate = key;

          sourcesData[source] = sourceData;
        }

        node = this.prepareTreemapNodes(bundle.rawMap.sourceRoot || '', sourcesData);
      } else if (unusedJavascriptSummary) {
        node = {
          name,
          resourceBytes: unusedJavascriptSummary.totalBytes,
          unusedBytes: unusedJavascriptSummary.wastedBytes,
          executionTime: 0,
        };
      } else {
        node = {
          name,
          resourceBytes: length,
          unusedBytes: 0,
          executionTime: 0,
        };
      }

      rootNodes.push({
        name,
        node,
      });
    }

    return rootNodes;
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<RootNode>}
   */
  static async makeResourceSummaryRootNode(artifacts, context) {
    const devtoolsLog = artifacts.devtoolsLogs[Audit.DEFAULT_PASS];
    const networkRecords = await NetworkRecords.request(devtoolsLog, context);

    const totalCount = networkRecords.length;
    let totalSize = 0;

    /** @type {Node[]} */
    const children = [];
    for (const networkRecord of networkRecords) {
      const resourceType = ResourceSummary.determineResourceType(networkRecord);

      let child = children.find(child => child.name === resourceType);
      if (!child) {
        child = {
          name: resourceType,
          resourceBytes: 0,
          children: [],
        };
        children.push(child);
      }

      totalSize += networkRecord.resourceSize;
      child.resourceBytes += networkRecord.resourceSize;

      child.children = child.children || [];
      child.children.push({
        name: networkRecord.url,
        resourceBytes: networkRecord.resourceSize,
      });
    }

    return {
      name: 'Resource Summary',
      node: {
        name: `${totalCount} requests`,
        resourceBytes: totalSize,
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
    /** @type {TreemapData} */
    const treemapData = {
      scripts: await TreemapDataAudit.makeJavaScriptRootNodes(artifacts, context),
      resources: [await TreemapDataAudit.makeResourceSummaryRootNode(artifacts, context)],
    };

    /** @type {LH.Audit.Details.DebugData} */
    const details = {
      type: 'debugdata',
      treemapData,
    };

    return {
      score: 1,
      details,
    };
  }
}

module.exports = TreemapDataAudit;
