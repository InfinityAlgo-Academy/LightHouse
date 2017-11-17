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
  it('should compute the correct BootupTime values', (done) => {
    const artifacts = {
      traces: {
        [BootupTime.DEFAULT_PASS]: acceptableTrace,
      },
    };

    const output = BootupTime.audit(artifacts);
    assert.equal(output.details.items.length, 8);
    assert.equal(output.score, true);
    assert.equal(Math.round(output.rawValue), 176);

    const valueOf = name => output.extendedInfo.value[name];
    assert.deepEqual(valueOf('https://www.google-analytics.com/analytics.js'), {'Evaluate Script': 40.1, 'Compile Script': 9.6, 'Recalculate Style': 0.2});
    assert.deepEqual(valueOf('https://pwa.rocks/script.js'), {'Evaluate Script': 31.8, 'Layout': 5.5, 'Compile Script': 1.3});
    assert.deepEqual(valueOf('https://www.googletagmanager.com/gtm.js?id=GTM-Q5SW'), {'Evaluate Script': 25, 'Compile Script': 5.5, 'Recalculate Style': 1.2});
    assert.deepEqual(valueOf('https://www.google-analytics.com/plugins/ua/linkid.js'), {'Evaluate Script': 25.2, 'Compile Script': 1.2});
    assert.deepEqual(valueOf('https://www.google-analytics.com/cx/api.js?experiment=jdCfRmudTmy-0USnJ8xPbw'), {'Compile Script': 3, 'Evaluate Script': 1.2});
    assert.deepEqual(valueOf('https://www.google-analytics.com/cx/api.js?experiment=qvpc5qIfRC2EMnbn6bbN5A'), {'Compile Script': 2.5, 'Evaluate Script': 1});
    assert.deepEqual(valueOf('https://pwa.rocks/'), {'Parse HTML': 14.2, 'Evaluate Script': 6.1, 'Compile Script': 1.2});
    assert.deepEqual(valueOf('https://pwa.rocks/0ff789bf.js'), {'Parse HTML': 0});

    done();
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
