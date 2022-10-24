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
   * @param {LH.Artifacts} artifacts
   * @return {Array<LH.IcuMessage | string>}
   */
  static getBfCacheErrors(artifacts) {
    const bfCacheErrors = artifacts.BFCacheErrors.errors;
    const i18nErrors = [];

    for (const err of bfCacheErrors) {
      // Only show errors which can be addressed by the user.
      if (err.type !== 'PageSupportNeeded') continue;


      const matchingString = NotRestoredReasonDescription[err.reason];

      // Handle an errorId we don't recognize.
      if (matchingString === undefined) {
        i18nErrors.push(str_(UIStrings.unknownReason, {reason: err.reason}));
        continue;
      }

      i18nErrors.push(matchingString.name);
    }

    return i18nErrors;
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @return {Promise<LH.Audit.Product>}
   *
   */
  static async audit(artifacts) {
    const i18nErrors = BFCache.getBfCacheErrors(artifacts);

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      {key: 'reason', valueType: 'text', label: str_(UIStrings.failureColumn)},
    ];

    /** @type {LH.Audit.Details.Table['items']} */
    const errorReasons = i18nErrors.map(reason => {
      return {reason};
    });

    const details = Audit.makeTableDetails(headings, errorReasons);

    if (errorReasons.length === 0) {
      return {
        score: 1,
        details,
      };
    }

    return {
      score: 0,
      displayValue: str_(UIStrings.displayValue, {itemCount: errorReasons.length}),
      details,
    };
  }
}

export default BFCache;
export {UIStrings};
