/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('./audit.js');
const i18n = require('../lib/i18n/i18n.js');

const UIStrings = {
  // TODO: remove manifest, say manifest & service worker instead of just manifest
  /** Title of a Lighthouse audit that provides detail on if a website is installable as an application. This descriptive title is shown to users when a webapp is installable. */
  title: 'Web app manifest meets the installability requirements',
  /** Title of a Lighthouse audit that provides detail on if a website is installable as an application. This descriptive title is shown to users when a webapp is not installable. */
  failureTitle: 'Web app manifest does not meet the installability requirements',
  /** Description of a Lighthouse audit that tells the user why installability is important for webapps. This is displayed after a user expands the section to see more. No character length limits. 'Learn More' becomes link text to additional documentation. */
  description: 'Browsers can proactively prompt users to add your app to their homescreen, ' +
    'which can lead to higher engagement. ' +
    '[Learn more](https://web.dev/installable-manifest/).',
  /** Description Table column header for the observed value of the Installability Error statistic. */
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
  /** Error message explaining that the page is not loaded in the frame.  */
  'not-in-main-frame': 'Page is not loaded in the main frame',
  /** Error message explaining that the page is served from a secure origin. */
  'not-from-secure-origin': 'Page is not served from a secure origin',
    /** Error message explaining that the page has no manifest URL. */
    'no-manifest': 'Page has no manifest <link> URL',
    /** Error message explaining that the provided manifest URL is invalid. */
    'start-url-not-valid': `Manifest start URL is not valid`,
    /** Error message explaining that the provided manifest does not contain a name or short_name field. */
    'manifest-missing-name-or-short-name': `Manifest does not contain a 'name' or 'short_name' field`,
    /** Error message explaining that the manifest display property must be one of 'standalone', 'fullscreen', or 'minimal-ui'. */
    'manifest-display-not-supported': `Manifest 'display' property must be one of 'standalone', 'fullscreen', or 'minimal-ui'`,
    /** Error message explaining that the manifest could not be fetched, might be empty, or could not be parsed. */
    'manifest-empty': `Manifest could not be fetched, is empty, or could not be parsed`,
    /** Error message explaining that no matching service worker was detected, 
   * and provides a suggestion to reload the page or check whether the scope of the service worker
   * for the current page encloses the scope and start URL from the manifest. */
    'no-matching-service-worker': `No matching service worker detected. You may need to reload the page, 
    or check that the scope of the service worker for the current page 
    encloses the scope and start URL from the manifest.`,
  /**
  * @description Error message explaining that the manifest does not contain a suitable icon.
  * @example {192} value0
  */  
    'manifest-missing-suitable-icon': `Manifest does not contain a suitable icon - PNG, 
                    SVG or WebP format of at least {value0}\xa0px 
                    is required, the sizes attribute must be set, and the purpose attribute, 
                    if set, must include "any" or "maskable".`,

  /**
  * @description Error message explaining that the manifest does not supply an icon of the correct format.
  * @example {192} value0
  */  
    'no-acceptable-icon': `No supplied icon is at least {value0}\xa0px square in PNG, SVG or WebP format`,

    /** Error message explaining that the downloaded icon was empty or corrupt. */
    'cannot-download-icon': `Downloaded icon was empty or corrupted`,
    /** Error message explaining that the downloaded icon was empty or corrupt. */
    'no-icon-available': `Downloaded icon was empty or corrupted`,
    /** Error message explaining that the specified application platform is not supported on Android. */
    'platform-not-supported-on-android': `The specified application platform is not supported on Android`,
    /** Error message explaining that a Play store ID was not provided. */
    'no-id-specified': `No Play store ID provided`,
    /** Error message explaining that the Play Store app URL and Play Store ID do not match. */
    'ids-do-not-match': `The Play Store app URL and Play Store ID do not match`,
    /** Error message explaining that the app is already installed. */
    'already-installed': `The app is already installed`,
    /** Error message explaining that a URL in the manifest contains a username, password, or port. */
    'url-not-supported-for-webapk': `A URL in the manifest contains a username, password, or port`,
    /** Error message explaining that the page is loaded in an incognito window. */
    'in-incognito': `Page is loaded in an incognito window`,
    // TODO: perhaps edit this message to make it more actionable for LH users
    /** Error message explaining that the page does not work offline. */
    'not-offline-capable': `Page does not work offline`,
    /** Error message explaining that service worker could not be checked without a start_url. */
    'no-url-for-service-worker': `Could not check service worker without a 'start_url' field in the manifest`,
    /**Error message explaining that the manifest specifies prefer_related_applications: true. */
    'prefer-related-applications': `Manifest specifies prefer_related_applications: true`,
    /** Error message explaining that prefer_related_applications is only supported on Chrome Beta and Stable channe 
               on Android. */
    'prefer-related-applications-only-beta-stable': `prefer_related_applications is only supported on Chrome Beta and Stable channe 
                on Android.`,
    /** Error message explaining that the manifest contains 'display_override' field, and the first supported display 
               mode must be one of 'standalone', 'fulcreen', or 'minimal-ui. */
    'manifest-display-override-not-supported': `Manifest contains 'display_override' field, and the first supported display 
                mode must be one of 'standalone', 'fulcreen', or 'minimal-ui`,
     /** Error message explaining that the web manifest's URL changed while the manifest was being downloaded by the browser. */
    'manifest-location-changed': `Manifest URL changed while the manifest was being fetched.`,
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
      const matchingString = UIStrings[err.errorId];
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
      manifestUrl,
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
