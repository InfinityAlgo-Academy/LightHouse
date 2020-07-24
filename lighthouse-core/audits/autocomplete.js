/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

/**
 * @fileoverview Audits a page to make sure there are no JS libraries with
 * known vulnerabilities being used. Checks against a vulnerability db
 * provided by Snyk.io and checked in locally as third-party/snyk/snapshot.json
 */

'use strict';

const Audit = require('./audit.js');
const i18n = require('../lib/i18n/i18n.js');


const UIStrings = {
  /** Title of a Lighthouse audit that provides d. */
  title: 'Avoids front-end JavaScript libraries' +
    ' with known security vulnerabilities',
  /** Title of a Lighthouse audit that provides detail on Javascript libraries the page uses. This descriptive title is shown to users when some detected Javascript libraries have known security vulnerabilities. */
  failureTitle: 'Includes front-end JavaScript libraries' +
    ' with known security vulnerabilities',
  /** Description of a Lighthouse audit that tells the user why they should be concerned about the third party Javascript libraries that they use. This is displayed after a user expands the section to see more. No character length limits. 'Learn More' becomes link text to additional documentation. */
  description: 'Some third-party scripts may contain known security vulnerabilities ' +
    'that are easily identified and exploited by attackers. ' +
    '[Learn more](https://web.dev/no-vulnerable-libraries/).',
  /** [ICU Syntax] Label for the audit identifying the number of vulnerable Javascript libraries found. */
  displayValue: `{itemCount, plural,
    =1 {1 vulnerability detected}
    other {# vulnerabilities detected}
    }`,
  /** Label for a column in a data table; entries will be the version numbers of the Javascript libraries found.  */
  columnVersion: 'Library Version',
  /** Label for a column in a data table; entries will be the counts of JavaScript-library vulnerabilities found.  */
  columnVuln: 'Vulnerability Count',
  /** Label for a column in a data table; entries will be the severity of the vulnerabilities found within a Javascript library. */
  columnSeverity: 'Highest Severity',
  /** Table row value for the severity of a small, or low impact Javascript vulnerability.  Part of a ranking scale in the form: low, medium, high. */
  rowSeverityLow: 'Low',
  /** Table row value for the severity of a Javascript vulnerability.  Part of a ranking scale in the form: low, medium, high. */
  rowSeverityMedium: 'Medium',
  /** Table row value for the severity of a high impact, or dangerous Javascript vulnerability.  Part of a ranking scale in the form: low, medium, high. */
  rowSeverityHigh: 'High',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

// TODO: add more comments to talk about where the documentation for these attributes come from?
/** @type {string[]} */
const validAutocompleteAttributeNames = ['name', 'honorific-prefix', 'given-name',
  'additional-name', 'family-name', 'honorific-suffix', 'nickname', 'username', 'new-password',
  'current-password', 'one-time-code', 'organization-title', 'organization', 'street-address',
  'address-line1', 'address-line2', 'address-line3', 'address-level4', 'address-level3',
  'address-level2', 'address-level1', 'country', 'country-name', 'postal-code', 'cc-name',
  'cc-given-name', 'cc-additional-name', 'cc-family-name', 'cc-number', 'cc-exp',
  'cc-exp-month', 'cc-exp-year', 'cc-csc', 'cc-type', 'transaction-currency',
  'transaction-amount', 'language', 'bday', 'bday-day', 'bday-month', 'bday-year',
  'sex', 'url', 'photo', 'tel', 'tel-country-code', 'tel-national', 'tel-area-code',
  'tel-local', 'tel-local-prefix', 'tel-local-suffix', 'tel-extension', 'email', 'impp'];
/** @type {string[]} */
const optionalAutocompleteAttributePrefixes = ['home', 'work', 'mobile', 'fax', 'pager',
  'shipping', 'billing'];

class AutocompleteAudit extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'autocomplete',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['Forms'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @return {LH.Audit.Product}
   */
  static audit(artifacts) {
    const forms = artifacts.Forms;
    let totalCount = 0;
    const noAutocomplete = [];
    const offAutocomplete = [];
    const invalidAutocomplete = [];
    const onAutocomplete = [];
    for (const form of forms) {
      for (const input of form.inputs) {
        totalCount += 1;
        if (!input.autocomplete) {
          noAutocomplete.push(input);
        } else if (input.autocomplete === 'off') {
          offAutocomplete.push(input);
        } else if (input.autocomplete === 'on') {
          onAutocomplete.push(input);
        } else {
          let autocomplete = input.autocomplete;
          for (const prefix of optionalAutocompleteAttributePrefixes) {
            if (autocomplete.includes(prefix)) {
              autocomplete = autocomplete.slice(prefix.length, autocomplete.length - 1);
              break;
            }
          }
          if (!validAutocompleteAttributeNames.includes(autocomplete)) {
            invalidAutocomplete.push(input);
          }
        }
      }
    }
  }
}

module.exports = AutocompleteAudit;
module.exports.UIStrings = UIStrings;
