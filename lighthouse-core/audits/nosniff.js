/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @fileoverview Audit which reports all network resources that failed to include
 * a `X-Content-Type-Options: nosniff` header.
 * https://docs.google.com/document/d/1KQrbenS4s7qZsptCChZCqA45v0Q7Mv9a5tVZACLFCWc/edit?usp=sharing
 */

const Audit = require('./audit.js');
const i18n = require('../lib/i18n/i18n.js');
const NetworkRecords = require('../computed/network-records.js');
const URL = require('./../lib/url-shim.js');

const UIStrings = {
  /** Title of a diagnostic LH audit that provides details on network resources that do not set a `X-Content-Type-Options: nosniff` response header. */
  title: 'Sets `X-Content-Type-Options: nosniff` and `Content-Type` headers ' +
    'for every network resource',
  /** Title of a Lighthouse audit that tells the user that their site contains a vaild touch icon. This descriptive title is shown when the page does not contain a valid iOS touch icon. "apple-touch-icon" is an HTML attribute value and should not be translated. */
  failureTitle: 'Does not set a `X-Content-Type-Options: nosniff` and `Content-Type` headers ' +
    'for every network resource',
  /** Description of a diagnostic LH audit that shows the network resources that do not set a `X-Content-Type-Options: nosniff` response header. */
  description: 'Network resources that do not set a `nosniff` response header may result in ' +
    'security issues. [Learn more](https://web.dev/security-headers/#xcto)',
  /** [ICU Syntax] Label identifying the number of network resources missing the security header. */
  displayValue: `{itemCount, plural,
  =1 {# network resource found}
  other {# network resources found}
  }`,
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

class Nosniff extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'nosniff',
      scoreDisplayMode: Audit.SCORING_MODES.BINARY,
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['devtoolsLogs'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const devtoolsLog = artifacts.devtoolsLogs[this.DEFAULT_PASS];
    const networkRecords = await NetworkRecords.request(devtoolsLog, context);

    /** @type {LH.Audit.Details.TableItem[]} */
    const results = [];
    for (const networkRecord of networkRecords) {
      if (URL.isNonNetworkProtocol(networkRecord.url)) {
        continue;
      }
      const hasNosniff = networkRecord.responseHeaders
        .some(h => h.name === 'X-Content-Type-Options' && h.value === 'nosniff');
      const hasContentType = networkRecord.responseHeaders.some(h => h.name === 'Content-Type');
      if (!hasContentType || !hasNosniff) {
        results.push({url: networkRecord.url, hasNosniff, hasContentType});
      }
    }

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      {key: 'url', itemType: 'url', text: str_(i18n.UIStrings.columnURL)},
    ];

    const details = Audit.makeTableDetails(headings, results);

    let displayValue;
    if (results.length > 0) {
      displayValue = str_(UIStrings.displayValue, {itemCount: results.length});
    }

    return {
      score: results.length === 0 ? 1 : 0,
      details,
      displayValue,
    };
  }
}

module.exports = Nosniff;
module.exports.UIStrings = UIStrings;
