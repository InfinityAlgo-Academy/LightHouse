/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

'use strict';

/* eslint-env mocha */

const UsesRelPreload = require('../../audits/uses-rel-preload.js');
const NetworkNode = require('../../lib/dependency-graph/network-node');
const assert = require('assert');

const Runner = require('../../runner');
const pwaTrace = require('../fixtures/traces/progressive-app-m60.json');
const pwaDevtoolsLog = require('../fixtures/traces/progressive-app-m60.devtools.log.json');

const defaultMainResource = {
  _endTime: 1,
};

describe('Performance: uses-rel-preload audit', () => {
  let mockGraph;
  let mockSimulator;

  const mockArtifacts = (networkRecords, mockChain, mainResource = defaultMainResource) => {
    return {
      traces: {[UsesRelPreload.DEFAULT_PASS]: {traceEvents: []}},
      devtoolsLogs: {[UsesRelPreload.DEFAULT_PASS]: []},
      requestCriticalRequestChains: () => {
        return Promise.resolve(mockChain);
      },
      requestLoadSimulator: () => mockSimulator,
      requestPageDependencyGraph: () => mockGraph,
      requestNetworkRecords: () => networkRecords,
      requestMainResource: () => {
        return Promise.resolve(mainResource);
      },
    };
  };

  function buildNode(requestId, url) {
    return new NetworkNode({url, requestId});
  }

  afterEach(() => {
    mockSimulator = undefined;
  });

  it('should suggest preload resource', () => {
    const rootNode = buildNode(1, 'http://example.com');
    const mainDocumentNode = buildNode(2, 'http://www.example.com');
    const scriptNode = buildNode(3, 'http://www.example.com/script.js');
    const scriptAddedNode = buildNode(4, 'http://www.example.com/script-added.js');

    mainDocumentNode.addDependency(rootNode);
    scriptNode.addDependency(mainDocumentNode);
    scriptAddedNode.addDependency(scriptNode);

    mockGraph = rootNode;
    mockSimulator = {
      simulate(graph) {
        const nodesByUrl = new Map();
        graph.traverse(node => nodesByUrl.set(node.record.url, node));

        const rootNodeLocal = nodesByUrl.get(rootNode.record.url);
        const mainDocumentNodeLocal = nodesByUrl.get(mainDocumentNode.record.url);
        const scriptNodeLocal = nodesByUrl.get(scriptNode.record.url);
        const scriptAddedNodeLocal = nodesByUrl.get(scriptAddedNode.record.url);

        const nodeTimings = new Map([
          [rootNodeLocal, {starTime: 0, endTime: 500}],
          [mainDocumentNodeLocal, {startTime: 500, endTime: 1000}],
          [scriptNodeLocal, {startTime: 1000, endTime: 2000}],
          [scriptAddedNodeLocal, {startTime: 2000, endTime: 3250}],
        ]);

        if (scriptAddedNodeLocal.getDependencies()[0] === mainDocumentNodeLocal) {
          nodeTimings.set(scriptAddedNodeLocal, {startTime: 1000, endTime: 2000});
        }

        return {timeInMs: 3250, nodeTimings};
      },
    };

    const mainResource = Object.assign({}, defaultMainResource, {
      url: 'http://www.example.com',
      redirects: [''],
    });
    const networkRecords = [
      {
        requestId: '2',
        _isLinkPreload: false,
        _url: 'http://www.example.com',
      },
      {
        requestId: '3',
        _isLinkPreload: false,
        _url: 'http://www.example.com/script.js',
      },
      {
        requestId: '4',
        _isLinkPreload: false,
        _url: 'http://www.example.com/script-added.js',
      },
    ];

    const chains = {
      '1': {
        children: {
          '2': {
            request: networkRecords[0],
            children: {
              '3': {
                request: networkRecords[1],
                children: {
                  '4': {
                    request: networkRecords[2],
                    children: {},
                  },
                },
              },
            },
          },
        },
      },
    };

    return UsesRelPreload.audit(mockArtifacts(networkRecords, chains, mainResource), {}).then(
      output => {
        assert.equal(output.rawValue, 1250);
        assert.equal(output.details.items.length, 1);
      }
    );
  });

  it(`shouldn't suggest preload for already preloaded records`, () => {
    const networkRecords = [
      {
        requestId: '3',
        _startTime: 10,
        _isLinkPreload: true,
        _url: 'http://www.example.com/script.js',
      },
    ];
    const chains = {
      '1': {
        children: {
          '2': {
            children: {
              '3': {
                request: networkRecords[0],
                children: {},
              },
            },
          },
        },
      },
    };

    return UsesRelPreload.audit(mockArtifacts(networkRecords, chains), {}).then(output => {
      assert.equal(output.rawValue, 0);
      assert.equal(output.details.items.length, 0);
    });
  });

  it(`shouldn't suggest preload for protocol data`, () => {
    const networkRecords = [
      {
        requestId: '3',
        protocol: 'data',
        _startTime: 10,
      },
    ];

    const chains = {
      '1': {
        children: {
          '2': {
            children: {
              '3': {
                request: networkRecords[0],
                children: {},
              },
            },
          },
        },
      },
    };

    return UsesRelPreload.audit(mockArtifacts(networkRecords, chains), {}).then(output => {
      assert.equal(output.rawValue, 0);
      assert.equal(output.details.items.length, 0);
    });
  });

  it('does no throw on a real trace/devtools log', async () => {
    const artifacts = Object.assign({
      URL: {finalUrl: 'https://pwa.rocks/'},
      traces: {
        [UsesRelPreload.DEFAULT_PASS]: pwaTrace,
      },
      devtoolsLogs: {
        [UsesRelPreload.DEFAULT_PASS]: pwaDevtoolsLog,
      },
    }, Runner.instantiateComputedArtifacts());

    const settings = {throttlingMethod: 'provided'};
    const result = await UsesRelPreload.audit(artifacts, {settings});
    assert.equal(result.score, 1);
    assert.equal(result.rawValue, 0);
  });
});
