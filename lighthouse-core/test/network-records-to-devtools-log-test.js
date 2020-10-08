/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

const NetworkRecorder = require('../../lighthouse-core/lib/network-recorder.js');
const networkRecordsToDevtoolsLog = require('./network-records-to-devtools-log.js');
const lcpDevtoolsLog = require('./fixtures/traces/lcp-m78.devtools.log.json');

describe('networkRecordsToDevtoolsLog', () => {
  it('should generate the four messages per request', () => {
    const records = [{url: 'http://example.com'}];
    const log = networkRecordsToDevtoolsLog(records);
    expect(log).toMatchObject([
      {method: 'Network.requestWillBeSent', params: {request: {url: 'http://example.com'}}},
      {method: 'Network.responseReceived', params: {response: {url: 'http://example.com'}}},
      {method: 'Network.dataReceived'},
      {method: 'Network.loadingFinished'},
    ]);
  });

  it('should set resource and transfer sizes', () => {
    const records = [{url: 'http://example.com', resourceSize: 1024, transferSize: 2048}];
    const log = networkRecordsToDevtoolsLog(records);
    expect(log).toMatchObject([
      {method: 'Network.requestWillBeSent', params: {request: {url: 'http://example.com'}}},
      {method: 'Network.responseReceived', params: {response: {url: 'http://example.com'}}},
      {method: 'Network.dataReceived', params: {dataLength: 1024, encodedDataLength: 2048}},
      {method: 'Network.loadingFinished', params: {encodedDataLength: 2048}},
    ]);
  });

  it('should handle redirects', () => {
    const records = [
      {requestId: '0', url: 'http://example.com/'},
      {requestId: '0:redirect', url: 'http://www.example.com/'},
    ];

    const log = networkRecordsToDevtoolsLog(records);
    expect(log).toMatchObject([
      {method: 'Network.requestWillBeSent', params: {request: {url: 'http://example.com/'}}},
      {method: 'Network.requestWillBeSent', params: {request: {url: 'http://www.example.com/'}}},
      {method: 'Network.responseReceived', params: {response: {url: 'http://www.example.com/'}}},
      {method: 'Network.dataReceived'},
      {method: 'Network.loadingFinished'},
    ]);
  });

  it('should roundtrip a real devtools log properly', () => {
    const records = NetworkRecorder.recordsFromLogs(lcpDevtoolsLog);

    // Skip verification in the method because we have circular references.
    // We'll do our own stricter verification.
    const roundTripLogs = networkRecordsToDevtoolsLog(records, {skipVerification: true});
    const roundTripRecords = NetworkRecorder.recordsFromLogs(roundTripLogs);

    expect(roundTripRecords).toEqual(records);
  });
});
