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
const WebInspector = require('../../../lib/web-inspector');

// Any CPU task of 20 ms or more will end up being a critical long task on mobile
const CRITICAL_LONG_TASK_THRESHOLD = 20;

class Interactive extends MetricArtifact {
  get name() {
    return 'LanternInteractive';
  }

  /**
   * @return {LH.Gatherer.Simulation.MetricCoefficients}
   */
  get COEFFICIENTS() {
    return {
      intercept: 1582,
      optimistic: 0.97,
      pessimistic: 0.49,
    };
  }

  /**
   * @param {Node} dependencyGraph
   * @return {Node}
   */
  getOptimisticGraph(dependencyGraph) {
    // Adjust the critical long task threshold for microseconds
    const minimumCpuTaskDuration = CRITICAL_LONG_TASK_THRESHOLD * 1000;

    return dependencyGraph.cloneWithRelationships(node => {
      // Include everything that might be a long task
      if (node.type === Node.TYPES.CPU) {
        return /** @type {CPUNode} */ (node).event.dur > minimumCpuTaskDuration;
      }

      const asNetworkNode = /** @type {NetworkNode} */ (node);
      // Include all scripts and high priority requests, exclude all images
      const isImage = asNetworkNode.record._resourceType === WebInspector.resourceTypes.Image;
      const isScript = asNetworkNode.record._resourceType === WebInspector.resourceTypes.Script;
      return (
        !isImage &&
        (isScript ||
          asNetworkNode.record.priority() === 'High' ||
          asNetworkNode.record.priority() === 'VeryHigh')
      );
    });
  }

  /**
   * @param {Node} dependencyGraph
   * @return {Node}
   */
  getPessimisticGraph(dependencyGraph) {
    return dependencyGraph;
  }

  /**
   * @param {LH.Gatherer.Simulation.Result} simulationResult
   * @param {Object} extras
   * @return {LH.Gatherer.Simulation.Result}
   */
  getEstimateFromSimulation(simulationResult, extras) {
    const lastTaskAt = Interactive.getLastLongTaskEndTime(simulationResult.nodeTimings);
    const minimumTime = extras.optimistic
      ? extras.fmpResult.optimisticEstimate.timeInMs
      : extras.fmpResult.pessimisticEstimate.timeInMs;
    return {
      timeInMs: Math.max(minimumTime, lastTaskAt),
      nodeTimings: simulationResult.nodeTimings,
    };
  }

  /**
   * @param {LH.Artifacts.MetricComputationDataInput} data
   * @param {LH.ComputedArtifacts} artifacts
   * @return {Promise<LH.Artifacts.LanternMetric>}
   */
  async compute_(data, artifacts) {
    const fmpResult = await artifacts.requestLanternFirstMeaningfulPaint(data);
    const metricResult = await this.computeMetricWithGraphs(data, artifacts, {fmpResult});
    metricResult.timing = Math.max(metricResult.timing, fmpResult.timing);
    return metricResult;
  }

  /**
   * @param {LH.Gatherer.Simulation.Result['nodeTimings']} nodeTimings
   * @return {number}
   */
  static getLastLongTaskEndTime(nodeTimings, duration = 50) {
    // @ts-ignore TS can't infer how the object invariants change
    return Array.from(nodeTimings.entries())
      .filter(([node, timing]) => {
        if (node.type !== Node.TYPES.CPU) return false;
        if (!timing.endTime || !timing.startTime) return false;
        return timing.endTime - timing.startTime > duration;
      })
      .map(([_, timing]) => timing.endTime)
      .reduce((max, x) => Math.max(max || 0, x || 0), 0);
  }
}

module.exports = Interactive;
