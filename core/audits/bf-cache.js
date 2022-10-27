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
  actionableColumn: 'Actionable failure',
  /** TODO */
  notActionableColumn: 'Not actionable failure',
  /** TODO */
  supportPendingColumn: 'Pending browser support',
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
      requiredArtifacts: ['BFCacheErrors'],
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
   * @param {LH.Artifacts.BFCacheErrorMap} errors
   * @param {LH.IcuMessage | string} label
   * @return {LH.Audit.Details.Table}
   */
  static makeTableForFailureType(errors, label) {
    /** @type {LH.Audit.Details.TableItem[]} */
    const results = [];

    // https://github.com/Microsoft/TypeScript/issues/12870
    const reasons = /** @type {LH.Crdp.Page.BackForwardCacheNotRestoredReason[]} */
      (Object.keys(errors));

    for (const reason of reasons) {
      const frameUrls = errors[reason] || [];
      results.push({
        reason: this.getDescriptionForReason(reason),
        subItems: {
          type: 'subitems',
          items: frameUrls.map(frameUrl => ({frameUrl})),
        },
      });
    }

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      /* eslint-disable max-len */
      {key: 'reason', valueType: 'text', subItemsHeading: {key: 'frameUrl', valueType: 'url'}, label},
      /* eslint-enable max-len */
    ];

    return Audit.makeTableDetails(headings, results);
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts) {
    const {PageSupportNeeded, SupportPending, Circumstantial} = artifacts.BFCacheErrors;

    const actionableTable =
      this.makeTableForFailureType(PageSupportNeeded, str_(UIStrings.actionableColumn));
    const notActionableTable =
      this.makeTableForFailureType(Circumstantial, str_(UIStrings.notActionableColumn));
    const supportPendingTable =
      this.makeTableForFailureType(SupportPending, str_(UIStrings.supportPendingColumn));

    const items = [
      actionableTable,
      notActionableTable,
      supportPendingTable,
    ];

    if (actionableTable.items.length === 0) {
      return {
        score: 1,
        details: {
          type: 'list',
          items,
        },
      };
    }

    return {
      score: 0,
      displayValue: str_(UIStrings.displayValue, {itemCount: actionableTable.items.length}),
      details: {
        type: 'list',
        items,
      },
    };
  }
}

export default BFCache;
export {UIStrings};
