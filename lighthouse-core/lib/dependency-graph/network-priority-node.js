/**
 * @license Copyright 2022 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const BaseNode = require('./base-node.js');

/**
 * @typedef ResourceChangedPriorityTraceEvent
 * @property {'ResourceChangePriority'} name
 * @property {{requestId: string, priority: LH.Crdp.Network.ResourcePriority}} data
 * @property {number} ts
 */

class NetworkPriorityNode extends BaseNode {
  /**
   * @param {LH.TraceEvent} event
   */
  constructor(event) {
    if (!event.args.data?.priority || !event.args.data?.requestId) {
      throw new Error('invalid event');
    }

    const nodeId = `${event.tid}.${event.ts}`;
    super(nodeId);
    this._event = event;
  }

  get type() {
    return BaseNode.TYPES.NETWORK_PRIORITY;
  }

  /**
   * @return {number}
   */
  get startTime() {
    return this._event.ts;
  }

  /**
   * @return {number}
   */
  get endTime() {
    return this._event.ts + this._event.dur;
  }

  /**
   * @return {NetworkPriorityNode}
   */
  cloneWithoutRelationships() {
    return new NetworkPriorityNode(this._event);
  }
}

module.exports = NetworkPriorityNode;
