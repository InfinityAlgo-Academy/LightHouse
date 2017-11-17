/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env mocha */
const BootupTime = require('../../audits/bootup-time.js');
const fs = require('fs');
const assert = require('assert');

// sadly require(file) is not working correctly.
// traceParser parser returns preact trace data the same as JSON.parse
// fails when require is used
const acceptableTrace = JSON.parse(
  fs.readFileSync(__dirname + '/../fixtures/traces/progressive-app-m60.json')
);
const errorTrace = JSON.parse(
  fs.readFileSync(__dirname + '/../fixtures/traces/airhorner_no_fcp.json')
);

describe('Performance: bootup-time audit', () => {
  it('should compute the correct BootupTime values', () => {
    const artifacts = {
      traces: {
        [BootupTime.DEFAULT_PASS]: acceptableTrace,
      },
    };

    const output = BootupTime.audit(artifacts);
    assert.equal(output.details.items.length, 8);
    assert.equal(output.score, true);
    assert.equal(Math.round(output.rawValue), 176);

    const roundedValueOf = name => {
      const value = output.extendedInfo.value[name];
      const roundedValue = {};
      Object.keys(value).forEach(key => roundedValue[key] = Math.round(value[key] * 10) / 10);
      return roundedValue;
    };

    assert.deepEqual(roundedValueOf('https://www.google-analytics.com/analytics.js'), {'Script Evaluation': 40.1, 'Script Parsing & Compile': 9.6, 'Style & Layout': 0.2});
    assert.deepEqual(roundedValueOf('https://pwa.rocks/script.js'), {'Script Evaluation': 31.8, 'Style & Layout': 5.5, 'Script Parsing & Compile': 1.3});
    assert.deepEqual(roundedValueOf('https://www.googletagmanager.com/gtm.js?id=GTM-Q5SW'), {'Script Evaluation': 25, 'Script Parsing & Compile': 5.5, 'Style & Layout': 1.2});
    assert.deepEqual(roundedValueOf('https://www.google-analytics.com/plugins/ua/linkid.js'), {'Script Evaluation': 25.2, 'Script Parsing & Compile': 1.2});
    assert.deepEqual(roundedValueOf('https://www.google-analytics.com/cx/api.js?experiment=jdCfRmudTmy-0USnJ8xPbw'), {'Script Parsing & Compile': 3, 'Script Evaluation': 1.2});
    assert.deepEqual(roundedValueOf('https://www.google-analytics.com/cx/api.js?experiment=qvpc5qIfRC2EMnbn6bbN5A'), {'Script Parsing & Compile': 2.5, 'Script Evaluation': 1});
    assert.deepEqual(roundedValueOf('https://pwa.rocks/'), {'Parsing DOM': 14.2, 'Script Evaluation': 6.1, 'Script Parsing & Compile': 1.2});
    assert.deepEqual(roundedValueOf('https://pwa.rocks/0ff789bf.js'), {'Parsing DOM': 0});
  });

  it('should get no data when no events are present', () => {
    const artifacts = {
      traces: {
        [BootupTime.DEFAULT_PASS]: errorTrace,
      },
    };

    const output = BootupTime.audit(artifacts);
    assert.equal(output.details.items.length, 0);
    assert.equal(output.score, true);
    assert.equal(Math.round(output.rawValue), 0);
  });
});
