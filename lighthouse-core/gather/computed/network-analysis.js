/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const ComputedArtifact = require('./computed-artifact');
const NetworkAnalyzer = require('../../lib/dependency-graph/simulator/network-analyzer');

class NetworkAnalysis extends ComputedArtifact {
  get name() {
    return 'NetworkAnalysis';
  }

  /**
   * @param {!Array} records
   * @return {!Object}
   */
  static computeRTTAndServerResponseTime(records) {
    // First pass compute the estimated observed RTT to each origin's servers.
    const rttByOrigin = new Map();
    for (const [origin, summary] of NetworkAnalyzer.estimateRTTByOrigin(records).entries()) {
      rttByOrigin.set(origin, summary.min);
    }

    // We'll use the minimum RTT as the assumed connection latency since we care about how much addt'l
    // latency each origin introduces as Lantern will be simulating with its own connection latency.
    const minimumRtt = Math.min(...Array.from(rttByOrigin.values()));
    // We'll use the observed RTT information to help estimate the server response time
    const responseTimeSummaries = NetworkAnalyzer.estimateServerResponseTimeByOrigin(records, {
      rttByOrigin,
    });

    const additionalRttByOrigin = new Map();
    const serverResponseTimeByOrigin = new Map();
    for (const [origin, summary] of responseTimeSummaries.entries()) {
      additionalRttByOrigin.set(origin, rttByOrigin.get(origin) - minimumRtt);
      serverResponseTimeByOrigin.set(origin, summary.median);
    }

    return {rtt: minimumRtt, additionalRttByOrigin, serverResponseTimeByOrigin};
  }

  /**
   * @param {Object} devtoolsLog
   * @return {Object}
   */
  async compute_(devtoolsLog, artifacts) {
    const records = await artifacts.requestNetworkRecords(devtoolsLog);
    const throughput = await artifacts.requestNetworkThroughput(devtoolsLog);
    const rttAndServerResponseTime = NetworkAnalysis.computeRTTAndServerResponseTime(records);
    rttAndServerResponseTime.throughput = throughput;
    return rttAndServerResponseTime;
  }
}

module.exports = NetworkAnalysis;
