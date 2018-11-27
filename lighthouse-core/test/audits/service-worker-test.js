/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const ServiceWorker = require('../../audits/service-worker.js');
const URL = require('../../lib/url-shim.js');
const assert = require('assert');

/* eslint-env jest */

function getBaseDirectory(urlStr) {
  const url = new URL(urlStr);
  return url.origin + url.pathname.substring(0, url.pathname.lastIndexOf('/') + 1);
}

/**
 * Create a ServiceWorker artifact from an array of SW config opts.
 * @param {Array<{scriptURL: string, status: string, scopeURL?: string}>} swOpts
 * @param {string} finalUrl
 */
function createArtifacts(swOpts, finalUrl) {
  const artifact = {versions: [], registrations: []};

  swOpts.forEach((sw, index) => {
    artifact.versions.push({
      registrationId: `${index}`,
      status: sw.status,
      scriptURL: sw.scriptURL,
    });

    const scopeURL = sw.scopeURL || getBaseDirectory(sw.scriptURL);
    assert.ok(scopeURL.endsWith('/')); // required by SW spec.

    artifact.registrations.push({
      registrationId: `${index}`,
      scopeURL,
    });
  });

  return {
    ServiceWorker: artifact,
    URL: {finalUrl},
  };
}

describe('Offline: service worker audit', () => {
  it('passes when given a matching service worker version', () => {
    const finalUrl = 'https://example.com';
    const swOpts = [{
      status: 'activated',
      scriptURL: 'https://example.com/sw.js',
    }];

    const output = ServiceWorker.audit(createArtifacts(swOpts, finalUrl));
    assert.equal(output.rawValue, true);
  });

  it('fails when matching service worker is not activated', () => {
    const finalUrl = 'https://example.com';
    const swOpts = [{
      status: 'redundant',
      scriptURL: 'https://example.com/sw.js',
    }];

    const output = ServiceWorker.audit(createArtifacts(swOpts, finalUrl));
    assert.equal(output.rawValue, false);
  });

  it('discards service worker registrations for other origins', () => {
    const finalUrl = 'https://example.com';
    const swOpts = [{
      status: 'activated',
      scriptURL: 'https://other-example.com',
    }];

    const output = ServiceWorker.audit(createArtifacts(swOpts, finalUrl));
    assert.equal(output.rawValue, false);
  });

  it('fails when URL is out of scope', () => {
    const finalUrl = 'https://example.com/index.html';
    const swOpts = [{
      status: 'activated',
      scriptURL: 'https://example.com/serviceworker/sw.js',
    }];

    const output = ServiceWorker.audit(createArtifacts(swOpts, finalUrl));
    assert.equal(output.rawValue, false);
  });

  it('fails when explicit scopeURL puts the URL out of scope', () => {
    const finalUrl = 'https://example.com/index.html';
    const swOpts = [{
      status: 'activated',
      scriptURL: 'https://example.com/sw.js',
      scopeURL: 'https://example.com/serviceworker/',
    }];

    const output = ServiceWorker.audit(createArtifacts(swOpts, finalUrl));
    assert.equal(output.rawValue, false);
  });

  it('passes when outside default scope but explicit scopeURL puts it back in', () => {
    const finalUrl = 'https://example.com/index.html';
    const swOpts = [{
      status: 'activated',
      scriptURL: 'https://example.com/serviceworker/sw.js',
      // can happen when 'Service-Worker-Allowed' header widens max scope.
      scopeURL: 'https://example.com/',
    }];

    const output = ServiceWorker.audit(createArtifacts(swOpts, finalUrl));
    assert.equal(output.rawValue, true);
  });

  it('passes when multiple SWs control the scope', () => {
    const finalUrl = 'https://example.com/project/index.html';
    const swOpts = [{
      status: 'activated',
      scriptURL: 'https://example.com/sw.js',
    }, {
      status: 'activated',
      scriptURL: 'https://example.com/project/sw.js',
    }];

    const output = ServiceWorker.audit(createArtifacts(swOpts, finalUrl));
    assert.equal(output.rawValue, true);
  });

  it('passes when multiple SWs control the origin but only one is in scope', () => {
    const finalUrl = 'https://example.com/index.html';
    const swOpts = [{
      status: 'activated',
      scriptURL: 'https://example.com/sw.js',
      scopeURL: 'https://example.com/project/',
    }, {
      status: 'activated',
      scriptURL: 'https://example.com/project/sw.js',
      scopeURL: 'https://example.com/project/',
    }, {
      status: 'activated',
      scriptURL: 'https://example.com/project/subproject/sw.js',
      scopeURL: 'https://example.com/',
    }];

    const output = ServiceWorker.audit(createArtifacts(swOpts, finalUrl));
    assert.equal(output.rawValue, true);
  });

  it('fails when multiple SWs control the origin but are all out of scope', () => {
    const finalUrl = 'https://example.com/index.html';
    const swOpts = [{
      status: 'activated',
      scriptURL: 'https://example.com/sw.js',
      scopeURL: 'https://example.com/project/',
    }, {
      status: 'activated',
      scriptURL: 'https://example.com/project/sw.js',
      scopeURL: 'https://example.com/project/',
    }, {
      status: 'activated',
      scriptURL: 'https://example.com/project/subproject/sw.js',
      scopeURL: 'https://example.com/project/',
    }];

    const output = ServiceWorker.audit(createArtifacts(swOpts, finalUrl));
    assert.equal(output.rawValue, false);
  });
});
