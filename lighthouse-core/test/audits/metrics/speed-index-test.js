/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

const Audit = require('../../../audits/metrics/speed-index.js');
const assert = require('assert').strict;
const options = Audit.defaultOptions;
const constants = require('../../../config/constants.js');

const pwaTrace = require('../../fixtures/traces/progressive-app-m60.json');
const pwaDevtoolsLog = require('../../fixtures/traces/progressive-app-m60.devtools.log.json');

/**
 * @param {{
 * {LH.SharedFlagsSettings['formFactor']} formFactor
 * {LH.SharedFlagsSettings['throttlingMethod']} throttlingMethod
 * }} param0
 */
const getFakeContext = ({formFactor, throttlingMethod}) => ({
  options: options,
  computedCache: new Map(),
  settings: {
    formFactor: formFactor,
    throttlingMethod,
    screenEmulation: constants.screenEmulationMetrics[formFactor],
  },
});


describe('Performance: speed-index audit', () => {
  it('works on a real trace', () => {
    const artifacts = {
      traces: {defaultPass: pwaTrace},
      devtoolsLogs: {defaultPass: pwaDevtoolsLog},
    };

    const context = getFakeContext({formFactor: 'mobile', throttlingMethod: 'provided'});
    return Audit.audit(artifacts, context).then(result => {
      assert.equal(result.score, 1);
      assert.equal(result.numericValue, 605);
    });
  }, 10000);
});
