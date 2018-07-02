/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const TimeToFirstByte = require('../../audits/time-to-first-byte.js');
const assert = require('assert');

/* eslint-env jest */
describe('Performance: time-to-first-byte audit', () => {
  it('fails when ttfb of root document is higher than 600ms', () => {
    const networkRecords = [
      {url: 'https://example.com/', requestId: '0', timing: {receiveHeadersEnd: 830, sendEnd: 200}},
      {url: 'https://google.com/styles.css', requestId: '1', timing: {receiveHeadersEnd: 450, sendEnd: 200}},
      {url: 'https://google.com/image.jpg', requestId: '2', timing: {receiveHeadersEnd: 600, sendEnd: 400}},
    ];
    const artifacts = {
      devtoolsLogs: {[TimeToFirstByte.DEFAULT_PASS]: []},
      requestNetworkRecords: () => Promise.resolve(networkRecords),
      URL: {finalUrl: 'https://example.com/'},
    };

    return TimeToFirstByte.audit(artifacts).then(result => {
      assert.strictEqual(result.rawValue, 630);
      assert.strictEqual(result.score, 0);
    });
  });

  it('succeeds when ttfb of root document is lower than 600ms', () => {
    const networkRecords = [
      {url: 'https://example.com/', requestId: '0', timing: {receiveHeadersEnd: 400, sendEnd: 200}},
      {url: 'https://google.com/styles.css', requestId: '1', timing: {receiveHeadersEnd: 850, sendEnd: 200}},
      {url: 'https://google.com/image.jpg', requestId: '2', timing: {receiveHeadersEnd: 1000, sendEnd: 400}},
    ];
    const artifacts = {
      devtoolsLogs: {[TimeToFirstByte.DEFAULT_PASS]: []},
      requestNetworkRecords: () => Promise.resolve(networkRecords),
      URL: {finalUrl: 'https://example.com/'},
    };

    return TimeToFirstByte.audit(artifacts).then(result => {
      assert.strictEqual(result.rawValue, 200);
      assert.strictEqual(result.score, 1);
    });
  });

  it('throws when somehow finalUrl is not in network records', async () => {
    const networkRecords = [
      {url: 'https://example.com/', requestId: '0', timing: {receiveHeadersEnd: 400, sendEnd: 200}},
      {url: 'https://google.com/styles.css', requestId: '1', timing: {receiveHeadersEnd: 850, sendEnd: 200}},
      {url: 'https://google.com/image.jpg', requestId: '2', timing: {receiveHeadersEnd: 1000, sendEnd: 400}},
    ];
    const badFinalUrl = 'https://badexample.com/';
    const artifacts = {
      devtoolsLogs: {[TimeToFirstByte.DEFAULT_PASS]: []},
      requestNetworkRecords: () => Promise.resolve(networkRecords),
      URL: {finalUrl: badFinalUrl},
    };

    try {
      await TimeToFirstByte.audit(artifacts);
      throw new Error('TimeToFirstByte did not throw');
    } catch (e) {
      assert.ok(e.message.includes(badFinalUrl));
    }
  });
});
