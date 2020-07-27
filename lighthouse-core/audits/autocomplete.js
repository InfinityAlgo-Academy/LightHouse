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
  title: 'Input elements use metadata to enable autocomplete',
  /** Title of a Lighthouse audit that provides detail on Javascript libraries the page uses. This descriptive title is shown to users when some detected Javascript libraries have known security vulnerabilities. */
  failureTitle: 'Input elements do not have correct attributes for autocomplete',
  /** Description of a Lighthouse audit that tells the user why they should be concerned about the third party Javascript libraries that they use. This is displayed after a user expands the section to see more. No character length limits. 'Learn More' becomes link text to additional documentation. */
  description: 'To reduce user manual input work, each input element should have the' +
  ' appropriate the "autocomplete" attribute. Consider enabling autocomplete by setting' +
  ' the autocomplete attribute to a valid name to ensure that the user has the best form filling expirence.' +
  ' [Learn more](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill)',
  /** [ICU Syntax] Label for the audit identifying the number of vulnerable Javascript libraries found. */
  displayValue: `{nodeCount, plural,
    =1 {1 element found}
    other {# elements found}
    }`,
  /** Label for a column in a data table; entries will be the version numbers of the Javascript libraries found.  */
  noAutocomplete: 'No Autocomplete',
  /** Label for a column in a data table; entries will be the counts of JavaScript-library vulnerabilities found.  */
  autocompleteOff: 'Autocomplete Off',
  /** Label for a column in a data table; entries will be the severity of the vulnerabilities found within a Javascript library. */
  autocompleteOn: 'Autocomplete On',
  /** Table row value for the severity of a small, or low impact Javascript vulnerability.  Part of a ranking scale in the form: low, medium, high. */
  autocompleteIvalid: 'Autocomplete Invalid',
  /** Table row value for the severity of a Javascript vulnerability.  Part of a ranking scale in the form: low, medium, high. */
  rowSeverityMedium: 'Elements with no autocomplete',
  /** Table row value for the severity of a high impact, or dangerous Javascript vulnerability.  Part of a ranking scale in the form: low, medium, high. */
  rowSeverityHigh: 'Elements with no autocomplete',
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
    const noAutocomplete = forms.filter(element => {
      element.inputs.filter(input => !input.autocomplete);
    });
    const autocompleteOff = forms.filter(element => {
      element.inputs.filter(input => input.autocomplete === 'off');
    });
    const autocompleteOn = forms.filter(element => {
      element.inputs.filter(input => input.autocomplete === 'on');
    });
    const autocompleteInvalid = forms.filter(element =>
      element.inputs.filter(input => {
        for (const name of validAutocompleteAttributeNames) {
          input.autocomplete.includes(name);
        }
      }
    ));
    const noAutocompleteData = [];
    for (const form of noAutocomplete) {
      for (const input of form.inputs) {
        noAutocompleteData.push({
          autocompleteOff: /** @type {LH.Audit.Details.NodeValue} */ ({
            type: 'node',
            path: input.devtoolsNodePath,
          }),
        });
      }
    }
    const autocompleteOffData = [];
    for (const form of autocompleteOff) {
      for (const input of form.inputs) {
        autocompleteOffData.push({
          autocompleteOff: /** @type {LH.Audit.Details.NodeValue} */ ({
            type: 'node',
            path: input.devtoolsNodePath,
          }),
        });
      }
    }
    const autocompleteOnData = [];
    for (const form of autocompleteOn) {
      for (const input of form.inputs) {
        autocompleteOnData.push({
          autocompleteOff: /** @type {LH.Audit.Details.NodeValue} */ ({
            type: 'node',
            path: input.devtoolsNodePath,
          }),
        });
      }
    }

    const autocompleteInvalidData = [];
    for (const form of autocompleteInvalid) {
      for (const input of form.inputs) {
        autocompleteInvalidData.push({
          autocompleteOff: /** @type {LH.Audit.Details.NodeValue} */ ({
            type: 'node',
            path: input.devtoolsNodePath,
          }),
        });
      }
    }
    const autocompleteData = [...noAutocompleteData, ...autocompleteOffData,
      ...autocompleteOnData, ...autocompleteInvalidData];
    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      {key: 'noAutocomplete', itemType: 'node', text: str_(UIStrings.noAutocomplete)},
      {key: 'autocompleteOff', itemType: 'node', text: str_(UIStrings.autocompleteOff)},
      {key: 'autocompleteOn', itemType: 'node', text: str_(UIStrings.autocompleteOn)},
      {key: 'autocompleteInvalid', itemType: 'node', text: str_(UIStrings.autocompleteIvalid)},
    ];
    const details = Audit.makeTableDetails(headings, autocompleteData);
    let displayValue;
    if (autocompleteData.length > 0) {
      displayValue = str_(UIStrings.displayValue, {nodeCount: autocompleteData.length});
    }

    return {
      score: 0,
      displayValue,
      details,
    };
  }
}

module.exports = AutocompleteAudit;
module.exports.UIStrings = UIStrings;
