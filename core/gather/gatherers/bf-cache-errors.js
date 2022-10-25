/**
 * @license Copyright 2022 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import FRGatherer from '../base-gatherer.js';
import {waitForFrameNavigated, waitForLoadEvent} from '../driver/wait-for-condition.js';

class BFCacheErrors extends FRGatherer {
  /** @type {LH.Gatherer.GathererMeta} */
  meta = {
    supportedModes: ['navigation'],
  };

  /**
   * @param {LH.Gatherer.FRTransitionalContext} context
   * @return {Promise<LH.Artifacts.BFCacheErrors>} All visible tap targets with their positions and sizes
   */
  async getArtifact(context) {
    const session = context.driver.defaultSession;

    /** @type {LH.Crdp.Page.BackForwardCacheNotRestoredExplanation[]|undefined} */
    let errors = undefined;
    /** @type {LH.Crdp.Page.BackForwardCacheNotRestoredExplanationTree|undefined} */
    let tree = undefined;

    /**
     * @param {LH.Crdp.Page.BackForwardCacheNotUsedEvent} event
     */
    function onBfCacheNotUsed(event) {
      errors = event.notRestoredExplanations;
      tree = event.notRestoredExplanationsTree;
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

    return {list: errors, tree};
  }
}

export default BFCacheErrors;

