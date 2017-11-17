/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env mocha */
const PageExecutionTimings = require('../../audits/mainthread-work-breakdown.js');
const fs = require('fs');
const assert = require('assert');

// sadly require(file) is not working correctly.
// traceParser parser returns preact trace data the same as JSON.parse
// fails when require is used
const acceptableTrace = JSON.parse(
  fs.readFileSync(__dirname + '/../fixtures/traces/progressive-app-m60.json')
);
const siteWithRedirectTrace = JSON.parse(
  fs.readFileSync(__dirname + '/../fixtures/traces/site-with-redirect.json')
);
const loadTrace = JSON.parse(
  fs.readFileSync(__dirname + '/../fixtures/traces/load.json')
);
const errorTrace = JSON.parse(
  fs.readFileSync(__dirname + '/../fixtures/traces/airhorner_no_fcp.json')
);

const acceptableTraceExpectations = {
  'Compile Script': 25,
  'Composite Layers': 6,
  'DOM GC': 33,
  'Evaluate Script': 131,
  'Image Decode': 1,
  'Layout': 138,
  'Major GC': 8,
  'Minor GC': 7,
  'Paint': 52,
  'Parse HTML': 14,
  'Recalculate Style': 170,
  'Update Layer Tree': 25,
};
const siteWithRedirectTraceExpectations = {
  'Compile Script': 38,
  'Composite Layers': 2,
  'DOM GC': 25,
  'Evaluate Script': 122,
  'Image Decode': 0,
  'Layout': 209,
  'Major GC': 10,
  'Minor GC': 11,
  'Paint': 4,
  'Parse HTML': 52,
  'Parse Stylesheet': 51,
  'Recalculate Style': 66,
  'Update Layer Tree': 5,
};
const loadTraceExpectations = {
  'Animation Frame Fired': 6,
  'Composite Layers': 15,
  'Evaluate Script': 296,
  'Image Decode': 4,
  'Layout': 51,
  'Minor GC': 3,
  'Paint': 9,
  'Parse HTML': 25,
  'Recalculate Style': 80,
  'Update Layer Tree': 16,
  'XHR Load': 19,
  'XHR Ready State Change': 1,
};

describe('Performance: page execution timings audit', () => {
  it('should compute the correct pageExecutionTiming values for the pwa trace', () => {
    const artifacts = {
      traces: {
        [PageExecutionTimings.DEFAULT_PASS]: acceptableTrace,
      },
    };
    const output = PageExecutionTimings.audit(artifacts);
    const valueOf = name => Math.round(output.extendedInfo.value[name]);

    assert.equal(output.details.items.length, 12);
    assert.equal(output.score, false);
    assert.equal(Math.round(output.rawValue), 611);

    for (const category in output.extendedInfo.value) {
      if (output.extendedInfo.value[category]) {
        assert.equal(valueOf(category), acceptableTraceExpectations[category]);
      }
    }
  });

  it('should compute the correct pageExecutionTiming values for the redirect trace', () => {
    const artifacts = {
      traces: {
        [PageExecutionTimings.DEFAULT_PASS]: siteWithRedirectTrace,
      },
    };
    const output = PageExecutionTimings.audit(artifacts);
    const valueOf = name => Math.round(output.extendedInfo.value[name]);
    assert.equal(output.details.items.length, 13);
    assert.equal(output.score, false);
    assert.equal(Math.round(output.rawValue), 596);

    for (const category in output.extendedInfo.value) {
      if (output.extendedInfo.value[category]) {
        assert.equal(valueOf(category), siteWithRedirectTraceExpectations[category]);
      }
    }
  });

  it('should compute the correct pageExecutionTiming values for the load trace', () => {
    const artifacts = {
      traces: {
        [PageExecutionTimings.DEFAULT_PASS]: loadTrace,
      },
    };
    const output = PageExecutionTimings.audit(artifacts);
    const valueOf = name => Math.round(output.extendedInfo.value[name]);
    assert.equal(output.details.items.length, 12);
    assert.equal(output.score, false);
    assert.equal(Math.round(output.rawValue), 524);

    for (const category in output.extendedInfo.value) {
      if (output.extendedInfo.value[category]) {
        assert.equal(valueOf(category), loadTraceExpectations[category]);
      }
    }
  });

  it('should get no data when no events are present', () => {
    const artifacts = {
      traces: {
        [PageExecutionTimings.DEFAULT_PASS]: errorTrace,
      },
    };

    const output = PageExecutionTimings.audit(artifacts);
    assert.equal(output.details.items.length, 0);
    assert.equal(output.score, false);
    assert.equal(Math.round(output.rawValue), 0);
  });
});
