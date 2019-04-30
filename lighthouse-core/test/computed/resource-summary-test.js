/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const ComputedResourceSummary = require('../../computed/resource-summary.js');
const assert = require('assert');
const networkRecordsToDevtoolsLog = require('../network-records-to-devtools-log.js');

/* eslint-env jest */

function mockArtifacts(networkRecords) {
  return {
    devtoolsLog: networkRecordsToDevtoolsLog(networkRecords),
    URL: {requestedUrl: networkRecords[0].url, finalUrl: networkRecords[0].url},
  };
}

describe('Resource summary computed', () => {
  let artifacts;
  let context;
  beforeEach(() => {
    artifacts = mockArtifacts([
      {url: 'http://example.com/file.html', resourceType: 'Document', transferSize: 30},
      {url: 'http://example.com/app.js', resourceType: 'Script', transferSize: 10},
      {url: 'http://cdn.example.com/script.js', resourceType: 'Script', transferSize: 50},
      {url: 'http://third-party.com/file.jpg', resourceType: 'Image', transferSize: 70},
    ]);
    context = {computedCache: new Map()};
  });

  it('includes all resource types, regardless of whether page contains them', async () => {
    const result = await ComputedResourceSummary.request(artifacts, context);
    assert.equal(Object.keys(result).length, 9);
  });

  it('sets size and count correctly', async () => {
    const result = await ComputedResourceSummary.request(artifacts, context);
    assert.equal(result.script.count, 2);
    assert.equal(result.script.size, 10 + 50);
  });

  it('sets "total" resource metrics correctly', async () => {
    const result = await ComputedResourceSummary.request(artifacts, context);
    assert.equal(result.total.count, 4);
    assert.equal(result.total.size, 30 + 10 + 50 + 70);
  });

  it('sets "other" resource metrics correctly', async () => {
    // networkRecordsToDevToolsLog errors with an 'other' resource type, so this test does not use it
    const networkRecords = [
      {url: 'http://example.com/file.html', resourceType: 'Document', transferSize: 30},
      {url: 'http://third-party.com/another-file.html', resourceType: 'manifest', transferSize: 50},
    ];

    const result = ComputedResourceSummary.summarize(networkRecords, networkRecords[0].url);
    assert.equal(result.other.count, 1);
    assert.equal(result.other.size, 50);
  });

  describe('determining third-party resources', () => {
    it('with a third-party resource', async () => {
      artifacts = mockArtifacts([
        {url: 'http://example.com/file.html', resourceType: 'Document', transferSize: 30},
        {url: 'http://third-party.com/another-file.html', resourceType: 'Document', transferSize: 50},
      ]);

      const result = await ComputedResourceSummary.request(artifacts, context);
      assert.equal(result['third-party'].count, 1);
      assert.equal(result['third-party'].size, 50);
    });

    it('with a first-party resource', async () => {
      artifacts = mockArtifacts([
        {url: 'http://example.com/file.html', resourceType: 'Document', transferSize: 30},
        {url: 'http://example.com/another-file.html', resourceType: 'Document', transferSize: 50},
      ]);

      const result = await ComputedResourceSummary.request(artifacts, context);
      assert.equal(result['third-party'].count, 0);
      assert.equal(result['third-party'].size, 0);
    });

    it('with a first-party resource loaded from a subdomain', async () => {
      artifacts = mockArtifacts([
        {url: 'http://example.com/file.html', resourceType: 'Document', transferSize: 30},
        {url: 'http://blog.example.com/file.html', resourceType: 'Document', transferSize: 50},
      ]);

      const result = await ComputedResourceSummary.request(artifacts, context);
      assert.equal(result['third-party'].count, 0);
      assert.equal(result['third-party'].size, 0);
    });
  });
});
