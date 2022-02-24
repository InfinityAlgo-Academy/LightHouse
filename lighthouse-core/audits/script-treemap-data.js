/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @fileoverview
 * Creates nodes for treemap app.
 * Example output: treemap/app/debug.json
 */

/**
 * @typedef {Omit<LH.Treemap.Node, 'name'|'children'>} SourceData
 */

const Audit = require('./audit.js');
const JsBundles = require('../computed/js-bundles.js');
const UnusedJavaScriptSummary = require('../computed/unused-javascript-summary.js');
const ModuleDuplication = require('../computed/module-duplication.js');

class ScriptTreemapDataAudit extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'script-treemap-data',
      scoreDisplayMode: Audit.SCORING_MODES.INFORMATIVE,
      title: 'Script Treemap Data',
      description: 'Used for treemap app',
      requiredArtifacts:
        ['traces', 'devtoolsLogs', 'SourceMaps', 'Scripts', 'JsUsage', 'URL'],
    };
  }

  /**
   * Returns a tree data structure where leaf nodes are sources (ie. real files from source tree)
   * from a source map, and non-leaf nodes are directories. Leaf nodes have data
   * for bytes, coverage, etc., when available, and non-leaf nodes have the
   * same data as the sum of all descendant leaf nodes.
   * @param {string} src
   * @param {string} sourceRoot
   * @param {Record<string, SourceData>} sourcesData
   * @return {LH.Treemap.Node}
   */
  static makeScriptNode(src, sourceRoot, sourcesData) {
    /**
     * @param {string} name
     * @return {LH.Treemap.Node}
     */
    function newNode(name) {
      return {
        name,
        resourceBytes: 0,
      };
    }

    const sourceRootNode = newNode(sourceRoot);

    /**
     * Given a slash-delimited path, traverse the Node structure and increment
     * the data provided for each node in the chain. Creates nodes as needed.
     * Ex: path/to/file.js will find or create "path" on `node`, increment the data fields,
     *     and continue with "to", and so on.
     * @param {string} source
     * @param {SourceData} data
     */
    function addAllNodesInSourcePath(source, data) {
      let node = sourceRootNode;

      // Apply the data to the sourceRootNode.
      sourceRootNode.resourceBytes += data.resourceBytes;
      if (data.unusedBytes) {
        sourceRootNode.unusedBytes = (sourceRootNode.unusedBytes || 0) + data.unusedBytes;
      }

      // Strip off the shared root.
      const sourcePathSegments = source.replace(sourceRoot, '').split(/\/+/);
      sourcePathSegments.forEach((sourcePathSegment, i) => {
        if (sourcePathSegment.length === 0) return;

        const isLeaf = i === sourcePathSegments.length - 1;

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

        // Only leaf nodes might have duplication data.
        if (isLeaf && data.duplicatedNormalizedModuleName !== undefined) {
          node.duplicatedNormalizedModuleName = data.duplicatedNormalizedModuleName;
        }
      });
    }

    // For every source file, apply the data to all components
    // of the source path, creating nodes as necessary.
    for (const [source, data] of Object.entries(sourcesData)) {
      addAllNodesInSourcePath(source, data);
    }

    /**
     * Collapse nodes that have only one child.
     * @param {LH.Treemap.Node} node
     */
    function collapseAll(node) {
      while (node.children && node.children.length === 1) {
        node.name += '/' + node.children[0].name;
        node.children = node.children[0].children;
      }

      if (node.children) {
        for (const child of node.children) {
          collapseAll(child);
        }
      }
    }
    collapseAll(sourceRootNode);

    // If sourceRootNode.name is falsy (no defined sourceRoot + no collapsed common prefix),
    // collapse the sourceRootNode children into the scriptNode.
    // Otherwise, we add another node.
    if (!sourceRootNode.name) {
      return {
        ...sourceRootNode,
        name: src,
        children: sourceRootNode.children,
      };
    }

    // Script node should be just the script src.
    const scriptNode = {...sourceRootNode};
    scriptNode.name = src;
    scriptNode.children = [sourceRootNode];
    return scriptNode;
  }

  /**
   * Returns nodes where the first level of nodes are URLs.
   * Every external script has a node.
   * All inline scripts are combined into a single node.
   * If a script has a source map, that node will be set by makeNodeFromSourceMapData.
   *
   * Example return result:
     - index.html (inlines scripts)
     - main.js
     - - webpack://
     - - - react.js
     - - - app.js
     - i-have-no-map.js
   *
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Treemap.Node[]>}
   */
  static async makeNodes(artifacts, context) {
    /** @type {LH.Treemap.Node[]} */
    const nodes = [];

    // Combine inline scripts so they show up as a single root node.
    let inlineScriptLength = 0;
    for (const script of artifacts.Scripts) {
      if (script.url === artifacts.URL.finalUrl) {
        inlineScriptLength += script.length || 0;
      }
    }
    if (inlineScriptLength) {
      const name = artifacts.URL.finalUrl;
      nodes.push({
        name,
        resourceBytes: inlineScriptLength,
      });
    }

    const bundles = await JsBundles.request(artifacts, context);
    const duplicationByPath = await ModuleDuplication.request(artifacts, context);

    // First we handle scripts inlined inside the HTML.
    //
    // In the simplest case, no inline scripts have source maps and the result is
    // a single node that combines the bytes from every inline script.
    //
    //     <node src=/page-being-audited.html resourceBytes=1000 unusedBytes=100>
    //
    // TODO
    // But when there are inline scripts with a source map (or with a sourceMapUrl),
    // all the scripts without one will go into their own node and each other script
    // will get their own node.
    //
    //     <node /page-being-audited.html resourceBytes=1000 unusedBytes=100>
    //         <node (inlined) resourceBytes=500 unusedBytes=50>
    //         <node some-magic-comment-script.js resourceBytes=500 unusedBytes=50>
    //             <node main.js resourceBytes=500 unusedBytes=50>
    //
    // TODO
    // In the most complex cases, there are multiple HTML urls to consider (iframes).
    // const inlineScripts =
    //   artifacts.Scripts.filter((s) => s.url === artifacts.URL.finalUrl);
    // console.log(bundles.map(b => [b.script.scriptId, b.script.url]));
    // if (inlineScripts.length) {
    //   let resourceBytes = 0;
    //   for (const script of inlineScripts) {
    //     resourceBytes += (script.content || '').length;
    //     console.log(bundles.find(b => b.script.scriptId === script.scriptId));
    //   }

    //   const scriptCoverages = artifacts.JsUsage[artifacts.URL.finalUrl] || [];
    //   const unusedJavascriptSummary = await UnusedJavaScriptSummary.request(
    //     {url: artifacts.URL.finalUrl, scriptCoverages}, context);

    //   let theRestOfResourceBytes = resourceBytes;
    //   let theRestOfUnusedBytes = unusedJavascriptSummary.wastedBytes;
    //   const children = [];
    //   for (const script of inlineScripts) {
    //     // IF sourceURL=
    //     // IF has source map
    //     const scriptId = '?';
    //     const coverage = scriptCoverages.find(s => s.scriptId === scriptId);
    //     if (coverage) {
    //       const unusedJavascriptSummary = await UnusedJavaScriptSummary.request(
    //         {url: artifacts.URL.finalUrl, scriptCoverages: [coverage]}, context);
    //       const childResourceBytes = script.length || 0;
    //       // console.log(script.length);
    //       const childUnusedBytes = unusedJavascriptSummary.wastedBytes;
    //       children.push({
    //         name: scriptId,
    //         resourceBytes: childResourceBytes,
    //         unusedBytes: childUnusedBytes,
    //       });
    //       theRestOfResourceBytes -= childResourceBytes;
    //       theRestOfUnusedBytes -= childUnusedBytes;
    //     }
    //   }

    //   if (children.length) {
    //     children.unshift({
    //       name: '(inlined)',
    //       resourceBytes: theRestOfResourceBytes,
    //       unusedBytes: theRestOfUnusedBytes,
    //     });
    //     /** @type {LH.Treemap.Node} */
    //     const node = {
    //       name: artifacts.URL.finalUrl,
    //       resourceBytes,
    //       unusedBytes: unusedJavascriptSummary.wastedBytes,
    //       children,
    //     };
    //     nodes.push(node);
    //   } else {
    //     /** @type {LH.Treemap.Node} */
    //     const node = {
    //       name: artifacts.URL.finalUrl,
    //       resourceBytes,
    //       unusedBytes: unusedJavascriptSummary.wastedBytes,
    //     };
    //     nodes.push(node);
    //   }
    // }

    for (const script of artifacts.Scripts) {
      if (script.url === artifacts.URL.finalUrl) continue; // Already handled above.

      const name = script.name;
      const bundle = bundles.find(bundle => script.scriptId === bundle.script.scriptId);
      const scriptCoverage = artifacts.JsUsage[script.scriptId];
      if (!bundle && !scriptCoverage) {
        // No bundle and no coverage information, so simply make a single node
        // detailing how big the script is.

        nodes.push({
          name,
          resourceBytes: script.length || 0,
        });
        continue;
      }

      const unusedJavascriptSummary = await UnusedJavaScriptSummary.request(
        {scriptId: script.scriptId, scriptCoverage, bundle}, context);

      /** @type {LH.Treemap.Node} */
      let node;
      if (bundle && !('errorMessage' in bundle.sizes)) {
        // Create nodes for each module in a bundle.

        /** @type {Record<string, SourceData>} */
        const sourcesData = {};
        for (const source of Object.keys(bundle.sizes.files)) {
          /** @type {SourceData} */
          const sourceData = {
            resourceBytes: bundle.sizes.files[source],
          };

          if (unusedJavascriptSummary.sourcesWastedBytes) {
            sourceData.unusedBytes = unusedJavascriptSummary.sourcesWastedBytes[source];
          }

          // ModuleDuplication uses keys without the source root prepended, but
          // bundle.sizes uses keys with it prepended, so we remove the source root before
          // using it with duplicationByPath.
          let sourceWithoutSourceRoot = source;
          if (bundle.rawMap.sourceRoot && source.startsWith(bundle.rawMap.sourceRoot)) {
            sourceWithoutSourceRoot = source.replace(bundle.rawMap.sourceRoot, '');
          }

          const key = ModuleDuplication.normalizeSource(sourceWithoutSourceRoot);
          if (duplicationByPath.has(key)) sourceData.duplicatedNormalizedModuleName = key;

          sourcesData[source] = sourceData;
        }

        if (bundle.sizes.unmappedBytes) {
          /** @type {SourceData} */
          const sourceData = {
            resourceBytes: bundle.sizes.unmappedBytes,
          };
          if (unusedJavascriptSummary.sourcesWastedBytes) {
            sourceData.unusedBytes = unusedJavascriptSummary.sourcesWastedBytes['(unmapped)'];
          }
          sourcesData['(unmapped)'] = sourceData;
        }

        node = this.makeScriptNode(name, bundle.rawMap.sourceRoot || '', sourcesData);
      } else {
        // No valid source map for this script, so we can only produce a single node.

        node = {
          name,
          resourceBytes: unusedJavascriptSummary.totalBytes,
          unusedBytes: unusedJavascriptSummary.wastedBytes,
        };
      }

      nodes.push(node);
    }

    return nodes;
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const nodes = await ScriptTreemapDataAudit.makeNodes(artifacts, context);

    /** @type {LH.Audit.Details.TreemapData} */
    const details = {
      type: 'treemap-data',
      nodes,
    };

    return {
      score: 1,
      details,
    };
  }
}

module.exports = ScriptTreemapDataAudit;
