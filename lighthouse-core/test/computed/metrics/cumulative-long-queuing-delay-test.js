/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const CumulativeLongQueuingDelay =
    require('../../../computed/metrics/cumulative-long-queuing-delay.js');
const trace = require('../../fixtures/traces/progressive-app-m60.json');
const devtoolsLog = require('../../fixtures/traces/progressive-app-m60.devtools.log.json');

/* eslint-env jest */

describe('Metrics: CumulativeLongQueuingDelay', () => {
  it('should compute a simulated value', async () => {
    const settings = {throttlingMethod: 'simulate'};
    const context = {settings, computedCache: new Map()};
    const result = await CumulativeLongQueuingDelay.request(
      {trace, devtoolsLog, settings},
      context
    );

    expect({
      timing: Math.round(result.timing),
      optimistic: Math.round(result.optimisticEstimate.timeInMs),
      pessimistic: Math.round(result.pessimisticEstimate.timeInMs),
    }).toMatchInlineSnapshot(`
Object {
  "optimistic": 719,
  "pessimistic": 777,
  "timing": 748,
}
`);
  });

  it('should compute an observed value', async () => {
    const settings = {throttlingMethod: 'provided'};
    const context = {settings, computedCache: new Map()};
    const result = await CumulativeLongQueuingDelay.request(
      {trace, devtoolsLog, settings},
      context
    );
    expect(result.timing).toBeCloseTo(48.3, 1);
  });

  describe('#calculateSumOfLongQueuingDelay', () => {
    it('reports 0 when no task is longer than 50ms', () => {
      const events = [
        {start: 1000, end: 1050, duration: 50},
        {start: 2000, end: 2010, duration: 10},
      ];

      const fcpTimeMs = 500;
      const interactiveTimeMs = 4000;

      expect(CumulativeLongQueuingDelay.calculateSumOfLongQueuingDelay(
        events,
        fcpTimeMs,
        interactiveTimeMs
      )).toBe(0);
    });

    it('only looks at tasks within FMP and TTI', () => {
      const events = [
        {start: 1000, end: 1060, duration: 60},
        {start: 2000, end: 2100, duration: 100},
        {start: 2300, end: 2450, duration: 150},
        {start: 2600, end: 2800, duration: 200},
      ];

      const fcpTimeMs = 1500;
      const interactiveTimeMs = 2500;

      expect(CumulativeLongQueuingDelay.calculateSumOfLongQueuingDelay(
        events,
        fcpTimeMs,
        interactiveTimeMs
      )).toBe(150);
    });

    it('clips queuing delay regions properly', () => {
      const fcpTimeMs = 1050;
      const interactiveTimeMs = 2050;

      const events = [
        {start: 1000, end: 1110, duration: 110}, // Contributes 10ms.
        {start: 2000, end: 2200, duration: 200}, // Contributes 50ms.
      ];

      expect(CumulativeLongQueuingDelay.calculateSumOfLongQueuingDelay(
        events,
        fcpTimeMs,
        interactiveTimeMs
      )).toBe(60);
    });

    // This can happen in the lantern metric case, where we use the optimistic
    // TTI and pessimistic FCP.
    it('returns 0 if interactiveTime is earlier than FCP', () => {
      const fcpTimeMs = 2050;
      const interactiveTimeMs = 1050;

      const events = [
        {start: 500, end: 3000, duration: 2500},
      ];

      expect(CumulativeLongQueuingDelay.calculateSumOfLongQueuingDelay(
        events,
        fcpTimeMs,
        interactiveTimeMs
      )).toBe(0);
    });
  });
});
