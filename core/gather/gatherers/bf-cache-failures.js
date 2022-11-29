/**
 * @license Copyright 2022 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import FRGatherer from '../base-gatherer.js';
import {waitForFrameNavigated, waitForLoadEvent} from '../driver/wait-for-condition.js';
import DevtoolsLog from './devtools-log.js';

class BFCacheFailures extends FRGatherer {
  /** @type {LH.Gatherer.GathererMeta<'DevtoolsLog'>} */
  meta = {
    supportedModes: ['navigation', 'timespan'],
    dependencies: {DevtoolsLog: DevtoolsLog.symbol},
  };

  /**
   * @param {LH.Crdp.Page.BackForwardCacheNotRestoredExplanation[]} errorList
   * @return {LH.Artifacts.BFCacheFailure}
   */
  static processBFCacheEventList(errorList) {
    /** @type {LH.Artifacts.BFCacheNotRestoredReasonsTree} */
    const notRestoredReasonsTree = {
      Circumstantial: {},
      PageSupportNeeded: {},
      SupportPending: {},
    };

    for (const err of errorList) {
      const bfCacheErrorsMap = notRestoredReasonsTree[err.type];
      bfCacheErrorsMap[err.reason] = [];
    }

    return {notRestoredReasonsTree};
  }

  /**
   * @param {LH.Crdp.Page.BackForwardCacheNotRestoredExplanationTree} errorTree
   * @return {LH.Artifacts.BFCacheFailure}
   */
  static processBFCacheEventTree(errorTree) {
    /** @type {LH.Artifacts.BFCacheNotRestoredReasonsTree} */
    const notRestoredReasonsTree = {
      Circumstantial: {},
      PageSupportNeeded: {},
      SupportPending: {},
    };

    /**
     * @param {LH.Crdp.Page.BackForwardCacheNotRestoredExplanationTree} node
     */
    function traverse(node) {
      for (const error of node.explanations) {
        const bfCacheErrorsMap = notRestoredReasonsTree[error.type];
        const frameUrls = bfCacheErrorsMap[error.reason] || [];
        frameUrls.push(node.url);
        bfCacheErrorsMap[error.reason] = frameUrls;
      }

      for (const child of node.children) {
        traverse(child);
      }
    }

    traverse(errorTree);

    return {notRestoredReasonsTree};
  }

  /**
   * @param {LH.Crdp.Page.BackForwardCacheNotUsedEvent|undefined} event
   * @return {LH.Artifacts.BFCacheFailure}
   */
  static processBFCacheEvent(event) {
    if (event?.notRestoredExplanationsTree) {
      return BFCacheFailures.processBFCacheEventTree(event.notRestoredExplanationsTree);
    }
    return BFCacheFailures.processBFCacheEventList(event?.notRestoredExplanations || []);
  }

  /**
   * @param {LH.Gatherer.FRTransitionalContext} context
   * @return {Promise<LH.Crdp.Page.BackForwardCacheNotUsedEvent|undefined>}
   */
  async activelyCollectBFCacheEvent(context) {
    const session = context.driver.defaultSession;

    /** @type {LH.Crdp.Page.BackForwardCacheNotUsedEvent|undefined} */
    let bfCacheEvent = undefined;

    /**
     * @param {LH.Crdp.Page.BackForwardCacheNotUsedEvent} event
     */
    function onBfCacheNotUsed(event) {
      bfCacheEvent = event;
    }

    session.on('Page.backForwardCacheNotUsed', onBfCacheNotUsed);

    const history = await session.sendCommand('Page.getNavigationHistory');
    const entry = history.entries[history.currentIndex];

    await Promise.all([
      session.sendCommand('Page.navigate', {url: 'about:blank'}),
      waitForLoadEvent(session, 0).promise,
    ]);

    await Promise.all([
      session.sendCommand('Page.navigateToHistoryEntry', {entryId: entry.id}),
      waitForFrameNavigated(session).promise,
    ]);

    session.off('Page.backForwardCacheNotUsed', onBfCacheNotUsed);

    return bfCacheEvent;
  }

  /**
   * @param {LH.Gatherer.FRTransitionalContext<'DevtoolsLog'>} context
   * @return {LH.Crdp.Page.BackForwardCacheNotUsedEvent[]}
   */
  passivelyCollectBFCacheEvents(context) {
    const events = [];
    for (const event of context.dependencies.DevtoolsLog) {
      if (event.method === 'Page.backForwardCacheNotUsed') {
        events.push(event.params);
      }
    }
    return events;
  }

  /**
   * @param {LH.Gatherer.FRTransitionalContext<'DevtoolsLog'>} context
   * @return {Promise<LH.Artifacts['BFCacheFailures']>}
   */
  async getArtifact(context) {
    const events = this.passivelyCollectBFCacheEvents(context);
    if (context.gatherMode === 'navigation') {
      const activelyCollectedEvent = await this.activelyCollectBFCacheEvent(context);
      if (activelyCollectedEvent) events.push(activelyCollectedEvent);
    }

    return events.map(BFCacheFailures.processBFCacheEvent);
  }

  /**
   * @param {LH.Gatherer.PassContext} passContext
   * @param {LH.Gatherer.LoadData} loadData
   * @return {Promise<LH.Artifacts['BFCacheFailures']>}
   */
  async afterPass(passContext, loadData) {
    return this.getArtifact({...passContext, dependencies: {DevtoolsLog: loadData.devtoolsLog}});
  }
}

export default BFCacheFailures;

