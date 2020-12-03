/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('./audit.js');
const i18n = require('../lib/i18n/i18n.js');
const installabilityErrorMsgStrings = require('../lib/installability-error-msgs.js');

const UIStrings = {
  /** Title of a Lighthouse audit that provides detail on if a website is installable as an application. This descriptive title is shown to users when a webapp is installable. */
  title: 'Web app manifest meets the installability requirements',
  /** Title of a Lighthouse audit that provides detail on if a website is installable as an application. This descriptive title is shown to users when a webapp is not installable. */
  failureTitle: 'Web app manifest does not meet the installability requirements',
  /** Description of a Lighthouse audit that tells the user why installability is important for webapps. This is displayed after a user expands the section to see more. No character length limits. 'Learn More' becomes link text to additional documentation. */
  description: 'Browsers can proactively prompt users to add your app to their homescreen, ' +
    'which can lead to higher engagement. ' +
    '[Learn more](https://web.dev/installable-manifest/).',
  /** @description Table column header for the observed value of the Installability Error statistic. */
  columnValue: 'Installability Error',
  /**
   * @description [ICU Syntax] Label for an audit identifying the number of installability errors found in the page.
  */
  displayValue: `{itemCount, plural,
    =1 {1 error}
    other {# errors}
    }`,
  /**
   * @description TODO
   * @example {platform-not-supported-on-android} errorId
   */  
  noErrorId: `Installability error id '{errorId}'`,
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

/**
 * @fileoverview
 * Audits if the page's web app manifest qualifies for triggering a beforeinstallprompt event.
 * https://github.com/GoogleChrome/lighthouse/issues/23#issuecomment-270453303
 *
 * Requirements based on Chrome Devtools' installability requirements.
 *
 */

class InstallableManifest extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'installable-manifest',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['URL', 'WebAppManifest', 'InstallabilityErrors'],
    };
  }


  /**
   * @param {LH.Artifacts} artifacts
   * @return {Array<LH.IcuMessage>}
   */
  static getInstallabilityErrors(artifacts) {
    const installabilityErrors = artifacts.InstallabilityErrors.errors;

    const errorMessages = [];
    for (const err of installabilityErrors) {
      // @ts-expect-error errorIds from protocol should match up against the strings dict
      const matchingString = installabilityErrorMsgStrings.UIStrings[err.errorId];
      // We only expect a `minimum-icon-size-in-pixels` errorArg[0] for two errorIds, currently.
      const value0 = err.errorArguments && err.errorArguments.length && err.errorArguments[0].value;

      if (matchingString && value0) {
        errorMessages.push(str_(matchingString, {value0}));
      } else if (matchingString) {
        errorMessages.push(str_(matchingString));
      } else {
        errorMessages.push(str_(UIStrings.noErrorId));
      }
    }

    return errorMessages;
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   *
   */
  static async audit(artifacts, context) {
    const i18nErrors = InstallableManifest.getInstallabilityErrors(artifacts);

    // TODO(paulirish): not sure this belongs here...
    // const formattedErrors = i18nErrors.map(err => i18n.getFormatted(err, context.settings.locale));

    const manifestUrl = artifacts.WebAppManifest ? artifacts.WebAppManifest.url : null;
    const result = {failures: [...i18nErrors], manifestUrl};

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      {key: 'errorMessage', itemType: 'text', text: str_(UIStrings.columnValue)},
    ];

    // Errors for report table.
    /** @type {LH.Audit.Details.Table['items']} */
    const errorMessages = i18nErrors.map(errorMessage => {
      return {errorMessage};
    });

    // Include the detailed pass/fail checklist as a diagnostic.
    /** @type {LH.Audit.Details.DebugData} */
    const debugData = {
      type: 'debugdata',
      // TODO: Consider not nesting detailsItem under `items`.
      items: result,
    };

    if (i18nErrors.length > 0) {
      return {
        score: 0,
        numericValue: errorMessages.length,
        numericUnit: 'element',
        displayValue: str_(UIStrings.displayValue, {itemCount: errorMessages.length}),
        details: {...Audit.makeTableDetails(headings, errorMessages), debugData},
      };
    }
    return {score: 1, details: {...Audit.makeTableDetails(headings, errorMessages), debugData}};
  }
}

module.exports = InstallableManifest;
module.exports.UIStrings = UIStrings;
