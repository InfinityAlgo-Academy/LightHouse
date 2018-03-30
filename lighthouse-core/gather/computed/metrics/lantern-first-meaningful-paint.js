/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const MetricArtifact = require('./lantern-metric');
const Node = require('../../../lib/dependency-graph/node');
const CPUNode = require('../../../lib/dependency-graph/cpu-node'); // eslint-disable-line no-unused-vars
const NetworkNode = require('../../../lib/dependency-graph/network-node'); // eslint-disable-line no-unused-vars

class FirstMeaningfulPaint extends MetricArtifact {
  get name() {
    return 'LanternFirstMeaningfulPaint';
  }

  /**
   * @return {LH.Gatherer.Simulation.MetricCoefficients}
   */
  get COEFFICIENTS() {
    return {
      intercept: 1532,
      optimistic: -0.3,
      pessimistic: 1.33,
    };
  }

  /**
   * @param {!Node} dependencyGraph
   * @param {LH.Gatherer.Artifact.TraceOfTab} traceOfTab
   * @return {!Node}
   */
  getOptimisticGraph(dependencyGraph, traceOfTab) {
    const fmp = traceOfTab.timestamps.firstMeaningfulPaint;
    const blockingScriptUrls = MetricArtifact.getScriptUrls(dependencyGraph, node => {
      return (
        node.endTime <= fmp && node.hasRenderBlockingPriority() && node.initiatorType !== 'script'
      );
    });

    return dependencyGraph.cloneWithRelationships(node => {
      if (node.endTime > fmp) return false;
      // Include EvaluateScript tasks for blocking scripts
      if (node.type === Node.TYPES.CPU) {
        return /** @type {CPUNode} */ (node).isEvaluateScriptFor(blockingScriptUrls);
      }

      const asNetworkNode = /** @type {NetworkNode} */ (node);
      // Include non-script-initiated network requests with a render-blocking priority
      return asNetworkNode.hasRenderBlockingPriority() && asNetworkNode.initiatorType !== 'script';
    });
  }

  /**
   * @param {!Node} dependencyGraph
   * @param {LH.Gatherer.Artifact.TraceOfTab} traceOfTab
   * @return {!Node}
   */
  getPessimisticGraph(dependencyGraph, traceOfTab) {
    const fmp = traceOfTab.timestamps.firstMeaningfulPaint;
    const requiredScriptUrls = MetricArtifact.getScriptUrls(dependencyGraph, node => {
      return node.endTime <= fmp && node.hasRenderBlockingPriority();
    });

    return dependencyGraph.cloneWithRelationships(node => {
      if (node.endTime > fmp) return false;

      // Include CPU tasks that performed a layout or were evaluations of required scripts
      if (node.type === Node.TYPES.CPU) {
        const asCpuNode = /** @type {CPUNode} */ (node);
        return asCpuNode.didPerformLayout() || asCpuNode.isEvaluateScriptFor(requiredScriptUrls);
      }

      // Include all network requests that had render-blocking priority (even script-initiated)
      return /** @type {NetworkNode} */ (node).hasRenderBlockingPriority();
    });
  }

  /**
   * @param {{trace: Object, devtoolsLog: Object}} data
   * @param {Object} artifacts
   * @return {Promise<LH.Gatherer.Artifact.LanternMetric>}
   */
  async compute_(data, artifacts) {
    const fcpResult = await artifacts.requestLanternFirstContentfulPaint(data, artifacts);
    const metricResult = await this.computeMetricWithGraphs(data, artifacts);
    metricResult.timing = Math.max(metricResult.timing, fcpResult.timing);
    return metricResult;
  }
}

module.exports = FirstMeaningfulPaint;
