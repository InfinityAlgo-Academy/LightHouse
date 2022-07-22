/**
 * @license Copyright 2022 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

// LANTERN_DEBUG=1 node lighthouse-cli http://localhost:10200/prioritize-none.html --only-audits="prioritize-lcp-image,largest-contentful-paint" --save-assets -A --output-path=./tmp/report.html

import {Audit} from './audit.js';
import * as i18n from '../lib/i18n/i18n.js';
import {NetworkRequest} from '../lib/network-request.js';
import MainResource from '../computed/main-resource.js';
import LanternLCP from '../computed/metrics/lantern-largest-contentful-paint.js';
import LoadSimulator from '../computed/load-simulator.js';
import {ByteEfficiencyAudit} from './byte-efficiency/byte-efficiency-audit.js';

const UIStrings = {
  /** Title of a lighthouse audit that tells a user to prioritize an image in order to improve their LCP time. */
  title: 'Prioritize Largest Contentful Paint image',
  /** Description of a lighthouse audit that tells a user to prioritize an image in order to improve their LCP time.  */
  // TODO
  description: 'If the LCP element is dynamically added to the page, you should prioritize the ' +
    'image in order to improve LCP. [Learn more](https://web.dev/optimize-lcp/#prioritize-important-resources).',
};

const str_ = i18n.createMessageInstanceIdFn(import.meta.url, UIStrings);

/**
 * @typedef {Array<{url: string, initiatorType: string}>} InitiatorPath
 */

class PrioritizeLCPImageAudit extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'prioritize-lcp-image',
      title: str_(UIStrings.title),
      description: str_(UIStrings.description),
      supportedModes: ['navigation'],
      requiredArtifacts: ['traces', 'devtoolsLogs', 'GatherContext', 'URL', 'TraceElements',
        'ImageElements'],
      scoreDisplayMode: Audit.SCORING_MODES.NUMERIC,
    };
  }

  /**
   * @param {LH.Artifacts.NetworkRequest} request
   * @param {LH.Artifacts.NetworkRequest} mainResource
   * @return {boolean}
   */
  static shouldPrioritizeRequest(request, mainResource) {
    // If it's already prioritized, no need to recommend it.
    const priority = request.initialPriority;
    if (priority && ['VeryHigh', 'High'].includes(priority)) return false;
    // It's not a request loaded over the network, don't recommend it.
    if (NetworkRequest.isNonNetworkRequest(request)) return false;
    // Finally, return whether or not it belongs to the main frame
    return request.frameId === mainResource.frameId;
  }

  /**
   * @param {LH.Gatherer.Simulation.GraphNode} graph
   * @param {string} imageUrl
   * @return {{lcpNode: LH.Gatherer.Simulation.GraphNetworkNode|undefined, path: Array<LH.Gatherer.Simulation.GraphNetworkNode>|undefined}}
   */
  static findLCPNode(graph, imageUrl) {
    let lcpNode;
    let path;
    graph.traverse((node, traversalPath) => {
      if (node.type !== 'network') return;
      if (node.record.url === imageUrl) {
        lcpNode = node;
        path =
          traversalPath.slice(1).filter(initiator => initiator.type === 'network');
      }
    });
    return {
      lcpNode,
      path,
    };
  }

  /**
   * @param {LH.Artifacts.NetworkRequest} mainResource
   * @param {LH.Gatherer.Simulation.GraphNode} graph
   * @param {LH.Artifacts.TraceElement|undefined} lcpElement
   * @param {Array<LH.Artifacts.ImageElement>} imageElements
   * @return {LH.Gatherer.Simulation.GraphNetworkNode=}
   */
  static getLCPNodeToPrioritize(mainResource, graph, lcpElement, imageElements) {
    if (!lcpElement) return;

    const lcpImageElement = imageElements.find(elem => {
      return elem.node.devtoolsNodePath === lcpElement.node.devtoolsNodePath;
    });

    if (!lcpImageElement) return;
    const lcpUrl = lcpImageElement.src;
    const {lcpNode, path} = PrioritizeLCPImageAudit.findLCPNode(graph, lcpUrl);
    if (!lcpNode || !path) return;

    // eslint-disable-next-line max-len
    const shouldPrioritize = PrioritizeLCPImageAudit.shouldPrioritizeRequest(lcpNode.record, mainResource);
    return shouldPrioritize ? lcpNode : undefined;
  }

  /**
   * Computes the estimated effect of prioritizeing the LCP image.
   * @param {LH.Artifacts.TraceElement|undefined} lcpElement
   * @param {LH.Gatherer.Simulation.GraphNetworkNode|undefined} lcpNode
   * @param {LH.Gatherer.Simulation.GraphNode} graph
   * @param {LH.Gatherer.Simulation.Simulator} simulator
   * @return {{wastedMs: number, results: Array<{node: LH.Audit.Details.NodeValue, url: string, wastedMs: number}>}}
   */
  static computeWasteWithGraph(lcpElement, lcpNode, graph, simulator) {
    if (!lcpElement || !lcpNode || !lcpNode.record.timing) {
      return {
        wastedMs: 0,
        results: [],
      };
    }

    // TODO
    // const sendStart = lcpNode.record.timing.sendStart;
    // if (sendStart < 0.100) {
    //   return {
    //     wastedMs: 0,
    //     results: [],
    //   };
    // }

    const modifiedGraph = graph.cloneWithRelationships();

    // Store the IDs of the LCP Node's dependencies for later
    /** @type {Set<string>} */
    const dependenciesIds = new Set();
    for (const node of lcpNode.getDependencies()) {
      dependenciesIds.add(node.id);
    }

    /** @type {LH.Gatherer.Simulation.GraphNode|null} */
    let modifiedLCPNode = null;
    /** @type {LH.Gatherer.Simulation.GraphNode|null} */
    let mainDocumentNode = null;

    for (const {node} of modifiedGraph.traverseGenerator()) {
      if (node.type !== 'network') continue;

      if (node.isMainDocument()) {
        mainDocumentNode = node;
      } else if (node.id === lcpNode.id) {
        modifiedLCPNode = node;
      }
    }

    if (!mainDocumentNode) {
      // Should always find the main document node
      throw new Error('Could not find main document node');
    }

    if (!modifiedLCPNode) {
      // Should always find the LCP node as well or else this function wouldn't have been called
      throw new Error('Could not find the LCP node');
    }

    // Prioritize will request the resource as soon as its discovered in the main document.
    // Reflect this change in the dependencies in our modified graph.
    modifiedLCPNode.removeAllDependencies(); // TODO: we want this?
    modifiedLCPNode.addDependency(mainDocumentNode); // TODO: we want this?
    modifiedLCPNode.weightedPriority = 1;

    console.log('modifiedLCPNode.priority', modifiedLCPNode.priority);
    console.log('lcpNode.priority', lcpNode.priority);

    const simulationBeforeChanges = simulator.simulate(graph, {
      flexibleOrdering: true,
      label: 'prioritize-lcp-image-before',
    });
    console.log('---');
    const simulationAfterChanges = simulator.simulate(modifiedGraph, {
      flexibleOrdering: true,
      label: 'prioritize-lcp-image-after',
    });
    const lcpTimingsBefore = simulationBeforeChanges.nodeTimings.get(lcpNode);
    if (!lcpTimingsBefore) throw new Error('Impossible - node timings should never be undefined');
    const lcpTimingsAfter = simulationAfterChanges.nodeTimings.get(modifiedLCPNode);
    if (!lcpTimingsAfter) throw new Error('Impossible - node timings should never be undefined');
    /** @type {Map<String, LH.Gatherer.Simulation.GraphNode>} */
    const modifiedNodesById = Array.from(simulationAfterChanges.nodeTimings.keys())
      .reduce((map, node) => map.set(node.id, node), new Map());

    // Even with a higher priority, the image can't be painted before it's even inserted into the DOM.
    // New LCP time will be the max of image download and image in DOM (endTime of its deps).
    let maxDependencyEndTime = 0;
    for (const nodeId of Array.from(dependenciesIds)) {
      const node = modifiedNodesById.get(nodeId);
      if (!node) throw new Error('Impossible - node should never be undefined');
      const timings = simulationAfterChanges.nodeTimings.get(node);
      const endTime = timings?.endTime || 0;
      maxDependencyEndTime = Math.max(maxDependencyEndTime, endTime);
    }

    const wastedMs = lcpTimingsBefore.endTime -
      Math.max(lcpTimingsAfter.endTime, maxDependencyEndTime);

    console.log({
      beforeLcp: lcpTimingsBefore.endTime,
      afterLcp: lcpTimingsAfter.endTime,
    });

    return {
      wastedMs,
      results: [{
        node: Audit.makeNodeItem(lcpElement.node),
        url: lcpNode.record.url,
        wastedMs,
      }],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const gatherContext = artifacts.GatherContext;
    const trace = artifacts.traces[PrioritizeLCPImageAudit.DEFAULT_PASS];
    const devtoolsLog = artifacts.devtoolsLogs[PrioritizeLCPImageAudit.DEFAULT_PASS];
    const URL = artifacts.URL;
    const metricData = {trace, devtoolsLog, gatherContext, settings: context.settings, URL};
    const lcpElement = artifacts.TraceElements
      .find(element => element.traceEventType === 'largest-contentful-paint');

    const [mainResource, lanternLCP, simulator] = await Promise.all([
      MainResource.request({devtoolsLog, URL}, context),
      LanternLCP.request(metricData, context),
      LoadSimulator.request({devtoolsLog, settings: context.settings}, context),
    ]);

    const graph = lanternLCP.pessimisticGraph;
    // eslint-disable-next-line max-len
    const lcpNodeToPrioritize = PrioritizeLCPImageAudit.getLCPNodeToPrioritize(mainResource, graph, lcpElement, artifacts.ImageElements);
    // eslint-disable-next-line max-len
    const {results, wastedMs} = PrioritizeLCPImageAudit.computeWasteWithGraph(lcpElement, lcpNodeToPrioritize, graph, simulator);

    /** @type {LH.Audit.Details.Opportunity['headings']} */
    const headings = [
      {key: 'node', valueType: 'node', label: ''},
      {key: 'url', valueType: 'url', label: str_(i18n.UIStrings.columnURL)},
      {key: 'wastedMs', valueType: 'timespanMs', label: str_(i18n.UIStrings.columnWastedMs)},
    ];
    const details = Audit.makeOpportunityDetails(headings, results, wastedMs);

    return {
      score: ByteEfficiencyAudit.scoreForWastedMs(wastedMs),
      numericValue: wastedMs,
      numericUnit: 'millisecond',
      displayValue: wastedMs ? str_(i18n.UIStrings.displayValueMsSavings, {wastedMs}) : '',
      details,
    };
  }
}

export default PrioritizeLCPImageAudit;
export {UIStrings};
