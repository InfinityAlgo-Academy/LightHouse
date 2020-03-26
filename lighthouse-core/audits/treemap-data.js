/**
 * @license Copyright 2020 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('./audit.js');
const JsBundles = require('../computed/js-bundles.js');
const UnusedJavaScriptSummary = require('../computed/unused-javascript-summary.js');
const ModuleDuplication = require('../computed/module-duplication.js');
const NetworkRecords = require('../computed/network-records.js');
const ResourceSummary = require('../computed/resource-summary.js');
const BootupTime = require('../audits/bootup-time.js');
const MainThreadTasks = require('../computed/main-thread-tasks.js');
const {taskGroups} = require('../lib/tracehouse/task-groups.js');

/**
 * @typedef SourceData
 * @property {number} bytes
 * @property {number=} wastedBytes
 * @property {boolean=} duplicate
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
 * @property {number=} bytes
 * @property {number=} executionTime
 * @property {boolean=} duplicate
 * @property {Node[]=} children
 * @property {string[]=} tags
 */

/**
 * @param {LH.Artifacts.RawSourceMap} map
 * @param {Record<string, SourceData>} sourcesData
 * @return {Node}
 */
function prepareTreemapNodes(map, sourcesData) {
  /**
   * @param {string} id
   */
  function newNode(id) {
    return {
      id,
      bytes: 0,
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
    node.bytes += data.bytes;
    if (data.wastedBytes) node.wastedBytes += data.wastedBytes;

    sourcePathSegments.forEach((sourcePathSegment, i) => {
      if (!node.children) {
        node.children = [];
      }

      let child = node.children.find(child => child.id === sourcePathSegment);

      if (!child) {
        child = newNode(sourcePathSegment);
        node.children.push(child);
      }
      node = child;
      node.bytes += data.bytes;
      if (data.wastedBytes) node.wastedBytes += data.wastedBytes;
      if (data.duplicate !== undefined && i === sourcePathSegments.length - 1) {
        node.duplicate = data.duplicate;
      }
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
      await UnusedJavaScriptSummary.request({networkRecord, scriptCoverages, bundle}, context);
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
      await UnusedJavaScriptSummary.request({networkRecord, scriptCoverages, bundle}, context);
    return unusedJsSumary;
  }

  /**
   * @param {Record<string, {count: number, size: number}>} resourceSummary
   */
  static makeResourceSummaryRootNode(resourceSummary) {
    let totalCount = 0;
    let totalSize = 0;

    const children = [];
    for (const [resourceType, {count, size}] of Object.entries(resourceSummary)) {
      if (resourceType === 'third-party') continue;
      if (resourceType === 'total') {
        totalCount = count;
        totalSize = size;
        continue;
      }

      children.push({
        id: `${resourceType} (${count})`,
        bytes: size,
      });
    }

    return {
      id: 'Resource Summary',
      group: 'misc',
      node: {
        id: `${totalCount} requests`,
        bytes: totalSize,
        children,
      },
    };
  }

  /**
   * temporary code
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   */
  static async getExecutionTimings(artifacts, context) {
    const trace = artifacts.traces[BootupTime.DEFAULT_PASS];
    const devtoolsLog = artifacts.devtoolsLogs[BootupTime.DEFAULT_PASS];
    const networkRecords = await NetworkRecords.request(devtoolsLog, context);
    const tasks = await MainThreadTasks.request(trace, context);
    // const multiplier = settings.throttlingMethod === 'simulate' ?
    //   settings.throttling.cpuSlowdownMultiplier : 1;
    const multiplier = 1;

    const jsURLs = BootupTime.getJavaScriptURLs(networkRecords);
    const executionTimings = BootupTime.getExecutionTimingsByURL(tasks, jsURLs);

    let totalBootupTime = 0;
    return Array.from(executionTimings)
      .map(([url, timingByGroupId]) => {
        // Add up the totalExecutionTime for all the taskGroups
        let totalExecutionTimeForURL = 0;
        for (const [groupId, timespanMs] of Object.entries(timingByGroupId)) {
          timingByGroupId[groupId] = timespanMs * multiplier;
          totalExecutionTimeForURL += timespanMs * multiplier;
        }

        const scriptingTotal = timingByGroupId[taskGroups.scriptEvaluation.id] || 0;
        const parseCompileTotal = timingByGroupId[taskGroups.scriptParseCompile.id] || 0;

        // Add up all the JavaScript time of shown URLs
        // if (totalExecutionTimeForURL >= context.options.thresholdInMs) {
        totalBootupTime += scriptingTotal + parseCompileTotal;
        // }

        // hadExcessiveChromeExtension = hadExcessiveChromeExtension ||
        //   (url.startsWith('chrome-extension:') && scriptingTotal > 100);

        return {
          url: url,
          total: totalExecutionTimeForURL,
          // Highlight the JavaScript task costs
          scripting: scriptingTotal,
          scriptParseCompile: parseCompileTotal,
        };
      })
      .sort((a, b) => b.total - a.total);
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const bundles = await JsBundles.request(artifacts, context);
    const duplication = await ModuleDuplication.request(artifacts, context);
    const devtoolsLog = artifacts.devtoolsLogs[Audit.DEFAULT_PASS];
    const networkRecords = await NetworkRecords.request(devtoolsLog, context);
    // TODO: this should be a computed artifact.
    const executionTimings = await TreemapData.getExecutionTimings(artifacts, context);

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
          /** @type {SourceData} */
          const sourceData = {
            bytes: bundle.sizes.files[source],
          };

          if (unusedJavascriptSummary && unusedJavascriptSummary.sourcesWastedBytes) {
            sourceData.wastedBytes = unusedJavascriptSummary.sourcesWastedBytes[source];
          }

          if (duplication) {
            const key = ModuleDuplication._normalizeSource(source);
            sourceData.duplicate = duplication.has(key);
          }

          sourcesData[source] = sourceData;
        }

        node = prepareTreemapNodes(bundle.rawMap, sourcesData);
      } else if (unusedJavascriptSummary) {
        node = {
          id,
          bytes: unusedJavascriptSummary.totalBytes,
          wastedBytes: unusedJavascriptSummary.wastedBytes,
        };
      } else {
        // ...?
        node = {
          id,
          bytes: ScriptElement.content ? ScriptElement.content.length : 0,
          wastedBytes: 0,
        };
      }

      // this probably doesn't work for inline?
      const executionTiming = executionTimings.find(timing => timing.url === ScriptElement.src);
      node.executionTime = executionTiming ? Math.round(executionTiming.total) : 0;

      rootNodes.push({
        id,
        group: 'javascript',
        node,
      });
    }

    const resourceSummary =
      await ResourceSummary.compute_({URL: artifacts.URL, devtoolsLog}, context);
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
