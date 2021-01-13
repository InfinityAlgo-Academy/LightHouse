/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the 'License'); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const NoUnloadListeners = require('../../audits/no-unload-listeners.js');

/* eslint-env jest */

const testJsUsage = {
  'https://example.com/1.js': [
    {scriptId: '12', functions: []},
    {scriptId: '13', functions: []},
    {scriptId: '16', functions: []},
    {scriptId: '17', functions: []},
  ],
  'https://example.com/2.js': [
    {scriptId: '22', functions: []},
    {scriptId: '23', functions: []},
    {scriptId: '26', functions: []},
    {scriptId: '27', functions: []},
  ],
};

describe('No Unload Listeners', () => {
  it('passes when there were no listeners', () => {
    const artifacts = {JsUsage: testJsUsage, GlobalListeners: []};
    const result = NoUnloadListeners.audit(artifacts);
    expect(result).toEqual({score: 1});
  });

  it('passes when there were no `unload` listeners', () => {
    const GlobalListeners = [{
      type: 'DOMContentLoaded', scriptId: '12', lineNumber: 5, columnNumber: 0,
    }];
    const artifacts = {JsUsage: testJsUsage, GlobalListeners};
    const result = NoUnloadListeners.audit(artifacts);
    expect(result).toEqual({score: 1});
  });

  it('fails when there are unload listeners and matches them to script locations', () => {
    const GlobalListeners = [
      {type: 'unload', scriptId: '16', lineNumber: 10, columnNumber: 30},
      {type: 'unload', scriptId: '23', lineNumber: 0, columnNumber: 0},
    ];
    const artifacts = {JsUsage: testJsUsage, GlobalListeners};
    const result = NoUnloadListeners.audit(artifacts);
    expect(result.score).toEqual(0);
    expect(result.details.items).toMatchObject([
      {
        source: {type: 'source-location', url: 'https://example.com/1.js', urlProvider: 'network', line: 10, column: 30},
      }, {
        source: {type: 'source-location', url: 'https://example.com/2.js', urlProvider: 'network', line: 0, column: 0},
      },
    ]);
  });

  it('fails when there are unload listeners and has a fallback if script URL is not found', () => {
    const GlobalListeners = [
      {type: 'DOMContentLoaded', scriptId: '12', lineNumber: 5, columnNumber: 0},
      {type: 'unload', scriptId: 'notascriptid', lineNumber: 10, columnNumber: 30},
      {type: 'unload', scriptId: '22', lineNumber: 1, columnNumber: 100},
    ];
    const artifacts = {JsUsage: testJsUsage, GlobalListeners};
    const result = NoUnloadListeners.audit(artifacts);
    expect(result.score).toEqual(0);
    expect(result.details.items).toMatchObject([
      {
        source: {type: 'url', value: '(unknown)'},
      }, {
        source: {type: 'source-location', url: 'https://example.com/2.js', urlProvider: 'network', line: 1, column: 100},
      },
    ]);
  });
});
