/**
 * @license Copyright 2020 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @fileoverview
 * Creates treemap data for webtreemap.
 */

const Audit = require('./audit.js');
const JsBundles = require('../computed/js-bundles.js');
const UnusedJavaScriptSummary = require('../computed/unused-javascript-summary.js');
const ModuleDuplication = require('../computed/module-duplication.js');
const NetworkRecords = require('../computed/network-records.js');
const ResourceSummary = require('../computed/resource-summary.js');

/**
 * @typedef {Record<string, RootNode[]>} TreemapData
 */

/**
 * @typedef RootNode
 * @property {string} name
 * @property {Node} node
 */

/**
 * @typedef Node
 * @property {string} name
 * @property {number} resourceBytes
 * @property {number=} unusedBytes
 * @property {number=} executionTime
 * @property {string=} duplicate
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
      description: 'Used for treemap visualization.',
      requiredArtifacts:
        ['traces', 'devtoolsLogs', 'SourceMaps', 'ScriptElements', 'JsUsage', 'URL'],
    };
  }

  /**
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
     * @param {*} node
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

    /** @type {Array<{src: string, length: number, unusedJavascriptSummary?: import('../computed/unused-javascript-summary.js').Summary}>} */
    const scriptData = [];
    const inlineScriptData = {
      src: artifacts.URL.finalUrl,
      length: 0,
    };
    for (const scriptElement of artifacts.ScriptElements) {
      // Normalize ScriptElements so that inline scripts show up as a single entity.
      if (!scriptElement.src) {
        inlineScriptData.length += (scriptElement.content || '').length;
        continue;
      }

      const url = scriptElement.src;
      const bundle = bundles.find(bundle => url === bundle.script.src);
      const scriptCoverages = artifacts.JsUsage[url];
      if (!bundle || !scriptCoverages) continue;

      scriptData.push({
        src: scriptElement.src,
        length: (scriptElement.content || '').length,
        unusedJavascriptSummary:
          await UnusedJavaScriptSummary.request({url, scriptCoverages, bundle}, context),
      });
    }
    if (inlineScriptData.length) scriptData.unshift(inlineScriptData);

    for (const {src, length, unusedJavascriptSummary} of scriptData) {
      const bundle = bundles.find(bundle => bundle.script.src === src);
      const name = src;

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

          if (duplication) {
            const key = ModuleDuplication._normalizeSource(source);
            if (duplication.has(key)) sourceData.duplicate = key;
          }

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
        // TODO ...?
        node = {
          name,
          resourceBytes: length,
          unusedBytes: 0,
          executionTime: 0,
        };
      }

      rootNodes.push({
        name: name,
        node,
      });
    }

    return rootNodes;
  }

  /**
   * @param {LH.Artifacts.Bundle[]} bundles
   * @param {string} url
   * @param {LH.Artifacts['JsUsage']} JsUsage
   * @param {LH.Audit.Context} context
   */
  static async getUnusedJavascriptSummary(bundles, url, JsUsage, context) {
    const bundle = bundles.find(bundle => url === bundle.script.src);
    const scriptCoverages = JsUsage[url];
    if (!scriptCoverages) return;

    const unusedJsSumary =
      await UnusedJavaScriptSummary.request({url, scriptCoverages, bundle}, context);
    return unusedJsSumary;
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<RootNode>}
   */
  static async makeResourceSummaryRootNode(artifacts, context) {
    const devtoolsLog = artifacts.devtoolsLogs[Audit.DEFAULT_PASS];
    const networkRecords = await NetworkRecords.request(devtoolsLog, context);
    const origin = new URL(artifacts.URL.finalUrl).origin;

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

      let name = networkRecord.url;
      // TODO ...
      if (name.startsWith(origin)) name = name.replace(origin, '/');
      child.children = child.children || [];
      child.children.push({
        name,
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
