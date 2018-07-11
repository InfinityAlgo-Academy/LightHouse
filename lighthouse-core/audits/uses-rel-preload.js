/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const URL = require('../lib/url-shim');
const Audit = require('./audit');
const UnusedBytes = require('./byte-efficiency/byte-efficiency-audit');
const THRESHOLD_IN_MS = 100;

class UsesRelPreloadAudit extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'uses-rel-preload',
      title: 'Preload key requests',
      description: 'Consider using <link rel=preload> to prioritize fetching late-discovered ' +
        'resources sooner. [Learn more](https://developers.google.com/web/tools/lighthouse/audits/preload).',
      requiredArtifacts: ['devtoolsLogs', 'traces', 'URL'],
      scoreDisplayMode: Audit.SCORING_MODES.NUMERIC,
    };
  }

  /**
   * @param {LH.Artifacts.CriticalRequestNode} chains
   * @param {number} maxLevel
   * @param {number=} minLevel
   */
  static _flattenRequests(chains, maxLevel, minLevel = 0) {
    /** @type {Array<LH.Artifacts.NetworkRequest>} */
    const requests = [];

    /**
     * @param {LH.Artifacts.CriticalRequestNode} chains
     * @param {number} level
     */
    const flatten = (chains, level) => {
      Object.keys(chains).forEach(chain => {
        if (chains[chain]) {
          const currentChain = chains[chain];
          if (level >= minLevel) {
            requests.push(currentChain.request);
          }

          if (level < maxLevel) {
            flatten(currentChain.children, level + 1);
          }
        }
      });
    };

    flatten(chains, 0);

    return requests;
  }

  /**
   *
   * @param {LH.Artifacts.NetworkRequest} request
   * @param {LH.Artifacts.NetworkRequest} mainResource
   * @return {boolean}
   */
  static shouldPreload(request, mainResource) {
    if (request.isLinkPreload || URL.NON_NETWORK_PROTOCOLS.includes(request.protocol)) {
      return false;
    }

    return URL.rootDomainsMatch(request.url, mainResource.url);
  }

  /**
   * Computes the estimated effect of preloading all the resources.
   * @param {Set<string>} urls The array of byte savings results per resource
   * @param {LH.Gatherer.Simulation.GraphNode} graph
   * @param {LH.Gatherer.Simulation.Simulator} simulator
   * @return {{wastedMs: number, results: Array<{url: string, wastedMs: number}>}}
   */
  static computeWasteWithGraph(urls, graph, simulator) {
    if (!urls.size) {
      return {wastedMs: 0, results: []};
    }

    // Preload changes the ordering of requests, simulate the original graph with flexible ordering
    // to have a reasonable baseline for comparison.
    const simulationBeforeChanges = simulator.simulate(graph, {flexibleOrdering: true});
    const modifiedGraph = graph.cloneWithRelationships();

    /** @type {Array<LH.Gatherer.Simulation.GraphNetworkNode>} */
    const nodesToPreload = [];
    /** @type {LH.Gatherer.Simulation.GraphNode|null} */
    let mainDocumentNode = null;
    modifiedGraph.traverse(node => {
      if (node.type !== 'network') return;

      const networkNode = /** @type {LH.Gatherer.Simulation.GraphNetworkNode} */ (node);
      if (node.isMainDocument()) {
        mainDocumentNode = networkNode;
      } else if (networkNode.record && urls.has(networkNode.record.url)) {
        nodesToPreload.push(networkNode);
      }
    });

    if (!mainDocumentNode) {
      // Should always find the main document node
      throw new Error('Could not find main document node');
    }

    // Preload has the effect of moving the resource's only dependency to the main HTML document
    // Remove all dependencies of the nodes
    for (const node of nodesToPreload) {
      node.removeAllDependencies();
      node.addDependency(mainDocumentNode);
    }

    // Once we've modified the dependencies, simulate the new graph with flexible ordering.
    const simulationAfterChanges = simulator.simulate(modifiedGraph, {flexibleOrdering: true});
    const originalNodesByRecord = Array.from(simulationBeforeChanges.nodeTimings.keys())
        // @ts-ignore we don't care if all nodes without a record collect on `undefined`
        .reduce((map, node) => map.set(node.record, node), new Map());

    const results = [];
    for (const node of nodesToPreload) {
      const originalNode = originalNodesByRecord.get(node.record);
      const timingAfter = simulationAfterChanges.nodeTimings.get(node);
      const timingBefore = simulationBeforeChanges.nodeTimings.get(originalNode);
      if (!timingBefore || !timingAfter) throw new Error('Missing preload node');

      const wastedMs = Math.round(timingBefore.endTime - timingAfter.endTime);
      if (wastedMs < THRESHOLD_IN_MS) continue;
      results.push({url: node.record.url, wastedMs});
    }

    if (!results.length) {
      return {wastedMs: 0, results};
    }

    return {
      // Preload won't necessarily impact the deepest chain/overall time
      // We'll use the maximum endTime improvement for now
      wastedMs: Math.max(...results.map(item => item.wastedMs)),
      results,
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const trace = artifacts.traces[UsesRelPreloadAudit.DEFAULT_PASS];
    const devtoolsLog = artifacts.devtoolsLogs[UsesRelPreloadAudit.DEFAULT_PASS];
    const URL = artifacts.URL;
    const simulatorOptions = {trace, devtoolsLog, settings: context.settings};

    const [critChains, mainResource, graph, simulator] = await Promise.all([
      // TODO(phulce): eliminate dependency on CRC
      artifacts.requestCriticalRequestChains({devtoolsLog, URL}),
      artifacts.requestMainResource({devtoolsLog, URL}),
      artifacts.requestPageDependencyGraph({trace, devtoolsLog}),
      artifacts.requestLoadSimulator(simulatorOptions),
    ]);

    // get all critical requests 2 + mainResourceIndex levels deep
    const mainResourceIndex = mainResource.redirects ? mainResource.redirects.length : 0;

    const criticalRequests = UsesRelPreloadAudit._flattenRequests(critChains,
      3 + mainResourceIndex, 2 + mainResourceIndex);

    /** @type {Set<string>} */
    const urls = new Set();
    for (const networkRecord of criticalRequests) {
      if (UsesRelPreloadAudit.shouldPreload(networkRecord, mainResource)) {
        urls.add(networkRecord.url);
      }
    }

    const {results, wastedMs} = UsesRelPreloadAudit.computeWasteWithGraph(urls, graph, simulator);
    // sort results by wastedTime DESC
    results.sort((a, b) => b.wastedMs - a.wastedMs);

    /** @type {LH.Result.Audit.OpportunityDetails['headings']} */
    const headings = [
      {key: 'url', valueType: 'url', label: 'URL'},
      {key: 'wastedMs', valueType: 'timespanMs', label: 'Potential Savings'},
    ];
    const details = Audit.makeOpportunityDetails(headings, results, wastedMs);

    return {
      score: UnusedBytes.scoreForWastedMs(wastedMs),
      rawValue: wastedMs,
      displayValue: ['Potential savings of %10d\xa0ms', wastedMs],
      extendedInfo: {
        value: results,
      },
      details,
    };
  }
}

module.exports = UsesRelPreloadAudit;
