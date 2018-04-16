/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Node = require('../../../lib/dependency-graph/node');
const CPUNode = require('../../../lib/dependency-graph/cpu-node'); // eslint-disable-line no-unused-vars
const NetworkNode = require('../../../lib/dependency-graph/network-node'); // eslint-disable-line no-unused-vars

const FirstInteractive = require('../first-interactive');
const LanternConsistentlyInteractive = require('./lantern-consistently-interactive');

class FirstCPUIdle extends LanternConsistentlyInteractive {
  get name() {
    return 'LanternFirstCPUIdle';
  }

  /**
   * @param {LH.Gatherer.Simulation.Result} simulationResult
   * @param {Object} extras
   * @return {LH.Gatherer.Simulation.Result}
   */
  getEstimateFromSimulation(simulationResult, extras) {
    const fmpTimeInMs = extras.optimistic
      ? extras.fmpResult.optimisticEstimate.timeInMs
      : extras.fmpResult.pessimisticEstimate.timeInMs;

    return {
      timeInMs: FirstCPUIdle.getFirstCPUIdleWindowStart(simulationResult.nodeTiming, fmpTimeInMs),
      nodeTiming: simulationResult.nodeTiming,
    };
  }

  /**
   *
   * @param {Map<Node, LH.Gatherer.Simulation.NodeTiming>} nodeTiming
   * @param {number} fmpTimeInMs
   */
  static getFirstCPUIdleWindowStart(nodeTiming, fmpTimeInMs, longTaskLength = 50) {
    /** @type {Array<{start: number, end: number}>} */
    const longTasks = [];
    for (const [node, timing] of nodeTiming.entries()) {
      if (node.type !== Node.TYPES.CPU) continue;
      if (!timing.endTime || !timing.startTime) continue;
      if (timing.endTime - timing.startTime < longTaskLength) continue;
      longTasks.push({start: timing.startTime, end: timing.endTime});
    }

    return FirstInteractive.findQuietWindow(fmpTimeInMs, Infinity, longTasks);
  }
}

module.exports = FirstCPUIdle;
