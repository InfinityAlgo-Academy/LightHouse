/**
 * @license Copyright 2022 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('./audit.js');
const i18n = require('../lib/i18n/i18n.js');
const NetworkRequest = require('../lib/network-request.js');
const LanternLCP = require('../computed/metrics/lantern-largest-contentful-paint.js');
const LoadSimulator = require('../computed/load-simulator.js');
const UnusedBytes = require('./byte-efficiency/byte-efficiency-audit.js');

const UIStrings = {
  /** Title of a lighthouse audit that tells a user to prioritize an image in order to improve their LCP time. */
  title: 'Prioritize Largest Contentful Paint image',
  /** Description of a lighthouse audit that tells a user to preload an image in order to improve their LCP time.  */
  description: 'If the LCP element is an image, you should use [Priority Hints](https://chromestatus.com/feature/5273474901737472)' +
    ' to improve LCP. [Learn more](https://web.dev/optimize-lcp/#preload-important-resources).', // TODO learn more
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

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
   *
   * @param {LH.Artifacts.NetworkRequest} request
   * @return {boolean}
   */
  static shouldPrioritizeRequest(request) {
    // If it's already prioritized, no need to recommend it.
    if (request.compareInitialPriorityWith('High') >= 0) return false;
    // It's not a request loaded over the network, don't recommend it.
    if (NetworkRequest.isNonNetworkRequest(request)) return false;
    return true;
  }

  /**
   * @param {LH.Gatherer.Simulation.GraphNode} graph
   * @param {string} imageUrl
   * @return {LH.Gatherer.Simulation.GraphNetworkNode|undefined}
   */
  static findLCPNode(graph, imageUrl) {
    let lcpNode;
    graph.traverse((node) => {
      if (node.type !== 'network') return;
      if (node.record.url === imageUrl) {
        lcpNode = node;
      }
    });
    return lcpNode;
  }

  /**
   * @param {LH.Gatherer.Simulation.GraphNode} graph
   * @param {LH.Artifacts.TraceElement|undefined} lcpElement
   * @param {Array<LH.Artifacts.ImageElement>} imageElements
   * @return {LH.Gatherer.Simulation.GraphNetworkNode|undefined}
   */
  static getLCPNodeToPrioritize(graph, lcpElement, imageElements) {
    if (!lcpElement) return undefined;

    const lcpImageElement = imageElements.find(elem => {
      return elem.node.devtoolsNodePath === lcpElement.node.devtoolsNodePath;
    });

    if (!lcpImageElement) return undefined;
    const lcpUrl = lcpImageElement.src;
    const lcpNode = PrioritizeLCPImageAudit.findLCPNode(graph, lcpUrl);
    if (!lcpNode) return undefined;
    // eslint-disable-next-line max-len
    const shouldPreload = PrioritizeLCPImageAudit.shouldPrioritizeRequest(lcpNode.record);
    return shouldPreload ? lcpNode : undefined;
  }

  /**
   * Computes the estimated effect of preloading the LCP image.
   * @param {LH.Artifacts.TraceElement|undefined} lcpElement
   * @param {LH.Gatherer.Simulation.GraphNetworkNode|undefined} lcpNode
   * @param {LH.Gatherer.Simulation.GraphNode} graph
   * @param {LH.Gatherer.Simulation.Simulator} simulator
   * @return {{wastedMs: number, results: Array<{node: LH.Audit.Details.NodeValue, url: string, wastedMs: number}>}}
   */
  // eslint-disable-next-line no-unused-vars
  static computeWasteWithGraph(lcpElement, lcpNode, graph, simulator) {
    if (!lcpElement || !lcpNode) {
      return {
        wastedMs: 0,
        results: [],
      };
    }

    // TODO: make this a real opportunity.
    return {
      wastedMs: 0,
      results: [{
        node: Audit.makeNodeItem(lcpElement.node),
        url: lcpNode.record.url,
        wastedMs: 0,
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

    const [lanternLCP, simulator] = await Promise.all([
      LanternLCP.request(metricData, context),
      LoadSimulator.request({devtoolsLog, settings: context.settings}, context),
    ]);

    const graph = lanternLCP.pessimisticGraph;
    const lcpNode = PrioritizeLCPImageAudit.getLCPNodeToPrioritize(
      graph, lcpElement, artifacts.ImageElements);

    const {results, wastedMs} =
      PrioritizeLCPImageAudit.computeWasteWithGraph(lcpElement, lcpNode, graph, simulator);

    /** @type {LH.Audit.Details.Opportunity['headings']} */
    const headings = [
      {key: 'node', valueType: 'node', label: ''},
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

module.exports = PrioritizeLCPImageAudit;
module.exports.UIStrings = UIStrings;
