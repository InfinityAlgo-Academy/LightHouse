/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env mocha */
const assert = require('assert');
const path = require('path');
const fs = require('fs');

const run = require('../../run');
const fastConfig = {
  'extends': 'lighthouse:default',
  'settings': {
    'onlyAudits': ['viewport']
  }
};

const getFlags = require('../../cli-flags').getFlags;

describe('CLI run', function() {
  it('runLighthouse completes a LH round trip', () => {
    const url = 'chrome://version';
    const filename = path.join(process.cwd(), 'run.ts.results.json');
    const flags = getFlags(`--output=json --output-path=${filename} ${url}`);
    return run.runLighthouse(url, flags, fastConfig).then(_ => {
      assert.ok(fs.existsSync(filename));
      const results = JSON.parse(fs.readFileSync(filename, 'utf-8'));
      assert.equal(results.audits.viewport.rawValue, false);
      fs.unlinkSync(filename);
    });
  });
});
