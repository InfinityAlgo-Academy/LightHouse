/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const URL = require('../lib/url-shim.js');
const Audit = require('./audit.js');

class ServiceWorker extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'service-worker',
      title: 'Registers a service worker',
      failureTitle: 'Does not register a service worker',
      description: 'The service worker is the technology that enables your app to use many ' +
         'Progressive Web App features, such as offline, add to homescreen, and push ' +
         'notifications. [Learn more](https://developers.google.com/web/tools/lighthouse/audits/registered-service-worker).',
      requiredArtifacts: ['URL', 'ServiceWorker'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @return {LH.Audit.Product}
   */
  static audit(artifacts) {
    const {versions, registrations} = artifacts.ServiceWorker;
    const pageUrl = new URL(artifacts.URL.finalUrl);

    // Find active service workers for this origin. Match against
    // artifacts.URL.finalUrl so audit accounts for any redirects.
    const matchingSWVersions = versions.filter(v => v.status === 'activated')
      .filter(v => new URL(v.scriptURL).origin === pageUrl.origin);

    if (matchingSWVersions.length === 0) {
      return {rawValue: false};
    }

    // Find the normalized scope URLs of possibly-controlling SWs.
    const matchingScopeUrls = matchingSWVersions
      .map(v => registrations.find(r => r.registrationId === v.registrationId))
      .filter(/** @return {r is LH.Crdp.ServiceWorker.ServiceWorkerRegistration} */ r => !!r)
      .map(r => new URL(r.scopeURL).href);

    // Ensure page is included in a SW's scope.
    // See https://w3c.github.io/ServiceWorker/v1/#scope-match-algorithm
    const inScope = matchingScopeUrls.some(scopeUrl => pageUrl.href.startsWith(scopeUrl));

    return {
      rawValue: inScope,
    };
  }
}

module.exports = ServiceWorker;
