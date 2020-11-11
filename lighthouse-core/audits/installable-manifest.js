/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('./audit.js');
const i18n = require('../lib/i18n/i18n.js');

/**
 * Devtools' App Manifest installability requirements.
 * https://source.chromium.org/chromium/chromium/src/+/master:third_party/devtools-frontend/src/front_end/resources/AppManifestView.js?q=-f:%5Cbout%5C%2F%20-f:%5Cbtest%5C%2F%20-f:web_tests%20%20symbol:getInstallabilityErrorMessages&ss=chromium%2Fchromium%2Fsrc
 *
 */
const devtoolsChecks = [
  {
    errorId: 'not-in-main-frame',
    message: 'Page is not loaded in the main frame',
  },
  {
    errorId: 'not-from-secure-origin',
    message: 'Page is not served from a secure origin',
  },
  {
    errorId: 'no-manifest',
    message: 'Page has no manifest <link> URL',
  },
  {
    errorId: 'start-url-not-valid',
    message: `Manifest start URL is not valid`,
  },
  {
    errorId: 'manifest-missing-name-or-short-name',
    message: `Manifest does not contain a 'name' or 'short_name' field`,
  },
  {
    errorId: 'manifest-display-not-supported',
    message: `Manifest 'display' property must be one of 'standalone', 
                'fullscreen', or 'minimal-ui'`,
  },
  {
    errorId: 'manifest-empty',
    message: `Manifest could not be fetched, is empty, or could not be parsed`,
  },
  {
    errorId: 'manifest-missing-suitable-icon',
    message: '', // Updated later.
  },
  {
    errorId: 'no-matching-service-worker',
    message: `No matching service worker detected. You may need to reload the page, 
                or check that the scope of the service worker for the current page 
                encloses the scope and start URL from the manifest.`,
  },
  {
    errorId: 'no-acceptable-icon',
    message: '', // Updated later.
  },
  {
    errorId: 'cannot-download-icon',
    message: `Downloaded icon was empty or corrupted`,
  },
  {
    errorId: 'no-icon-available',
    message: `Downloaded icon was empty or corrupted`,
  },
  {
    errorId: 'platform-not-supported-on-android',
    message: `The specified application platform is not supported on Android`,
  },
  {
    errorId: 'no-id-specified',
    message: `No Play store ID provided`,
  },
  {
    errorId: 'ids-do-not-match',
    message: `The Play Store app URL and Play Store ID do not match`,
  },
  {
    errorId: 'already-installed',
    message: `The app is already installed`,
  },
  {
    errorId: 'url-not-supported-for-webapk',
    message: `A URL in the manifest contains a username, password, or port`,
  },
  {
    errorId: 'in-incognito',
    message: `Page is loaded in an incognito window`,
  },
  {
    errorId: 'not-offline-capable',
    // TODO: edit this message to make it more actionable for LH users
    message: `Page does not work offline`,
  },
  {
    errorId: 'no-url-for-service-worker',
    message: `Could not check service worker without a 'start_url' field in the manifest`,
  },
  {
    errorId: 'prefer-related-applications',
    message: `Manifest specifies prefer_related_applications: true`,
  },
  {
    errorId: 'prefer-related-applications-only-beta-stable',
    message: `prefer_related_applications is only supported on Chrome Beta and Stable channe 
                on Android.`,
  },
  {
    errorId: 'manifest-display-override-not-supported',
    message: `Manifest contains 'display_override' field, and the first supported display 
                mode must be one of 'standalone', 'fulcreen', or 'minimal-ui`,
  },
];

const UIStrings = {
  /** Title of a Lighthouse audit that provides detail on if a website is installable as an application. This descriptive title is shown to users when a webapp is installable. */
  title: 'Web app manifest meets the installability requirements',
  /** Title of a Lighthouse audit that provides detail on if a website is installable as an application. This descriptive title is shown to users when a webapp is not installable. */
  failureTitle: 'Web app manifest does not meet the installability requirements',
  /** Description of a Lighthouse audit that tells the user why installability is important for webapps. This is displayed after a user expands the section to see more. No character length limits. 'Learn More' becomes link text to additional documentation. */
  description: 'Browsers can proactively prompt users to add your app to their homescreen, ' +
    'which can lead to higher engagement. ' +
    '[Learn more](https://web.dev/installable-manifest/).',
  columnValue: 'Installability Error',
  displayValue: `{itemCount, plural,
    =1 {1 error}
    other {# errors}
    }`,
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
   * @param {LH.Artifacts.ManifestValues} manifestValues
   * @return {Array<string>}
   */
  static assessManifest(manifestValues) {
    if (manifestValues.isParseFailure && manifestValues.parseFailureReason) {
      return [manifestValues.parseFailureReason];
    }

    /** @type {Array<string>} */
    const failures = [];
    const bannerCheckIds = [
      'hasName',
      // Technically shortname isn't required (if name is defined):
      //   https://cs.chromium.org/chromium/src/chrome/browser/installable/installable_manager.cc?type=cs&q=IsManifestValidForWebApp+f:cc+-f:test&sq=package:chromium&l=473
      // Despite this, we think it's better to require it anyway.
      // short_name is preferred for the homescreen icon, but a longer name can be used in
      // the splash screen and app title. Given the different usecases, we'd like to make it clearer
      // that the developer has two possible strings to work with.
      'hasShortName',
      'hasStartUrl',
      'hasPWADisplayValue',
      'hasIconsAtLeast144px',
      'fetchesIcon',
    ];
    manifestValues.allChecks
      .filter(item => bannerCheckIds.includes(item.id))
      .forEach(item => {
        if (!item.passing) {
          failures.push(item.failureText);
        }
      });

    return failures;
  }
  /**
   * @param {LH.Artifacts} artifacts
   * @return {Array<string>}
   */
  static getInstallabilityErrors(artifacts) {
    const installabilityErrors = artifacts.InstallabilityErrors.errors;
    // Error messages based on installability errors found.
    installabilityErrors
      .forEach(item => {
        switch (item.errorId) {
          case 'manifest-missing-suitable-icon':
            if (item.errorArguments.length !== 1 ||
              item.errorArguments[0].name !== 'minimum-icon-size-in-pixels') {
              // TODO: What do we do about these console logs?
              console.error('Installability error does not have the correct errorArguments');
              break;
            }
            // 'manifest-missing-suitable-icon' update.
            devtoolsChecks[7].message = `Manifest does not contain a suitable icon - PNG, 
                    SVG or WebP format of at least ${item.errorArguments[0].value}px 
                    is required, the sizes attribute must be set, and the purpose attribute, 
                    if set, must include "any" or "maskable".`;
            break;
          case 'no-acceptable-icon':
            if (item.errorArguments.length !== 1 ||
              item.errorArguments[0].name !== 'minimum-icon-size-in-pixels') {
              // TODO: What do we do about these console logs?
              console.error('Installability error does not have the correct errorArguments');
              break;
            }
            // 'no-acceptable-icon' update.
            devtoolsChecks[9].message = `No supplied icon is at least ${
              item.errorArguments[0].value}px square in PNG, SVG or WebP format`;
            break;
        }
      }
      );
    /** @type Array<string>*/
    const checksFound = [];
    installabilityErrors
        .filter(err => {
          const checkFound = devtoolsChecks.find(check => check.errorId === err.errorId);
          if (checkFound) {
            checksFound.push(checkFound.message);
          } else {
            checksFound.push(`Installability error id '${err.errorId}' is not recognized`);
          }
        });

    return checksFound;
  }

  // @return {Promise<{failures: Array<string>, manifestUrl: string | null}>}
  /**
   * @param {LH.Artifacts} artifacts
   * @return {Promise<LH.Audit.Product>}
   *
   */
  static async audit(artifacts) {
    /** @type {Array<string>} */
    const errors = InstallableManifest.getInstallabilityErrors(artifacts);
    const manifestUrl = artifacts.WebAppManifest ? artifacts.WebAppManifest.url : null;
    const result = {failures: [...errors], manifestUrl};

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      {key: 'value', itemType: 'text', text: str_(UIStrings.columnValue)},
    ];

    // Errors for report table.
    /** @type {LH.Audit.Details.Table['items']} */
    const errorMessages = [];
    errors.forEach(item => {
      const val = {value: item};
      errorMessages.push(val);
    });

    // TODO: Chrome doesn't trigger the short name check, it has different logic, come back to it.
    // Work around - check if manifestValues triggers it, and add to errors.
    /*
    if (result.manifestValues && result.manifestValues.allChecks) {
      result.manifestValues.allChecks.forEach(check => {
        items[check.id] = check.passing;
        if (check.id == 'hasShortName' && !check.passing) {
          // if short name error exists, add to errors
          result.failures.push(check.failureText);
          errorMessages.push({value: check.failureText});
        }
      });
    }
    */

    // Include the detailed pass/fail checklist as a diagnostic.
    /** @type {LH.Audit.Details.DebugData} */
    const debugData = {
      type: 'debugdata',
      // TODO: Consider not nesting detailsItem under `items`.
      items: result,
    };

    if (errors.length > 0) {
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
