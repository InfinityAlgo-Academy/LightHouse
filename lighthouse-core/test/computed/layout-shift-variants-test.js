/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const LayoutShiftVariants = require('../../computed/layout-shift-variants.js');
const jumpyClsTrace = require('../fixtures/traces/jumpy-cls-m90.json');
const frameMetricsTrace = require('../fixtures/traces/frame-metrics-m89.json');
const preClsTrace = require('../fixtures/traces/progressive-app-m60.json');
const createTestTrace = require('../create-test-trace.js');

/* eslint-env jest */

describe('Layout Shift Variants', () => {
  const context = {
    computedCache: new Map(),
  };

  describe('real traces', () => {
    it('calculates CLS variants for a trace', async () => {
      const variants = await LayoutShiftVariants.request(jumpyClsTrace, context);
      expect(variants).toEqual({
        avgSessionGap5s: expect.toBeApproximately(4.809794, 6),
        maxSessionGap1s: expect.toBeApproximately(2.897995, 6),
        maxSessionGap1sLimit5s: expect.toBeApproximately(2.268816, 6),
        maxSliding1s: expect.toBeApproximately(1.911799, 6),
        maxSliding300ms: expect.toBeApproximately(1.436742, 6),
      });
    });

    it('calculates CLS variants for a trace with a single (main frame) CLS event', async () => {
      // Only a single CLS `is_main_frame` event in this trace.
      const variants = await LayoutShiftVariants.request(frameMetricsTrace, context);
      expect(variants).toEqual({
        avgSessionGap5s: 0.0011656245471340055,
        maxSessionGap1s: 0.0011656245471340055,
        maxSessionGap1sLimit5s: 0.0011656245471340055,
        maxSliding1s: 0.0011656245471340055,
        maxSliding300ms: 0.0011656245471340055,
      });
    });

    it('handles a trace with no CLS events', async () => {
      const variants = await LayoutShiftVariants.request(preClsTrace, context);
      expect(variants).toEqual({
        avgSessionGap5s: 0,
        maxSessionGap1s: 0,
        maxSessionGap1sLimit5s: 0,
        maxSliding1s: 0,
        maxSliding300ms: 0,
      });
    });
  });

  describe('constructed traces', () => {
    /**
     * @param {Array<{score: number, ts: number, had_recent_input?: boolean}>} shiftEventsData
     */
    function makeTrace(shiftEventsData) {
      let cumulativeScore = 0;
      const shiftEvents = shiftEventsData.map(data => {
        const {score, ts, had_recent_input = false} = data; // eslint-disable-line camelcase

        if (!had_recent_input) cumulativeScore += score; // eslint-disable-line camelcase
        return {
          name: 'LayoutShift',
          cat: 'loading',
          ph: 'I',
          pid: 1111,
          tid: 222,
          ts: ts,
          args: {
            data: {is_main_frame: true, had_recent_input, score, cumulative_score: cumulativeScore},
          },
        };
      });

      const trace = createTestTrace({traceEnd: 30_000});
      trace.traceEvents.push(...shiftEvents);
      return trace;
    }

    // Test numbers verified against Chrome Speed Metrics tooling.
    it('calculates from a uniform distribution of layout shift events', async () => {
      const shiftEvents = [];
      for (let i = 0; i < 30; i++) {
        shiftEvents.push({
          score: 0.125,
          ts: (i + 0.5) * 1_000_000,
        });
      }
      const trace = makeTrace(shiftEvents);

      const variants = await LayoutShiftVariants.request(trace, context);
      expect(variants).toEqual({
        avgSessionGap5s: 3.75,
        maxSessionGap1s: 3.75,
        maxSessionGap1sLimit5s: 0.75,
        maxSliding1s: 0.25,
        maxSliding300ms: 0.125,
      });
    });

    it('calculates from three clusters of layout shift events', async () => {
      const shiftEvents = [
        {score: 0.0625, ts: 1_000_000},
        {score: 0.2500, ts: 1_200_000},
        {score: 0.0625, ts: 1_250_000}, // Still in 300ms sliding window.
        {score: 0.1250, ts: 2_200_000}, // Sliding windows excluding most of cluster.

        {score: 0.0625, ts: 3_000_000}, // 1.8s gap > 1s but < 5s.
        {score: 0.2500, ts: 3_400_000},
        {score: 0.2500, ts: 4_000_000},

        {score: 0.1250, ts: 10_000_000}, // > 5s gap
        {score: 0.1250, ts: 10_400_000},
        {score: 0.0625, ts: 10_680_000},
      ];
      const trace = makeTrace(shiftEvents);

      const variants = await LayoutShiftVariants.request(trace, context);
      expect(variants).toEqual({
        avgSessionGap5s: 0.6875,
        maxSessionGap1s: 1.0625,
        maxSessionGap1sLimit5s: 1.0625,
        maxSliding1s: 0.5625,
        maxSliding300ms: 0.375,
      });
    });

    it('calculates the same LS score from a teeny tiny extra small cluster of events', async () => {
      const shiftEvents = [];
      for (let i = 0; i < 30; i++) {
        shiftEvents.push({
          score: 0.125,
          ts: 1_000_000 + i * 10_000,
        });
      }
      const trace = makeTrace(shiftEvents);

      const variants = await LayoutShiftVariants.request(trace, context);
      expect(variants).toEqual({
        avgSessionGap5s: 3.75, // 30 * 0.125
        maxSessionGap1s: 3.75,
        maxSessionGap1sLimit5s: 3.75,
        maxSliding1s: 3.75,
        maxSliding300ms: 3.75,
      });
    });

    it('includes events with recent input at beginning of trace, but ignores others', async () => {
      const shiftEvents = [
        {score: 1, ts: 250_000, had_recent_input: true},
        {score: 1, ts: 500_000, had_recent_input: true},
        {score: 1, ts: 750_000, had_recent_input: true},
        {score: 1, ts: 1_000_000, had_recent_input: true}, // These first four events will still be counted.

        {score: 1, ts: 1_250_000, had_recent_input: false},

        {score: 1, ts: 1_500_000, had_recent_input: true}, // The last four will not.
        {score: 1, ts: 1_750_000, had_recent_input: true},
        {score: 1, ts: 2_000_000, had_recent_input: true},
        {score: 1, ts: 2_250_000, had_recent_input: true},
      ];
      const trace = makeTrace(shiftEvents);

      const variants = await LayoutShiftVariants.request(trace, context);
      expect(variants).toEqual({
        avgSessionGap5s: 5,
        maxSessionGap1s: 5,
        maxSessionGap1sLimit5s: 5,
        maxSliding1s: 5,
        maxSliding300ms: 2,
      });
    });

    describe('variants include events on window/cluster bounds', () => {
      it('avgSessionGap5s only counts gaps > 5s', async () => {
        const shiftEvents = [
          {score: 1, ts: 1_000_000},
          {score: 1, ts: 6_000_000}, // Included since exactly 5s later.
        ];
        const trace = makeTrace(shiftEvents);
        const variants = await LayoutShiftVariants.request(trace, context);
        expect(variants.avgSessionGap5s).toEqual(2);
      });

      it('maxSessionGap1s only counts gaps > 1s', async () => {
        const shiftEvents = [
          {score: 1, ts: 1_000_000},
          {score: 1, ts: 2_000_000}, // Included since exactly 1s later.
        ];
        const trace = makeTrace(shiftEvents);
        const variants = await LayoutShiftVariants.request(trace, context);
        expect(variants.maxSessionGap1s).toEqual(2);
      });

      it('maxSessionGap1sLimit5s counts gaps > 1s and limits cluster length to <= 5s', async () => {
        const shiftEvents = [
          {score: 1, ts: 1_000_000},
          {score: 1, ts: 2_000_000}, // All of these included since exactly 1s after the last.
          {score: 1, ts: 3_000_000},
          {score: 1, ts: 4_000_000},
          {score: 1, ts: 5_000_000},
          {score: 1, ts: 6_000_000}, // Included since exactly 5s after beginning of cluster.
        ];
        const trace = makeTrace(shiftEvents);
        const variants = await LayoutShiftVariants.request(trace, context);
        expect(variants.maxSessionGap1sLimit5s).toEqual(6);
      });

      it('maxSliding1s includes events exactly 1s apart in window', async () => {
        const shiftEvents = [
          {score: 1, ts: 1_000_000},
          {score: 1, ts: 2_000_000}, // Included since exactly 1s later.
        ];
        const trace = makeTrace(shiftEvents);
        const variants = await LayoutShiftVariants.request(trace, context);
        expect(variants.maxSliding1s).toEqual(2);
      });

      it('maxSliding300ms includes events exactly 300ms apart in window', async () => {
        const shiftEvents = [
          {score: 1, ts: 1_000_000},
          {score: 1, ts: 1_300_000}, // Included since exactly 300ms later.
        ];
        const trace = makeTrace(shiftEvents);
        const variants = await LayoutShiftVariants.request(trace, context);
        expect(variants.maxSliding300ms).toEqual(2);
      });
    });
  });
});
