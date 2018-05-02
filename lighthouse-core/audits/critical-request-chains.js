/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('./audit');
const Util = require('../report/html/renderer/util');

class CriticalRequestChains extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      name: 'critical-request-chains',
      description: 'Critical Request Chains',
      informative: true,
      helpText: 'The Critical Request Chains below show you what resources are ' +
          'issued with a high priority. Consider reducing ' +
          'the length of chains, reducing the download size of resources, or ' +
          'deferring the download of unnecessary resources to improve page load. ' +
          '[Learn more](https://developers.google.com/web/tools/lighthouse/audits/critical-request-chains).',
      requiredArtifacts: ['devtoolsLogs', 'URL'],
    };
  }

  /** @typedef {{depth: number, id: string, chainDuration: number, chainTransferSize: number, node: LH.Audit.SimpleCriticalRequestNode[string]}} CrcNodeInfo */

  /**
   * @param {LH.Audit.SimpleCriticalRequestNode} tree
   * @param {function(CrcNodeInfo)} cb
   */
  static _traverse(tree, cb) {
    /**
     * @param {LH.Audit.SimpleCriticalRequestNode} node
     * @param {number} depth
     * @param {number=} startTime
     * @param {number=} transferSize
     */
    function walk(node, depth, startTime, transferSize = 0) {
      const children = Object.keys(node);
      if (children.length === 0) {
        return;
      }
      children.forEach(id => {
        const child = node[id];
        if (!startTime) {
          startTime = child.request.startTime;
        }

        // Call the callback with the info for this child.
        cb({
          depth,
          id,
          node: child,
          chainDuration: (child.request.endTime - startTime) * 1000,
          chainTransferSize: (transferSize + child.request.transferSize),
        });

        // Carry on walking.
        walk(child.children, depth + 1, startTime);
      }, '');
    }

    walk(tree, 0);
  }

  /**
   * Get stats about the longest initiator chain (as determined by time duration)
   * @param {LH.Audit.SimpleCriticalRequestNode} tree
   * @return {{duration: number, length: number, transferSize: number}}
   */
  static _getLongestChain(tree) {
    const longest = {
      duration: 0,
      length: 0,
      transferSize: 0,
    };
    CriticalRequestChains._traverse(tree, opts => {
      const duration = opts.chainDuration;
      if (duration > longest.duration) {
        longest.duration = duration;
        longest.transferSize = opts.chainTransferSize;
        longest.length = opts.depth;
      }
    });
    // Always return the longest chain + 1 because the depth is zero indexed.
    longest.length++;
    return longest;
  }

  /**
   * @param {LH.Artifacts.CriticalRequestNode} tree
   * @return {LH.Audit.SimpleCriticalRequestNode}
   */
  static flattenRequests(tree) {
    /** @type {LH.Audit.SimpleCriticalRequestNode} */
    const flattendChains = {};
    /** @type {Map<string, LH.Audit.SimpleCriticalRequestNode[string]>} */
    const chainMap = new Map();

    /** @param {CrcNodeInfo} opts */
    function flatten(opts) {
      const request = opts.node.request;
      const simpleRequest = {
        url: request.url,
        startTime: request.startTime,
        endTime: request.endTime,
        _responseReceivedTime: request._responseReceivedTime,
        transferSize: request.transferSize,
      };

      let chain = chainMap.get(opts.id);
      if (chain) {
        chain.request = simpleRequest;
      } else {
        chain = {
          request: simpleRequest,
          children: {},
        };
        flattendChains[opts.id] = chain;
      }

      for (const chainId of Object.keys(opts.node.children)) {
        // Note: cast should be Partial<>, but filled in when child node is traversed.
        const childChain = /** @type {LH.Audit.SimpleCriticalRequestNode[string]} */ ({
          request: {},
          children: {},
        });
        chainMap.set(chainId, childChain);
        chain.children[chainId] = childChain;
      }

      chainMap.set(opts.id, chain);
    }

    CriticalRequestChains._traverse(tree, flatten);

    return flattendChains;
  }

  /**
   * Audits the page to give a score for First Meaningful Paint.
   * @param {LH.Artifacts} artifacts The artifacts from the gather phase.
   * @return {Promise<LH.Audit.Product>}
   */
  static audit(artifacts) {
    const devtoolsLog = artifacts.devtoolsLogs[Audit.DEFAULT_PASS];
    const URL = artifacts.URL;
    return artifacts.requestCriticalRequestChains({devtoolsLog, URL}).then(chains => {
      let chainCount = 0;
      /**
       * @param {LH.Audit.SimpleCriticalRequestNode} node
       * @param {number} depth
       */
      function walk(node, depth) {
        const children = Object.keys(node);

        // Since a leaf node indicates the end of a chain, we can inspect the number
        // of child nodes, and, if the count is zero, increment the count.
        if (children.length === 0) {
          chainCount++;
        }

        children.forEach(id => {
          const child = node[id];
          walk(child.children, depth + 1);
        }, '');
      }
      // Convert
      const flattenedChains = CriticalRequestChains.flattenRequests(chains);

      // Account for initial navigation
      const initialNavKey = Object.keys(flattenedChains)[0];
      const initialNavChildren = initialNavKey && flattenedChains[initialNavKey].children;
      if (initialNavChildren && Object.keys(initialNavChildren).length > 0) {
        walk(initialNavChildren, 0);
      }

      const longestChain = CriticalRequestChains._getLongestChain(flattenedChains);

      return {
        rawValue: chainCount === 0,
        displayValue: chainCount ? `${Util.formatNumber(chainCount)} chains found`: '',
        extendedInfo: {
          value: {
            chains: flattenedChains,
            longestChain,
          },
        },
        details: {
          type: 'criticalrequestchain',
          header: {type: 'text', text: 'View critical network waterfall:'},
          chains: flattenedChains,
          longestChain,
        },
      };
    });
  }
}

module.exports = CriticalRequestChains;
