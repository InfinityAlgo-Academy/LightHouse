/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const NetworkNode = require('../../../../../gather/computed/dependency-graph/network-node');
const CpuNode = require('../../../../../gather/computed/dependency-graph/cpu-node');
const Estimator = require('../../../../../gather/computed/dependency-graph/estimator/estimator');

const assert = require('assert');
let nextRequestId = 1;
let nextTid = 1;

function request({requestId, connectionId, transferSize, scheme, timing}) {
  requestId = requestId || nextRequestId++;
  connectionId = connectionId || 1;
  transferSize = transferSize || 1000;
  scheme = scheme || 'http';

  return {
    requestId,
    connectionId,
    transferSize,
    parsedURL: {scheme},
    _timing: timing,
  };
}

function cpuTask({tid, ts, duration}) {
  tid = tid || nextTid++;
  ts = ts || 0;
  const dur = (duration || 0) * 1000 / 5;
  return {tid, ts, dur};
}

/* eslint-env mocha */
describe('DependencyGraph/Estimator', () => {
  describe('.estimate', () => {
    it('should estimate basic network graphs', () => {
      const rootNode = new NetworkNode(request({}));
      const estimator = new Estimator(rootNode, {fallbackTTFB: 500});
      const result = estimator.estimate();
      // should be 2 RTTs and 500ms for the server response time
      assert.equal(result, 300 + 500);
    });

    it('should estimate basic mixed graphs', () => {
      const rootNode = new NetworkNode(request({}));
      const cpuNode = new CpuNode(cpuTask({duration: 200}));
      cpuNode.addDependency(rootNode);

      const estimator = new Estimator(rootNode, {fallbackTTFB: 500});
      const result = estimator.estimate();
      // should be 2 RTTs and 500ms for the server response time + 200 CPU
      assert.equal(result, 300 + 500 + 200);
    });

    it('should estimate basic network waterfall graphs', () => {
      const nodeA = new NetworkNode(request({connectionId: 1}));
      const nodeB = new NetworkNode(request({connectionId: 2}));
      const nodeC = new NetworkNode(request({connectionId: 3}));
      const nodeD = new NetworkNode(request({connectionId: 4}));

      nodeA.addDependent(nodeB);
      nodeB.addDependent(nodeC);
      nodeC.addDependent(nodeD);

      const estimator = new Estimator(nodeA, {fallbackTTFB: 500});
      const result = estimator.estimate();
      // should be 800ms each for A, B, C, D
      assert.equal(result, 3200);
    });

    it('should estimate basic CPU queue graphs', () => {
      const nodeA = new NetworkNode(request({connectionId: 1}));
      const nodeB = new CpuNode(cpuTask({duration: 100}));
      const nodeC = new CpuNode(cpuTask({duration: 600}));
      const nodeD = new CpuNode(cpuTask({duration: 300}));

      nodeA.addDependent(nodeB);
      nodeA.addDependent(nodeC);
      nodeA.addDependent(nodeD);

      const estimator = new Estimator(nodeA, {fallbackTTFB: 500});
      const result = estimator.estimate();
      // should be 800ms A, then 1000 ms total for B, C, D in serial
      assert.equal(result, 1800);
    });

    it('should estimate basic network waterfall graphs with CPU', () => {
      const nodeA = new NetworkNode(request({connectionId: 1}));
      const nodeB = new NetworkNode(request({connectionId: 2}));
      const nodeC = new NetworkNode(request({connectionId: 3}));
      const nodeD = new NetworkNode(request({connectionId: 4}));
      const nodeE = new CpuNode(cpuTask({duration: 1000}));
      const nodeF = new CpuNode(cpuTask({duration: 1000}));

      nodeA.addDependent(nodeB);
      nodeB.addDependent(nodeC);
      nodeB.addDependent(nodeE); // finishes 200 ms after C
      nodeC.addDependent(nodeD);
      nodeC.addDependent(nodeF); // finishes 400 ms after D

      const estimator = new Estimator(nodeA, {fallbackTTFB: 500});
      const result = estimator.estimate();
      // should be 800ms each for A, B, C, D, with F finishing 400 ms after D
      assert.equal(result, 3600);
    });

    it('should estimate basic parallel requests', () => {
      const nodeA = new NetworkNode(request({connectionId: 1}));
      const nodeB = new NetworkNode(request({connectionId: 2}));
      const nodeC = new NetworkNode(request({connectionId: 3, transferSize: 15000}));
      const nodeD = new NetworkNode(request({connectionId: 4}));

      nodeA.addDependent(nodeB);
      nodeA.addDependent(nodeC);
      nodeA.addDependent(nodeD);

      const estimator = new Estimator(nodeA, {fallbackTTFB: 500});
      const result = estimator.estimate();
      // should be 800ms for A and 950ms for C (2 round trips of downloading)
      assert.equal(result, 800 + 950);
    });

    it('should not reuse connections', () => {
      const nodeA = new NetworkNode(request({connectionId: 1}));
      const nodeB = new NetworkNode(request({connectionId: 1}));
      const nodeC = new NetworkNode(request({connectionId: 1}));
      const nodeD = new NetworkNode(request({connectionId: 1}));

      nodeA.addDependent(nodeB);
      nodeA.addDependent(nodeC);
      nodeA.addDependent(nodeD);

      const estimator = new Estimator(nodeA, {fallbackTTFB: 500});
      const result = estimator.estimate();
      // should be 800ms for A and 650ms for the next 3
      assert.equal(result, 800 + 650 * 3);
    });

    it('should adjust throughput based on number of requests', () => {
      const nodeA = new NetworkNode(request({connectionId: 1}));
      const nodeB = new NetworkNode(request({connectionId: 2}));
      const nodeC = new NetworkNode(request({connectionId: 3, transferSize: 15000}));
      const nodeD = new NetworkNode(request({connectionId: 4}));

      nodeA.addDependent(nodeB);
      nodeA.addDependent(nodeC);
      nodeA.addDependent(nodeD);

      const estimator = new Estimator(nodeA, {fallbackTTFB: 500});
      const result = estimator.estimate();
      // should be 800ms for A and 950ms for C (2 round trips of downloading)
      assert.equal(result, 800 + 950);
    });
  });
});
