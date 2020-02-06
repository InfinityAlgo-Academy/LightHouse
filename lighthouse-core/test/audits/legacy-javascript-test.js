/**
 * @license Copyright 2020 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const assert = require('assert');
const LegacyJavascript = require('../../audits/legacy-javascript.js');
const networkRecordsToDevtoolsLog = require('../network-records-to-devtools-log.js');

/**
 * @param {Array<{url: string, code: string}>} scripts
 * @return {LH.Artifacts}
 */
const createArtifacts = (scripts) => {
  const networkRecords = scripts.map(({url}, index) => ({
    requestId: String(index),
    url,
  }));
  return {
    URL: {finalUrl: '', requestedUrl: ''},
    devtoolsLogs: {defaultPass: networkRecordsToDevtoolsLog(networkRecords)},
    ScriptElements: scripts.reduce((acc, {code}, index) => {
      acc[String(index)] = {
        content: code,
        requestId: String(index),
      };
      return acc;
    }, {}),
  };
};

/* eslint-env jest */
describe('LegacyJavaScript audit', () => {
  it('passes code with no polyfills', async () => {
    const artifacts = createArtifacts([
      {
        code: 'var message = "hello world"; console.log(message);',
        url: 'https://www.example.com/a.js',
      },
      {
        code: 'SomeGlobal = function() {}',
        url: 'https://www.example.com/a.js',
      },
      {
        code: 'SomeClass.prototype.someFn = function() {}',
        url: 'https://www.example.com/a.js',
      },
      {
        code: 'Object.defineProperty(SomeClass.prototype, "someFn", function() {})',
        url: 'https://www.example.com/a.js',
      },
    ]);
    const result = await LegacyJavascript.audit(artifacts, {computedCache: new Map()});
    assert.equal(result.score, 1);
    assert.equal(result.extendedInfo.signalCount, 0);
  });

  it('fails code with a legacy polyfill', async () => {
    const artifacts = createArtifacts([
      {
        code: 'String.prototype.repeat = function() {}',
        url: 'https://www.example.com/a.js',
      },
    ]);
    const result = await LegacyJavascript.audit(artifacts, {computedCache: new Map()});
    assert.equal(result.score, 0);
    assert.equal(result.extendedInfo.signalCount, 1);
    expect(result.details.items[0].signals).toEqual(['String.prototype.repeat']);
  });

  it('fails code with multiple legacy polyfills', async () => {
    const artifacts = createArtifacts([
      {
        code: 'String.prototype.repeat = function() {}; String.prototype.includes = function() {}',
        url: 'https://www.example.com/a.js',
      },
    ]);
    const result = await LegacyJavascript.audit(artifacts, {computedCache: new Map()});
    assert.equal(result.score, 0);
    assert.equal(result.extendedInfo.signalCount, 2);
  });

  it('counts multiple of the same polyfill from the same script only once', async () => {
    const artifacts = createArtifacts([
      {
        code: (() => {
          // eslint-disable-next-line no-extend-native
          String.prototype.repeat = function() {};
          // eslint-disable-next-line no-extend-native
          Object.defineProperty(String.prototype, 'repeat', function() {});
        }),
        url: 'https://www.example.com/a.js',
      },
    ]);
    const result = await LegacyJavascript.audit(artifacts, {computedCache: new Map()});
    assert.equal(result.score, 0);
    assert.equal(result.extendedInfo.signalCount, 1);
  });

  it('should identify polyfills in multiple patterns', async () => {
    const scripts = [
      {
        code: 'String.prototype.repeat = function() {}',
        url: 'https://www.example.com/1.js',
      },
      {
        code: 'String.prototype["repeat"] = function() {}',
        url: 'https://www.example.com/2.js',
      },
      {
        code: 'String.prototype[\'repeat\'] = function() {}',
        url: 'https://www.example.com/3.js',
      },
      {
        code: 'Object.defineProperty(String.prototype, "repeat", function() {})',
        url: 'https://www.example.com/4.js',
      },
      {
        code: 'Object.defineProperty(String.prototype, \'repeat\', function() {})',
        url: 'https://www.example.com/5.js',
      },
      {
        code: 'Object.defineProperty(window, \'WeakMap\', function() {})',
        url: 'https://www.example.com/6.js',
      },
      {
        code: ';$export($export.S,"Object",{values:function values(t){return i(t)}})',
        url: 'https://www.example.com/7.js',
      },
      {
        code: 'WeakMap = function() {}',
        url: 'https://www.example.com/8.js',
      },
      {
        code: 'window.WeakMap = function() {}',
        url: 'https://www.example.com/9.js',
      },
      {
        code: 'function WeakMap() {}',
        url: 'https://www.example.com/10.js',
      },
      {
        code: 'String.raw = function() {}',
        url: 'https://www.example.com/11.js',
      },
    ];
    const artifacts = createArtifacts(scripts);
    const result = await LegacyJavascript.audit(artifacts, {computedCache: new Map()});
    assert.equal(result.score, 0);
    expect(result.details.items.map(item => item.url)).toEqual(scripts.map(script => script.url));
  });
});
