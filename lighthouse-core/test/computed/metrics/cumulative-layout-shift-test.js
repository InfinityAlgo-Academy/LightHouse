/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const CumulativeLayoutShift = require('../../../computed/metrics/cumulative-layout-shift.js'); // eslint-disable-line max-len
const trace = require('../../results/artifacts/defaultPass.trace.json');
const invalidTrace = require('../../fixtures/traces/progressive-app-m60.json');
const createTestTrace = require('../../create-test-trace.js');

/* eslint-env jest */

describe('Metrics: CLS', () => {
  it('should compute value', async () => {
    const context = {computedCache: new Map()};
    const result = await CumulativeLayoutShift.request(trace, context);
    expect(result.value).toBe(0.42);
    expect(result.debugInfo.finalLayoutShiftTraceEventFound).toBe(true);
  });

  it('should fail to compute a value for old trace', async () => {
    const context = {computedCache: new Map()};
    const result = await CumulativeLayoutShift.request(invalidTrace, context);
    expect(result.value).toBe(0);
    expect(result.debugInfo.finalLayoutShiftTraceEventFound).toBe(false);
  });

  /**
   * @param {Array<{score: number, had_recent_input: boolean}>} shiftEventsData
   */
  function makeTrace(shiftEventsData) {
    let cumulativeScore = 0;
    const children = shiftEventsData.map(data => {
      if (!data.had_recent_input) cumulativeScore += data.score;
      return {
        name: 'LayoutShift',
        cat: 'loading',
        ph: 'I',
        pid: 1111,
        tid: 222,
        ts: 308559814315,
        args: {
          data: {
            is_main_frame: true,
            had_recent_input: data.had_recent_input,
            score: data.score,
            cumulative_score: cumulativeScore,
          },
        },
      };
    });

    const trace = createTestTrace({});
    trace.traceEvents.push(...children);
    return trace;
  }

  it('should count initial shift events even if input is true', async () => {
    const context = {computedCache: new Map()};
    const trace = makeTrace([
      {score: 1, had_recent_input: true},
      {score: 1, had_recent_input: true},
      {score: 1, had_recent_input: false},
      {score: 1, had_recent_input: false},
    ]);
    const result = await CumulativeLayoutShift.request(trace, context);
    expect(result.value).toBe(4);
  });

  it('should not count later shift events if input it true', async () => {
    const context = {computedCache: new Map()};
    const trace = makeTrace([
      {score: 1, had_recent_input: true},
      {score: 1, had_recent_input: false},
      {score: 1, had_recent_input: false},
      {score: 1, had_recent_input: true},
      {score: 1, had_recent_input: true},
    ]);
    const result = await CumulativeLayoutShift.request(trace, context);
    expect(result.value).toBe(3);
  });
});
