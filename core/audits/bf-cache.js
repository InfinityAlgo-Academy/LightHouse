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
  actionableFailureType: 'Actionable',
  /** TODO */
  notActionableFailureType: 'Not actionable',
  /** TODO */
  supportPendingFailureType: 'Pending browser support',
  /** TODO */
  failureReasonColumn: 'Failure reason',
  /** TODO */
  failureTypeColumn: 'Failure type',
  /**
   * @description [ICU Syntax] Label for an audit identifying the number of back/forward cache failure reasons found in the page.
   */
  displayValue: `{itemCount, plural,
    =1 {1 actionable failure reason}
    other {# actionable failure reasons}
    }`,
};
/* eslint-enable max-len */

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

/** @type {LH.Crdp.Page.BackForwardCacheNotRestoredReasonType[]} */
const ORDERED_FAILURE_TYPES = ['PageSupportNeeded', 'Circumstantial', 'SupportPending'];

/** @type {Record<LH.Crdp.Page.BackForwardCacheNotRestoredReasonType, string | LH.IcuMessage>} */
const FAILURE_TYPE_TO_STRING = {
  PageSupportNeeded: str_(UIStrings.actionableFailureType),
  Circumstantial: str_(UIStrings.notActionableFailureType),
  SupportPending: str_(UIStrings.supportPendingFailureType),
};

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
      supportedModes: ['navigation', 'timespan'],
      requiredArtifacts: ['BFCacheFailures'],
    };
  }

  /**
   * @param {LH.Crdp.Page.BackForwardCacheNotRestoredReason} reason
   */
  static getDescriptionForReason(reason) {
    const matchingString = NotRestoredReasonDescription[reason];

    if (matchingString === undefined) {
      return reason;
    }

    return matchingString.name;
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts) {
    const failures = artifacts.BFCacheFailures;
    if (!failures.length) return {score: 1};

    // TODO: Analyze more than one bf cache failure.
    const {notRestoredReasonsTree} = failures[0];

    /** @type {LH.Audit.Details.TableItem[]} */
    const results = [];
    let numActionable = 0;

    for (const failureType of ORDERED_FAILURE_TYPES) {
      const reasonsMap = notRestoredReasonsTree[failureType];

      // https://github.com/Microsoft/TypeScript/issues/12870
      const reasons = /** @type {LH.Crdp.Page.BackForwardCacheNotRestoredReason[]} */
        (Object.keys(reasonsMap));

      for (const reason of reasons) {
        if (failureType === 'PageSupportNeeded') numActionable++;

        const frameUrls = reasonsMap[reason] || [];
        results.push({
          reason: this.getDescriptionForReason(reason),
          failureType: FAILURE_TYPE_TO_STRING[failureType],
          subItems: {
            type: 'subitems',
            items: frameUrls.map(frameUrl => ({frameUrl})),
          },
        });
      }
    }

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      /* eslint-disable max-len */
      {key: 'reason', valueType: 'text', subItemsHeading: {key: 'frameUrl', valueType: 'url'}, label: str_(UIStrings.failureReasonColumn)},
      {key: 'failureType', valueType: 'text', label: str_(UIStrings.failureTypeColumn)},
      /* eslint-enable max-len */
    ];

    const details = Audit.makeTableDetails(headings, results);

    return {
      score: numActionable ? 0 : 1,
      displayValue: str_(UIStrings.displayValue, {itemCount: numActionable}),
      details,
    };
  }
}

export default BFCache;
export {UIStrings};
