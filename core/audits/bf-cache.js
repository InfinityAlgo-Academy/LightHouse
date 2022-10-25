/**
 * @license Copyright 2022 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import {Audit} from './audit.js';
import * as i18n from '../lib/i18n/i18n.js';
import {NotRestoredReasonDescription} from '../lib/bfcache-strings.js';

/* eslint-disable max-len */
const UIStrings = {
  /** TODO */
  title: 'Back/forward cache is used',
  /** TODO */
  failureTitle: 'Back/forward cache is not used',
  /** TODO */
  description: 'The back/forward cache can speed up the page load after navigating away.',
  /** TODO */
  failureColumn: 'Failure reason',
  /**
   * @description [ICU Syntax] Label for an audit identifying the number of back/forward cache failure reasons found in the page.
   */
  displayValue: `{itemCount, plural,
    =1 {1 failure reason}
    other {# failure reasons}
    }`,
  /**
   * @description Error message describing a DevTools error id that was found and has not been identified by this audit.
   * @example {platform-not-supported-on-android} reason
   */
  unknownReason: `Back/forward cache failure reason '{reason}' is not recognized`,
};
/* eslint-enable max-len */

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

class BFCache extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'bf-cache',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      supportedModes: ['navigation'],
      requiredArtifacts: ['BFCacheErrors'],
    };
  }

  /**
   * We only want to surface errors that are actionable (i.e. have type "PageSupportNeeded")
   *
   * @param {LH.Crdp.Page.BackForwardCacheNotRestoredExplanation} err
   */
  static shouldIgnoreError(err) {
    return err.type !== 'PageSupportNeeded';
  }

  /**
   * @param {LH.Crdp.Page.BackForwardCacheNotRestoredReason} reason
   */
  static getDescriptionForReason(reason) {
    const matchingString = NotRestoredReasonDescription[reason];

    if (matchingString === undefined) {
      return str_(UIStrings.unknownReason, {reason: reason});
    }

    return matchingString.name;
  }

  /**
   * @param {LH.Crdp.Page.BackForwardCacheNotRestoredExplanation[]} errorList
   * @return {LH.Audit.Details.TableItem[]}
   */
  static constructResultsFromList(errorList) {
    const results = [];

    for (const err of errorList) {
      if (this.shouldIgnoreError(err)) continue;
      results.push({
        reason: this.getDescriptionForReason(err.reason),
      });
    }

    return results;
  }

  /**
   * @param {LH.Crdp.Page.BackForwardCacheNotRestoredExplanationTree} errorTree
   * @return {LH.Audit.Details.TableItem[]}
   */
  static constructResultsFromTree(errorTree) {
    /** @type {Map<LH.Crdp.Page.BackForwardCacheNotRestoredReason, string[]>} */
    const frameUrlsByFailureReason = new Map();

    /**
     * @param {LH.Crdp.Page.BackForwardCacheNotRestoredExplanationTree} node
     */
    function traverse(node) {
      for (const error of node.explanations) {
        if (BFCache.shouldIgnoreError(error)) continue;

        const frameUrls = frameUrlsByFailureReason.get(error.reason) || [];
        frameUrls.push(node.url);
        frameUrlsByFailureReason.set(error.reason, frameUrls);
      }

      for (const child of node.children) {
        traverse(child);
      }
    }

    traverse(errorTree);

    /** @type {LH.Audit.Details.TableItem[]} */
    const results = [];
    for (const [reason, frameUrls] of frameUrlsByFailureReason.entries()) {
      results.push({
        reason: this.getDescriptionForReason(reason),
        subItems: {
          type: 'subitems',
          items: frameUrls.map(frameUrl => ({frameUrl})),
        },
      });
    }
    return results;
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @return {Promise<LH.Audit.Product>}
   *
   */
  static async audit(artifacts) {
    const {list, tree} = artifacts.BFCacheErrors;

    // The BF cache failure tree cans sometimes be undefined.
    // In this case we can still construct the results from the list result.
    // https://bugs.chromium.org/p/chromium/issues/detail?id=1281855
    /** @type {LH.Audit.Details.TableItem[]} */
    let results = [];
    if (tree) {
      results = BFCache.constructResultsFromTree(tree);
    } else if (list) {
      results = BFCache.constructResultsFromList(list);
    }

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      /* eslint-disable max-len */
      {key: 'reason', valueType: 'text', subItemsHeading: {key: 'frameUrl', valueType: 'url'}, label: str_(UIStrings.failureColumn)},
      /* eslint-enable max-len */
    ];

    const details = Audit.makeTableDetails(headings, results);

    if (results.length === 0) {
      return {
        score: 1,
        details,
      };
    }

    return {
      score: 0,
      displayValue: str_(UIStrings.displayValue, {itemCount: results.length}),
      details,
    };
  }
}

export default BFCache;
export {UIStrings};
