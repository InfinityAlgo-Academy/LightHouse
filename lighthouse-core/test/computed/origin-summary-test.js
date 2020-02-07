/**
 * @license Copyright 2020 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const ComputedOriginSummary = require('../../computed/origin-summary.js');
const assert = require('assert');
const networkRecordsToDevtoolsLog = require('../network-records-to-devtools-log.js');

/* eslint-env jest */

describe('Origin summary computed', () => {
  let artifacts;
  let context;
  beforeEach(() => {
    context = {computedCache: new Map()};
  });

  it('computes statistics for the page overall', async () => {
    artifacts = networkRecordsToDevtoolsLog([
      {url: 'http://example.com/file.html', resourceType: 'Document', transferSize: 30},
      {url: 'https://foo.bar.com/script.js', resourceType: 'Script', transferSize: 50},
      {url: 'http://filez.com/file.jpg', resourceType: 'Image', transferSize: 70},
    ]);
    const result = await ComputedOriginSummary.request(artifacts, context);
    assert.equal(result['total'].count, 3);
    assert.equal(result['total'].size, 150);
  });

  it('computes statistics for each origin', async () => {
    artifacts = networkRecordsToDevtoolsLog([
      {url: 'http://example.com/file.html', resourceType: 'Document', transferSize: 30},
      {url: 'http://foo.bar.com/script.js', resourceType: 'Script', transferSize: 50},
      {url: 'http://foo.bar.com/file.jpg', resourceType: 'Image', transferSize: 70},
      {url: 'https://foo.bar.com/SECURE.jpg', resourceType: 'Image', transferSize: 7},
    ]);
    const result = await ComputedOriginSummary.request(artifacts, context);
    assert.equal(result['http://example.com'].count, 1);
    assert.equal(result['http://example.com'].size, 30);

    // HTTP & HTTPS version of the same domain are two different origins
    assert.equal(result['http://foo.bar.com'].count, 2);
    assert.equal(result['http://foo.bar.com'].size, 120);

    assert.equal(result['https://foo.bar.com'].count, 1);
    assert.equal(result['https://foo.bar.com'].size, 7);
  });

  it('computes statistics per origin rather than per domain', async () => {
    artifacts = networkRecordsToDevtoolsLog([
      {url: 'http://example.com/file.html', resourceType: 'Document', transferSize: 30},
      {url: 'https://example.com/file1.html', resourceType: 'Document', transferSize: 75},
      {url: 'http://subdomain.example.com/another-file.html', resourceType: 'Document', transferSize: 50},
    ]);

    const result = await ComputedOriginSummary.request(artifacts, context);
    assert.equal(result['http://example.com'].count, 1);
    assert.equal(result['http://example.com'].size, 30);

    assert.equal(result['https://example.com'].count, 1);
    assert.equal(result['https://example.com'].size, 75);

    assert.equal(result['http://subdomain.example.com'].count, 1);
    assert.equal(result['http://subdomain.example.com'].size, 50);
  });

  /**
   * Data URLs should be ignored to avoid double counting.
   * The filesize of a data URL is reflected in the filesize of the resource that contains it.
   * A data URL does not result in a separate network request.
   */
  it('ignores data URLs', async () => {
    artifacts = networkRecordsToDevtoolsLog([
      {url: 'http://example.com/file.html', resourceType: 'Document', transferSize: 30},
      {url: 'data:image/png;base64,iVBORw0KGgoAA', resourceType: 'Image', transferSize: 10},
    ]);

    const result = await ComputedOriginSummary.request(artifacts, context);
    assert.equal(result['http://example.com'].count, 1);
    assert.equal(result['http://example.com'].size, 30);

    assert.equal(result['total'].count, 1);
    assert.equal(result['total'].size, 30);
  });
});
