/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const CumulativeLayoutShiftAllFrames = require('../../../computed/metrics/cumulative-layout-shift-all-frames.js'); // eslint-disable-line max-len
const trace = require('../../fixtures/traces/frame-metrics-m89.json');
const invalidTrace = require('../../fixtures/traces/progressive-app-m60.json');
const createTestTrace = require('../../create-test-trace.js');

/* eslint-env jest */

describe('Metrics: CLS All Frames', () => {
  it('should compute value', async () => {
    const context = {computedCache: new Map()};
    const result = await CumulativeLayoutShiftAllFrames.request(trace, context);
    expect(result.value).toBeCloseTo(0.54);
  });

  it('should fail to compute a value for old trace', async () => {
    const context = {computedCache: new Map()};
    const result = await CumulativeLayoutShiftAllFrames.request(invalidTrace, context);
    expect(result.value).toBe(0);
  });

  function makeTrace(shiftEventsData) {
    const cumulativeScores = new Map();
    const children = shiftEventsData.map(data => {
      let cumulativeScore = cumulativeScores.get(data.pid) || 0;
      if (!data.had_recent_input) cumulativeScore += data.score;
      cumulativeScores.set(data.pid, cumulativeScore);
      return {
        name: 'LayoutShift',
        cat: 'loading',
        ph: 'I',
        pid: data.pid,
        tid: data.tid,
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

  it('collects layout shift data from all processes', async () => {
    const context = {computedCache: new Map()};
    const trace = makeTrace([
      {pid: 1111, tid: 222, score: 1, had_recent_input: false},
      {pid: 3333, tid: 444, score: 1, had_recent_input: false},
      {pid: 3333, tid: 444, score: 1, had_recent_input: false},
      {pid: 1111, tid: 222, score: 1, had_recent_input: false},
    ]);
    const result = await CumulativeLayoutShiftAllFrames.request(trace, context);
    expect(result.value).toBe(4);
  });
});
