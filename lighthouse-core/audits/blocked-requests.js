/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('./audit.js');
const i18n = require('../lib/i18n/i18n.js');

const UIStrings = {
  /** Title of a Lighthouse audit that provides detail on the use of deprecated APIs. This descriptive title is shown to users when the page does not use deprecated APIs. */
  title: 'No requests are blocked',
  /** Title of a Lighthouse audit that provides detail on the use of deprecated APIs. This descriptive title is shown to users when the page uses deprecated APIs. */
  failureTitle: 'Requests were blocked',
  /** Description of a Lighthouse audit that tells the user why they should not use deprecated APIs on their page. This is displayed after a user expands the section to see more. No character length limits. 'Learn More' becomes link text to additional documentation. */
  description: 'Browsers will block requests from different origins if the page\'s security ' +
      'context doesn\'t allow for it. [Learn more](https://web.dev/why-coop-coep/).',
  /** [ICU Syntax] Label for the audit identifying the number of blocked requests. */
  displayValue: `{itemCount, plural,
    =1 {1 request blocked}
    other {# requests blocked}
    }`,
  /** Table column header for reason requests was blocked. */
  columnReason: 'Reason',
  /** Value for `reason` table column explaining why a request was blocked. */
  reasonCoepFrameResourceNeedsCoepHeader: 'Frame Needs COEP Header',
  /** Value for `reason` table column explaining why a request was blocked. */
  reasonCoopSandboxedIFrameCannotNavigateToCoopPage:
    'Sandboxed Iframe Cannot Navigate To COOP Page',
  /** Value for `reason` table column explaining why a request was blocked. */
  reasonCorpNotSameOrigin: 'Not Same Origin (CORP)',
  /** Value for `reason` table column explaining why a request was blocked. */
  reasonCorpNotSameSite: 'Not Same Site (CORP)',
};

const reasonToString = {
  CoepFrameResourceNeedsCoepHeader: UIStrings.reasonCoepFrameResourceNeedsCoepHeader,
  CoopSandboxedIFrameCannotNavigateToCoopPage:
    UIStrings.reasonCoopSandboxedIFrameCannotNavigateToCoopPage,
  CorpNotSameOrigin: UIStrings.reasonCorpNotSameOrigin,
  CorpNotSameOriginAfterDefaultedToSameOriginByCoep: UIStrings.reasonCorpNotSameOrigin,
  CorpNotSameSite: UIStrings.reasonCorpNotSameSite,
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

class BlockedRequests extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'blocked-requests',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['InspectorIssues'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @return {LH.Audit.Product}
   */
  static audit(artifacts) {
    const items = artifacts.InspectorIssues.blockedByResponse.map(details => {
      return {
        url: details.request.url,
        reason: reasonToString[details.reason] || details.reason,
      };
    });

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      {key: 'url', itemType: 'url', text: str_(i18n.UIStrings.columnURL)},
      {key: 'reason', itemType: 'text', text: str_(UIStrings.columnReason)},
    ];
    const details = Audit.makeTableDetails(headings, items);

    let displayValue = '';
    if (items.length > 0) {
      displayValue = str_(UIStrings.displayValue, {itemCount: items.length});
    }

    return {
      score: Number(items.length === 0),
      displayValue,
      details,
    };
  }
}

module.exports = BlockedRequests;
module.exports.UIStrings = UIStrings;
