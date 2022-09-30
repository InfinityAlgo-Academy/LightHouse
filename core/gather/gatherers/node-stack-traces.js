/**
 * @license Copyright 2022 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

/* globals window */

import FRGatherer from '../base-gatherer.js';

class NodeStackTraces extends FRGatherer {
  /** @type {LH.Gatherer.GathererMeta} */
  meta = {
    supportedModes: ['snapshot', 'timespan', 'navigation'],
  };

  /**
   * @param {LH.Gatherer.FRTransitionalContext} context
   * @return {Promise<LH.Artifacts['NodeStackTraces']['nodes']>}
   */
  async _resolveNodes(context) {
    const session = context.driver.defaultSession;

    /**
     * @param {{useIsolation: boolean}} _
     */
    async function resolveNodesInPage({useIsolation}) {
      const getLhIdsFn = () => window.__lighthouseNodesDontTouchOrAllVarianceGoesAway ?
        [...window.__lighthouseNodesDontTouchOrAllVarianceGoesAway.values()] :
        [];
      const lhIds = await context.driver.executionContext.evaluate(getLhIdsFn, {
        args: [],
        deps: [],
        useIsolation,
      });
      if (lhIds.length === 0) {
        // No need to continue with zero elements.
        return {};
      }

      const backendNodeIds = [];
      for (let i = 0; i < lhIds.length; i++) {
        /** @param {number} index */
        const fn = (index) => {
          const keys = [...window.__lighthouseNodesDontTouchOrAllVarianceGoesAway.keys()];
          return keys[index];
        };
        const rawElementResult = await context.driver.executionContext.evaluateRaw(fn, {
          args: [i],
          useIsolation,
        });
        const describeNodeResult = await session.sendCommand('DOM.describeNode', {
          objectId: rawElementResult.result.objectId,
        });
        backendNodeIds.push(describeNodeResult.node.backendNodeId);
      }

      const {nodeIds} = await session.sendCommand('DOM.pushNodesByBackendIdsToFrontend', {
        backendNodeIds,
      });

      /** @type {LH.Artifacts['NodeStackTraces']['nodes']} */
      const lhIdToStackTraces = {};
      for (let i = 0; i < nodeIds.length; i++) {
        const nodeId = nodeIds[i];
        const result = await session.sendCommand('DOM.getNodeStackTraces', {nodeId});
        if (result.creation) {
          lhIdToStackTraces[lhIds[i]] = {creation: result.creation};
        }
      }

      return lhIdToStackTraces;
    }

    await session.sendCommand('DOM.getDocument', {depth: -1, pierce: true});

    // Collect nodes with the page context (`useIsolation: false`) and with our own, reused
    // context (`useIsolation: true`). Gatherers use both modes when collecting node details,
    // so we must do the same here too.
    const pageContextResult = await resolveNodesInPage({useIsolation: false});
    const isolatedContextResult = await resolveNodesInPage({useIsolation: true});
    return {...pageContextResult, ...isolatedContextResult};
  }

  /**
   * @param {LH.Gatherer.FRTransitionalContext} context
   */
  async startInstrumentation(context) {
    await context.driver.defaultSession.sendCommand('DOM.enable');
    await context.driver.defaultSession.sendCommand('DOM.setNodeStackTracesEnabled', {
      enable: true,
    });
  }

  /**
   * @param {LH.Gatherer.FRTransitionalContext} context
   */
  async stopInstrumentation(context) {
    await context.driver.defaultSession.sendCommand('DOM.disable');
    await context.driver.defaultSession.sendCommand('DOM.setNodeStackTracesEnabled', {
      enable: false,
    });
  }

  /**
   * @param {LH.Gatherer.FRTransitionalContext} context
   * @return {Promise<LH.Artifacts['NodeStackTraces']>}
   */
  async getArtifact(context) {
    return {
      nodes: await this._resolveNodes(context),
    };
  }
}

export default NodeStackTraces;
