/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const ComputedResourceSummary = require('../../computed/resource-summary.js');
const assert = require('assert');

/* eslint-env jest */

function mockTracingData(recordInfo) {
  const networkRecords = recordInfo.map((info, index) => ({
    requestId: index.toString(),
    resourceType: info.resourceType,
    frameId: 1,
    finished: true,
    priority: 'HIGH',
    initiatorRequest: null,
    statusCode: 200,
    transferSize: info.transferSize,
    url: info.url,
  }));

  return networkRecords;
}

describe('Resource summary computed', () => {
  let networkRecords;
  let mainResource;
  beforeEach(() => {
    const networkRecordInfo = [
      {url: 'http://example.com/file.html', resourceType: 'Document', transferSize: 30},
      {url: 'http://example.com/app.js', resourceType: 'Script', transferSize: 10},
      {url: 'http://third-party.com/script.js', resourceType: 'Script', transferSize: 50},
      {url: 'http://third-party.com/file.jpg', resourceType: 'Image', transferSize: 70},
    ];
    networkRecords = mockTracingData(networkRecordInfo);
    mainResource = networkRecords[0];
  });

  it('includes all resource types, regardless of whether page contains them', () => {
    const result = ComputedResourceSummary.summarize(networkRecords, mainResource.url);
    assert.equal(Object.keys(result).length, 9);
  });

  it('sets size and count correctly', async () => {
    const result = ComputedResourceSummary.summarize(networkRecords, mainResource.url);
    const scriptItem = Object.values(result).find(item => item.resourceType === 'script');
    assert.equal(scriptItem.count, 2);
    assert.equal(scriptItem.size, 10 + 50);
  });

  it('sets "total" resource metrics correctly', async () => {
    const result = ComputedResourceSummary.summarize(networkRecords, mainResource.url);
    const totalItem = Object.values(result).find(item => item.resourceType === 'total');
    assert.equal(totalItem.count, 4);
    assert.equal(totalItem.size, 30 + 10 + 50 + 70);
  });

  it('sets "third-party" resource metrics correctly', async () => {
    const result = ComputedResourceSummary.summarize(networkRecords, mainResource.url);
    const thirdPartyItem = Object.values(result).find(item => item.resourceType === 'third-party');
    assert.equal(thirdPartyItem.count, 2);
    assert.equal(thirdPartyItem.size, 70 + 50);
  });
});
