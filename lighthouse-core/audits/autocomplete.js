/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

/**
 * @fileoverview Audits a page to make sure all input elements
 *  have an autocomplete attribute set.
 * See https://docs.google.com/document/d/1yiulNnV8uEy1jPaAEmWeHxHcQOzxpqvAV4hOFpXLJ1M/edit?usp=sharing
 */

'use strict';

const Audit = require('./audit.js');
const i18n = require('../lib/i18n/i18n.js');

const UIStrings = {
  /** Title of a Lighthouse audit that lets the user know if there are any missing or invalid autocomplete attributes on page inputs. This descriptive title is shown to users when all input attributes have a valid autocomplete attribute. */
  title: 'Input elements use autocomplete',
  /** Title of a Lighthouse audit that lets the user know if there are any missing or invalid autocomplete attributes on page inputs. This descriptive title is shown to users when one or more inputs do not have autocomplete set or has an invalid autocomplete set. */
  failureTitle: 'Input elements do not have correct attributes for autocomplete',
  /** Description of a Lighthouse audit that lets the user know if there are any missing or invalid autocomplete attributes on page inputs. This is displayed after a user expands the section to see more. No character length limits. 'Learn More' becomes link text to additional documentation. */
  description: 'Autocomplete helps users submit forms quicker. To reduce user ' +
   'effort, consider enabling autocomplete by setting the `autocomplete` ' +
   'attribute to a valid value.' +
  ' [Learn more](https://developers.google.com/web/fundamentals/design-and-ux/input/forms#use_metadata_to_enable_auto-complete)',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

/** @type {string[]} This array contains all acceptable autocomplete attributes from the WHATWG standard. More found at https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill */
const validAutocompleteAttributeNames = ['name', 'honorific-prefix', 'given-name',
  'additional-name', 'family-name', 'honorific-suffix', 'nickname', 'username', 'new-password',
  'current-password', 'one-time-code', 'organization-title', 'organization', 'street-address',
  'address-line1', 'address-line2', 'address-line3', 'address-level4', 'address-level3',
  'address-level2', 'address-level1', 'country', 'country-name', 'postal-code', 'cc-name',
  'cc-given-name', 'cc-additional-name', 'cc-family-name', 'cc-number', 'cc-exp',
  'cc-exp-month', 'cc-exp-year', 'cc-csc', 'cc-type', 'transaction-currency',
  'transaction-amount', 'language', 'bday', 'bday-day', 'bday-month', 'bday-year',
  'sex', 'url', 'photo', 'tel', 'tel-country-code', 'tel-national', 'tel-area-code', 'on',
  'tel-local', 'tel-local-prefix', 'tel-local-suffix', 'tel-extension', 'email', 'impp', 'off'];

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
      requiredArtifacts: ['FormElements'],
    };
  }

  /**
   * @param {LH.Artifacts.FormInput} input
   * @return {Boolean}
   */
  static isValidAutocomplete(input) {
    for (const name of validAutocompleteAttributeNames) {
      const valid = input.autocompleteAttr ? input.autocompleteAttr.includes(name) : false;
      if (valid) {
        return true;
      }
    }
    return false;
  }
  /**
   * @param {LH.Artifacts} artifacts
   * @return {LH.Audit.Product}
   */
  static audit(artifacts) {
    const forms = artifacts.FormElements;
    const failingFormsData = [];
    for (const form of forms) {
      for (const input of form.inputs) {
        if (!this.isValidAutocomplete(input) ) {
          if (!input.autocompleteProp) {
            failingFormsData.push({
              node: /** @type {LH.Audit.Details.NodeValue} */ ({
                type: 'node',
                snippet: input.snippet,
                nodeLabel: input.nodeLabel,
              }),
            });
          }
        }
      }
    }

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      {key: 'failingElements', itemType: 'node', text: str_(i18n.UIStrings.columnFailingElem)},
    ];
    const details = Audit.makeTableDetails(headings, failingFormsData);
    let displayValue;
    if (failingFormsData.length > 0) {
      displayValue = str_(i18n.UIStrings.displayValueElementsFound,
        {nodeCount: failingFormsData.length});
    }
    return {
      score: (failingFormsData.length > 0) ? 0 : 1,
      displayValue,
      details,
    };
  }
}

module.exports = AutocompleteAudit;
module.exports.UIStrings = UIStrings;
