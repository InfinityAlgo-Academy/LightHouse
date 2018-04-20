/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('../../audits/estimated-input-latency');
const Runner = require('../../runner');
const assert = require('assert');
const options = Audit.defaultOptions;

const TracingProcessor = require('../../lib/traces/tracing-processor');
const pwaTrace = require('../fixtures/traces/progressive-app-m60.json');

const computedArtifacts = Runner.instantiateComputedArtifacts();

function generateArtifactsWithTrace(trace) {
  return Object.assign({
    traces: {
      [Audit.DEFAULT_PASS]: trace,
    },
  }, computedArtifacts);
}
/* eslint-env mocha */

describe('Performance: estimated-input-latency audit', () => {
  it('evaluates valid input correctly', () => {
    const artifacts = generateArtifactsWithTrace(pwaTrace);
    return Audit.audit(artifacts, {options}).then(output => {
      assert.equal(output.debugString, undefined);
      assert.equal(Math.round(output.rawValue * 10) / 10, 17.1);
      assert.equal(output.displayValue, '17\xa0ms');
      assert.equal(output.score, 1);
    });
  });

  describe('#audit', () => {
    let firstMeaningfulPaint;
    let traceEnd;
    let artifacts;
    let origGetMainThreadEventsFn;
    let mainThreadEvtsMock;

    beforeEach(() => {
      firstMeaningfulPaint = 0.00001;
      traceEnd = 1e20;
      artifacts = {
        traces: {},
        requestTraceOfTab() {
          const timings = {firstMeaningfulPaint, traceEnd};
          return Promise.resolve({timings});
        },
      };

      origGetMainThreadEventsFn = TracingProcessor.getMainThreadTopLevelEvents;
      TracingProcessor.getMainThreadTopLevelEvents = () => mainThreadEvtsMock(arguments);
    });

    afterEach(() => {
      TracingProcessor.getMainThreadTopLevelEvents = origGetMainThreadEventsFn;
    });

    it('uses a 5s rolling window, not traceEnd', async () => {
      mainThreadEvtsMock = () => [
        {start: 7500, end: 10000, duration: 2500},
        {start: 10000, end: 15000, duration: 5000},
      ];

      const result = await Audit.audit(artifacts, {options});
      assert.equal(result.rawValue, 4516);
      assert.equal(result.score, 0);
    });

    it('handles continuous tasks', async () => {
      const events = [];
      const longTaskDuration = 100;
      const longTaskNumber = 1000;
      const shortTaskDuration = 1.1;
      const shortTaskNumber = 10000;

      for (let i = 0; i < longTaskNumber; i++) {
        const start = i * longTaskDuration;
        events.push({start: start, end: start + longTaskDuration, duration: longTaskDuration});
      }

      const baseline = events[events.length - 1].end;
      for (let i = 0; i < shortTaskNumber; i++) {
        const start = i * shortTaskDuration + baseline;
        events.push({start: start, end: start + shortTaskDuration, duration: shortTaskDuration});
      }

      mainThreadEvtsMock = () => events;

      const result = await Audit.audit(artifacts, {options});
      assert.equal(result.rawValue, 106);
      assert.equal(result.score, 0.44);
    });
  });
});
