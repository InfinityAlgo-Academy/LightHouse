/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Node = require('../../../../../gather/computed/dependency-graph/network-node');
const Estimator = require('../../../../../gather/computed/dependency-graph/estimator/estimator');

const assert = require('assert');
let nextRequestId = 1;

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

/* eslint-env mocha */
describe('DependencyGraph/Estimator', () => {
  describe('.estimate', () => {
    it('should estimate basic graphs', () => {
      const rootNode = new Node(request({}));
      const estimator = new Estimator(rootNode, {fallbackTTFB: 500});
      const result = estimator.estimate();
      // should be 2 RTTs and 500ms for the server response time
      assert.equal(result, 300 + 500);
    });

    it('should estimate basic waterfall graphs', () => {
      const nodeA = new Node(request({connectionId: 1}));
      const nodeB = new Node(request({connectionId: 2}));
      const nodeC = new Node(request({connectionId: 3}));
      const nodeD = new Node(request({connectionId: 4}));

      nodeA.addDependent(nodeB);
      nodeB.addDependent(nodeC);
      nodeC.addDependent(nodeD);

      const estimator = new Estimator(nodeA, {fallbackTTFB: 500});
      const result = estimator.estimate();
      // should be 800ms each for A, B, C, D
      assert.equal(result, 3200);
    });

    it('should estimate basic parallel requests', () => {
      const nodeA = new Node(request({connectionId: 1}));
      const nodeB = new Node(request({connectionId: 2}));
      const nodeC = new Node(request({connectionId: 3, transferSize: 15000}));
      const nodeD = new Node(request({connectionId: 4}));

      nodeA.addDependent(nodeB);
      nodeA.addDependent(nodeC);
      nodeA.addDependent(nodeD);

      const estimator = new Estimator(nodeA, {fallbackTTFB: 500});
      const result = estimator.estimate();
      // should be 800ms for A and 950ms for C (2 round trips of downloading)
      assert.equal(result, 800 + 950);
    });

    it('should not reuse connections', () => {
      const nodeA = new Node(request({connectionId: 1}));
      const nodeB = new Node(request({connectionId: 1}));
      const nodeC = new Node(request({connectionId: 1}));
      const nodeD = new Node(request({connectionId: 1}));

      nodeA.addDependent(nodeB);
      nodeA.addDependent(nodeC);
      nodeA.addDependent(nodeD);

      const estimator = new Estimator(nodeA, {fallbackTTFB: 500});
      const result = estimator.estimate();
      // should be 800ms for A and 650ms for the next 3
      assert.equal(result, 800 + 650 * 3);
    });

    it('should adjust throughput based on number of requests', () => {
      const nodeA = new Node(request({connectionId: 1}));
      const nodeB = new Node(request({connectionId: 2}));
      const nodeC = new Node(request({connectionId: 3, transferSize: 15000}));
      const nodeD = new Node(request({connectionId: 4}));

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
