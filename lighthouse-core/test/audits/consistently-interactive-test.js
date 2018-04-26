/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const ConsistentlyInteractive = require('../../audits/consistently-interactive.js');
const Runner = require('../../runner.js');
const assert = require('assert');
const options = ConsistentlyInteractive.defaultOptions;

const acceptableTrace = require('../fixtures/traces/progressive-app-m60.json');
const acceptableDevToolsLog = require('../fixtures/traces/progressive-app-m60.devtools.log.json');

const redirectTrace = require('../fixtures/traces/site-with-redirect.json');
const redirectDevToolsLog = require('../fixtures/traces/site-with-redirect.devtools.log.json');


/* eslint-env mocha */
describe('Performance: consistently-interactive audit', () => {
  it('should compute consistently interactive', () => {
    const artifacts = Object.assign({
      traces: {
        [ConsistentlyInteractive.DEFAULT_PASS]: acceptableTrace,
      },
      devtoolsLogs: {
        [ConsistentlyInteractive.DEFAULT_PASS]: acceptableDevToolsLog,
      },
    }, Runner.instantiateComputedArtifacts());

    const settings = {throttlingMethod: 'provided'};
    return ConsistentlyInteractive.audit(artifacts, {options, settings}).then(output => {
      assert.equal(output.score, 0.97);
      assert.equal(Math.round(output.rawValue), 1582);
      assert.equal(output.displayValue, '1,580\xa0ms');
    });
  });

  it('should compute consistently interactive on pages with redirect', () => {
    const artifacts = Object.assign({
      traces: {
        [ConsistentlyInteractive.DEFAULT_PASS]: redirectTrace,
      },
      devtoolsLogs: {
        [ConsistentlyInteractive.DEFAULT_PASS]: redirectDevToolsLog,
      },
    }, Runner.instantiateComputedArtifacts());

    const settings = {throttlingMethod: 'provided'};
    return ConsistentlyInteractive.audit(artifacts, {options, settings}).then(output => {
      assert.equal(output.score, 0.89);
      assert.equal(Math.round(output.rawValue), 2712);
      assert.equal(output.displayValue, '2,710\xa0ms');
    });
  });
});
