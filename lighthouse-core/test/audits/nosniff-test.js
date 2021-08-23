/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

const Nosniff = require('../../audits/nosniff.js');
const networkRecordsToDevtoolsLog = require('../network-records-to-devtools-log.js');

describe('Nosniff audit', () => {
  it('should work', async () => {
    const devtoolsLog = networkRecordsToDevtoolsLog([
      {url: 'http://example.com/url1-fail.txt', responseHeaders: [
        {name: 'Content-Type', value: 'text/plain'},
      ]},
      {url: 'http://example.com/url2-fail.txt', responseHeaders: [
        {name: 'X-Content-Type-Options', value: 'nosniff'},
      ]},
      {url: 'http://example.com/url3-fail.txt', responseHeaders: [
        {name: 'X-Content-Type-Options', value: 'what'},
      ]},
      {url: 'http://example.com/url4-pass.txt', responseHeaders: [
        {name: 'Content-Type', value: 'text/plain'},
        {name: 'X-Content-Type-Options', value: 'nosniff'},
      ]},
      {url: 'filesystem://url5-pass.txt', responseHeaders: []},
    ]);
    const artifacts = {devtoolsLogs: {defaultPass: devtoolsLog}};
    const result = await Nosniff.audit(artifacts, {computedCache: new Map()});

    expect(result.details.items).toEqual([
      {url: 'http://example.com/url1-fail.txt', hasContentType: true, hasNosniff: false},
      {url: 'http://example.com/url2-fail.txt', hasContentType: false, hasNosniff: true},
      {url: 'http://example.com/url3-fail.txt', hasContentType: false, hasNosniff: false},
    ]);
  });
});
