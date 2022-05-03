/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

import ServerResponseTime from '../../audits/server-response-time.js';
import networkRecordsToDevtoolsLog from '../network-records-to-devtools-log.js';

/* eslint-env jest */
describe('Performance: server-response-time audit', () => {
  it('fails when response time of root document is higher than 600ms', async () => {
    const mainResource = {
      url: 'https://example.com/',
      requestId: '0',
      timing: {receiveHeadersEnd: 830, sendEnd: 200},
    };
    const devtoolsLog = networkRecordsToDevtoolsLog([mainResource]);

    const artifacts = {
      devtoolsLogs: {[ServerResponseTime.DEFAULT_PASS]: devtoolsLog},
      URL: {mainDocumentUrl: 'https://example.com/'},
      GatherContext: {gatherMode: 'navigation'},
    };

    const result = await ServerResponseTime.audit(artifacts, {computedCache: new Map()});
    expect(result).toMatchObject({
      score: 0,
      numericValue: 630,
      details: {
        overallSavingsMs: 530,
        items: [{url: 'https://example.com/', responseTime: 630}],
      },
    });
  });

  it('succeeds when response time of root document is lower than 600ms', async () => {
    const mainResource = {
      url: 'https://example.com/',
      requestId: '0',
      timing: {receiveHeadersEnd: 400, sendEnd: 200},
    };
    const devtoolsLog = networkRecordsToDevtoolsLog([mainResource]);

    const artifacts = {
      devtoolsLogs: {[ServerResponseTime.DEFAULT_PASS]: devtoolsLog},
      URL: {mainDocumentUrl: 'https://example.com/'},
      GatherContext: {gatherMode: 'navigation'},
    };

    const result = await ServerResponseTime.audit(artifacts, {computedCache: new Map()});
    expect(result).toMatchObject({
      numericValue: 200,
      score: 1,
    });
  });

  it('throws error if no main resource', async () => {
    const devtoolsLog = networkRecordsToDevtoolsLog([]);

    const artifacts = {
      devtoolsLogs: {[ServerResponseTime.DEFAULT_PASS]: devtoolsLog},
      URL: {mainDocumentUrl: 'https://example.com/'},
      GatherContext: {gatherMode: 'navigation'},
    };

    const resultPromise = ServerResponseTime.audit(artifacts, {computedCache: new Map()});
    await expect(resultPromise).rejects.toThrow(/Unable to identify the main resource/);
  });
});
