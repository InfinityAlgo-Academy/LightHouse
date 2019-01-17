/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const assert = require('assert');
const Pollyfills = require('../../audits/polyfills.js');
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
    devtoolsLogs: {defaultPass: networkRecordsToDevtoolsLog(networkRecords)},
    Scripts: scripts.reduce((acc, {code}, index) => {
      acc[String(index)] = code;
      return acc;
    }, {}),
  };
};

/* eslint-env jest */
describe('Polyfills', () => {
  it('should work', async () => {
    const artifacts = createArtifacts([
      {
        code: 'String.prototype.repeat = function() {}',
        url: 'https://www.example.com/a.js',
      },
      {
        code: 'String.prototype["repeat"] = function() {}',
        url: 'https://www.example.com/b.js',
      },
      {
        code: 'String.prototype[\'repeat\'] = function() {}',
        url: 'https://www.example.com/c.js',
      },
    ]);
    const result = await Pollyfills.audit(artifacts, {computedCache: new Map()});
    console.log(JSON.stringify(result, null, 2));
    assert.equal(result.score, 0);
    assert.equal(result.rawValue, 3);
  });
});
