/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const URL = require('../lib/url-shim.js');
const Audit = require('./audit.js');
const i18n = require('../lib/i18n/i18n.js');
const MainResource = require('../computed/main-resource.js');
const LanternLCP = require('../computed/metrics/lantern-largest-contentful-paint.js');
const LoadSimulator = require('../computed/load-simulator.js');
const UnusedBytes = require('./byte-efficiency/byte-efficiency-audit.js');

const UIStrings = {
  /** Title of a lighthouse audit that... */
  title: 'Preload Largest Contentful Paint image',
  /** Description of a lighthouse audit that... */
  description: 'Description TBD',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

const THRESHOLD_IN_MS = 100;

class PreloadLCPAudit extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'preload-lcp',
      title: str_(UIStrings.title),
      description: str_(UIStrings.description),
      requiredArtifacts: ['traces', 'devtoolsLogs', 'URL', 'TraceElements'],
      scoreDisplayMode: Audit.SCORING_MODES.NUMERIC,
    };
  }

  /**
   * We want to preload all first party critical requests at depth 2.
   * Third party requests can be tricky to know the URL ahead of time.
   * Critical requests at depth 1 would already be identified by the browser for preloading.
   * Critical requests deeper than depth 2 are more likely to be a case-by-case basis such that it
   * would be a little risky to recommend blindly.
   *
   * @param {LH.Artifacts.NetworkRequest} request
   * @param {LH.Artifacts.NetworkRequest} mainResource
   * @param {Array<LH.Gatherer.Simulation.GraphNode>} initiatorPath
   * @param {string|undefined} lcpImageSource
   * @return {boolean}
   */
  static shouldPreloadRequest(request, mainResource, initiatorPath, lcpImageSource) {
    const mainResourceDepth = mainResource.redirects ? mainResource.redirects.length : 0;

    // If it's not the request for the LCP image, don't recommend it.
    if (request.url !== lcpImageSource) return false;
    console.log(1);
    // If it's already preloaded, no need to recommend it.
    if (request.isLinkPreload) return false;
    console.log(2);
    // It's not a request loaded over the network, don't recommend it.
    if (URL.NON_NETWORK_PROTOCOLS.includes(request.protocol)) return false;
    console.log(3);
    // It's not at the right depth, don't recommend it.
    // if (initiatorPath.length !== mainResourceDepth + 2) return false;
    // console.log(4);
    // It's not a request for the main frame, it wouldn't get reused even if you did preload it.
    if (request.frameId !== mainResource.frameId) return false;
    console.log(4);
    // We survived everything else, just check that it's a first party request.
    return URL.rootDomainsMatch(request.url, mainResource.url);
  }

  /**
   * @param {LH.Artifacts.NetworkRequest} mainResource
   * @param {LH.Gatherer.Simulation.GraphNode} graph
   * @param {LH.Artifacts.TraceElement|undefined} lcpElement
   * @return {string|null}
   */
  static getURLToPreload(mainResource, graph, lcpElement) {
    if (!lcpElement) {
      return null;
    }
    console.log(lcpElement.imageSource);

    let lcpUrl = null;
    graph.traverse((node, traversalPath) => {
      if (node.type !== 'network') return;
      // Don't include the node itself or any CPU nodes in the initiatorPath
      const path = traversalPath.slice(1).filter(initiator => initiator.type === 'network');
      if (!PreloadLCPAudit.shouldPreloadRequest(node.record, mainResource, path, lcpElement.imageSource)) return;
      lcpUrl = node.record.url;
    });

    return lcpUrl;
  }

  /**
   * Computes the estimated effect of preloading the LCP.
   * @param {string} lcpUrl The image URL of the LCP
   * @param {LH.Gatherer.Simulation.GraphNode} graph
   * @param {LH.Gatherer.Simulation.Simulator} simulator
   * @return {{wastedMs: number, results: Array<{url: string, wastedMs: number}>}}
   */
  static computeWasteWithGraph(lcpUrl, graph, simulator) {
    if (!lcpUrl) {
      return {wastedMs: 0, results: []};
    }

    // Preload changes the ordering of requests, simulate the original graph with flexible ordering
    // to have a reasonable baseline for comparison.
    const simulationBeforeChanges = simulator.simulate(graph, {flexibleOrdering: true});
    const modifiedGraph = graph.cloneWithRelationships();

    /** @type {LH.Gatherer.Simulation.GraphNode|null} */
    let lcpNode = null;
    /** @type {LH.Gatherer.Simulation.GraphNode|null} */
    let mainDocumentNode = null;
    modifiedGraph.traverse(node => {
      if (node.type !== 'network') return;

      const networkNode = /** @type {LH.Gatherer.Simulation.GraphNetworkNode} */ (node);
      if (node.isMainDocument()) {
        mainDocumentNode = networkNode;
      } else if (networkNode.record && lcpUrl === networkNode.record.url) {
        lcpNode = networkNode;
      }
    });

    if (!mainDocumentNode) {
      // Should always find the main document node
      throw new Error('Could not find main document node');
    }

    if (!lcpNode) {
      return {wastedMs: 0, results: []};
    }

    // Preload has the effect of moving the resource's only dependency to the main HTML document
    // Remove all dependencies of the LCP node
    lcpNode.removeAllDependencies();
    lcpNode.addDependency(mainDocumentNode);

    // Once we've modified the dependencies, simulate the new graph with flexible ordering.
    const simulationAfterChanges = simulator.simulate(modifiedGraph, {flexibleOrdering: true});
    const originalNodesByRecord = Array.from(simulationBeforeChanges.nodeTimings.keys())
        // @ts-expect-error we don't care if all nodes without a record collect on `undefined`
        .reduce((map, node) => map.set(node.record, node), new Map());

    const originalNode = originalNodesByRecord.get(lcpNode.record);
    const timingAfter = simulationAfterChanges.nodeTimings.get(lcpNode);
    const timingBefore = simulationBeforeChanges.nodeTimings.get(originalNode);
    if (!timingBefore || !timingAfter) throw new Error('Missing preload node');

    const wastedMs = Math.round(timingBefore.endTime - timingAfter.endTime);
    if (wastedMs < THRESHOLD_IN_MS) {
      return {wastedMs: 0, results: []};
    }

    return {
      wastedMs,
      results: [
        {wastedMs, url: lcpUrl},
      ],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const trace = artifacts.traces[PreloadLCPAudit.DEFAULT_PASS];
    const devtoolsLog = artifacts.devtoolsLogs[PreloadLCPAudit.DEFAULT_PASS];
    const URL = artifacts.URL;
    const simulatorOptions = {trace, devtoolsLog, settings: context.settings};
    const lcpElement = artifacts.TraceElements
      .find(element => element.traceEventType === 'largest-contentful-paint');

    /** @type {LH.Config.Settings} */
    // @ts-expect-error
    const settings = {};

    const [mainResource, lanternLCP, simulator] = await Promise.all([
      MainResource.request({devtoolsLog, URL}, context),
      LanternLCP.request({trace, devtoolsLog, settings}, context),
      LoadSimulator.request(simulatorOptions, context),
    ]);

    const graph = lanternLCP.pessimisticGraph;
    const lcpUrl = PreloadLCPAudit.getURLToPreload(mainResource, graph, lcpElement);
    if (!lcpUrl) {
      console.log('Did not find the LCP node');
      return {
        score: 1,
        notApplicable: true,
      };
    }

    const {results, wastedMs} = PreloadLCPAudit.computeWasteWithGraph(lcpUrl, graph, simulator);

    /** @type {LH.Audit.Details.Opportunity['headings']} */
    const headings = [
      {key: 'url', valueType: 'url', label: str_(i18n.UIStrings.columnURL)},
      {key: 'wastedMs', valueType: 'timespanMs', label: str_(i18n.UIStrings.columnWastedMs)},
    ];
    const details = Audit.makeOpportunityDetails(headings, results, wastedMs);

    return {
      score: UnusedBytes.scoreForWastedMs(wastedMs),
      numericValue: wastedMs,
      numericUnit: 'millisecond',
      displayValue: wastedMs ? str_(i18n.UIStrings.displayValueMsSavings, {wastedMs}) : '',
      details,
    };
  }
}

module.exports = PreloadLCPAudit;
module.exports.UIStrings = UIStrings;
