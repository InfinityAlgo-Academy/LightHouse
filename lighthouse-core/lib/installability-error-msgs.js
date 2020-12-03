/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const i18n = require('./i18n/i18n.js');

/**
 * Devtools' App Manifest installability requirements.
 * https://source.chromium.org/chromium/chromium/src/+/master:third_party/devtools-frontend/src/front_end/resources/AppManifestView.js?q=-f:%5Cbout%5C%2F%20-f:%5Cbtest%5C%2F%20-f:web_tests%20%20symbol:getInstallabilityErrorMessages&ss=chromium%2Fchromium%2Fsrc
 */

/* eslint-disable max-len */
const UIStrings = {

   /**
    * @description Error message explaining that the page is not loaded in the frame.
    */
    'not-in-main-frame': 'Page is not loaded in the main frame',
    /**
    * @description Error message explaining that the page is served from a secure origin.
    */
    'not-from-secure-origin': 'Page is not served from a secure origin',
    /**
    * @description Error message explaining that the page has no manifest URL.
    */
    'no-manifest': 'Page has no manifest <link> URL',
    /**
    * @description Error message explaining that the provided manifest URL is invalid.
    */
    'start-url-not-valid': `Manifest start URL is not valid`,
    /**
    * @description Error message explaining that the provided manifest does not contain a name or short_name field.
    */
    'manifest-missing-name-or-short-name': `Manifest does not contain a 'name' or 'short_name' field`,
    /**
    * @description Error message explaining that the manifest display property must be one of 'standalone', 'fullscreen', or 'minimal-ui'.
    */
    'manifest-display-not-supported': `Manifest 'display' property must be one of 'standalone', 'fullscreen', or 'minimal-ui'`,
    /**
    * @description Error message explaining that the manifest could not be fetched, might be empty, or could not be parsed.
    */
    'manifest-empty': `Manifest could not be fetched, is empty, or could not be parsed`,
    /**
    * @description Error message explaining that no matching service worker was detected, 
    * and provides a suggestion to reload the page or check whether the scope of the service worker
    * for the current page encloses the scope and start URL from the manifest.
    */
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

    /**
    * @description Error message explaining that the downloaded icon was empty or corrupt.
    */
    'cannot-download-icon': `Downloaded icon was empty or corrupted`,
    /**
    * @description Error message explaining that the downloaded icon was empty or corrupt.
    */
    'no-icon-available': `Downloaded icon was empty or corrupted`,
    /**
    * @description Error message explaining that the specified application platform is not supported on Android.
    */
    'platform-not-supported-on-android': `The specified application platform is not supported on Android`,
    /**
    * @description Error message explaining that a Play store ID was not provided.
    */
    'no-id-specified': `No Play store ID provided`,
    /**
    * @description Error message explaining that the Play Store app URL and Play Store ID do not match.
    */
    'ids-do-not-match': `The Play Store app URL and Play Store ID do not match`,
    /**
    * @description Error message explaining that the app is already installed.
    */
    'already-installed': `The app is already installed`,
    /**
    * @description Error message explaining that a URL in the manifest contains a username, password, or port.
    */
    'url-not-supported-for-webapk': `A URL in the manifest contains a username, password, or port`,
    /**
    * @description Error message explaining that the page is loaded in an incognito window.
    */
    'in-incognito': `Page is loaded in an incognito window`,
    // TODO: perhaps edit this message to make it more actionable for LH users
    /**
    * @description Error message explaining that the page does not work offline.
    */
    'not-offline-capable': `Page does not work offline`,
    /**
    * @description Error message explaining that service worker could not be checked without a start_url.
    */
    'no-url-for-service-worker': `Could not check service worker without a 'start_url' field in the manifest`,
    /**
    * @description Error message explaining that the manifest specifies prefer_related_applications: true.
    */
    'prefer-related-applications': `Manifest specifies prefer_related_applications: true`,
    /**
    * @description Error message explaining that prefer_related_applications is only supported on Chrome Beta and Stable channe 
                on Android.
    */
    'prefer-related-applications-only-beta-stable': `prefer_related_applications is only supported on Chrome Beta and Stable channe 
                on Android.`,
    /**
    * @description Error message explaining that the manifest contains 'display_override' field, and the first supported display 
                mode must be one of 'standalone', 'fulcreen', or 'minimal-ui.
    */
    'manifest-display-override-not-supported': `Manifest contains 'display_override' field, and the first supported display 
                mode must be one of 'standalone', 'fulcreen', or 'minimal-ui`,
};

module.exports = {UIStrings};
