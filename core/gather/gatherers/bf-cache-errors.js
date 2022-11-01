/**
 * @license Copyright 2022 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import FRGatherer from '../base-gatherer.js';
import {waitForFrameNavigated, waitForLoadEvent} from '../driver/wait-for-condition.js';
import DevtoolsLog from './devtools-log.js';

class BFCacheErrors extends FRGatherer {
  /** @type {LH.Gatherer.GathererMeta<'DevtoolsLog'>} */
  meta = {
    supportedModes: ['navigation', 'timespan'],
    dependencies: {DevtoolsLog: DevtoolsLog.symbol},
  };

  /**
   * @param {LH.Crdp.Page.BackForwardCacheNotRestoredExplanation[]} errorList
   * @return {LH.Artifacts.BFCacheErrors}
   */
  createArtifactFromList(errorList) {
    /** @type {LH.Artifacts.BFCacheErrors} */
    const bfCacheErrors = {
      Circumstantial: {},
      PageSupportNeeded: {},
      SupportPending: {},
    };

    for (const err of errorList) {
      const bfCacheErrorsMap = bfCacheErrors[err.type];
      bfCacheErrorsMap[err.reason] = [];
    }

    return bfCacheErrors;
  }

  /**
   * @param {LH.Crdp.Page.BackForwardCacheNotRestoredExplanationTree} errorTree
   * @return {LH.Artifacts.BFCacheErrors}
   */
  createArtifactFromTree(errorTree) {
    /** @type {LH.Artifacts.BFCacheErrors} */
    const bfCacheErrors = {
      Circumstantial: {},
      PageSupportNeeded: {},
      SupportPending: {},
    };

    /**
     * @param {LH.Crdp.Page.BackForwardCacheNotRestoredExplanationTree} node
     */
    function traverse(node) {
      for (const error of node.explanations) {
        const bfCacheErrorsMap = bfCacheErrors[error.type];
        const frameUrls = bfCacheErrorsMap[error.reason] || [];
        frameUrls.push(node.url);
        bfCacheErrorsMap[error.reason] = frameUrls;
      }

      for (const child of node.children) {
        traverse(child);
      }
    }

    traverse(errorTree);

    return bfCacheErrors;
  }

  /**
   * @param {LH.Crdp.Page.BackForwardCacheNotUsedEvent|undefined} event
   */
  createArtifactFromEvent(event) {
    if (event?.notRestoredExplanationsTree) {
      return this.createArtifactFromTree(event.notRestoredExplanationsTree);
    }
    return this.createArtifactFromList(event?.notRestoredExplanations || []);
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
      session.sendCommand('Page.navigate', {url: 'chrome://terms'}),
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
   * @return {LH.Crdp.Page.BackForwardCacheNotUsedEvent|undefined}
   */
  passivelyCollectBFCacheEvent(context) {
    for (const event of context.dependencies.DevtoolsLog) {
      if (event.method === 'Page.backForwardCacheNotUsed') {
        return event.params;
      }
    }
  }

  /**
   * @param {LH.Gatherer.FRTransitionalContext<'DevtoolsLog'>} context
   * @return {Promise<LH.Artifacts.BFCacheErrors>}
   */
  async getArtifact(context) {
    const event = context.gatherMode === 'navigation' ?
      await this.activelyCollectBFCacheEvent(context) :
      this.passivelyCollectBFCacheEvent(context);

    return this.createArtifactFromEvent(event);
  }

  /**
   * @param {LH.Gatherer.PassContext} passContext
   * @param {LH.Gatherer.LoadData} loadData
   * @return {Promise<LH.Artifacts.BFCacheErrors>}
   */
  async afterPass(passContext, loadData) {
    return this.getArtifact({...passContext, dependencies: {DevtoolsLog: loadData.devtoolsLog}});
  }
}

export default BFCacheErrors;

