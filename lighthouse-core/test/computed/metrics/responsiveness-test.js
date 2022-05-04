/**
 * @license Copyright 2022 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

import {strict as assert} from 'assert';

import Responsiveness from '../../../computed/metrics/responsiveness.js';
import createTestTrace from '../../create-test-trace.js';

import interactionTrace from '../../fixtures/traces/timespan-responsiveness-m103.trace.json';
import noInteractionTrace from '../../fixtures/traces/frame-metrics-m89.json';

/* eslint-env jest */

const childFrameId = 'CAF4634127666E186C9C8B35627DBF0B';

/**
 * @param {Array<{maxDuration: number, ts: number, interactionType?: 'keyboard'|'tapOrClick', inChildFrame?: boolean}>} interactionEventsData
 */
function makeTrace(interactionEventsData) {
  let needsChildFrame = false;
  let lastTs = 0;
  for (const evtData of interactionEventsData) {
    if (evtData.inChildFrame) needsChildFrame = true;
    lastTs = Math.max(lastTs, evtData.ts);
  }

  // If there are non-mainFrame events, create a child frame in trace to add those events to.
  const childFrames = needsChildFrame ? [{frame: childFrameId}] : [];
  const trace = createTestTrace({traceEnd: lastTs + 10_000, childFrames});

  const navigationStartEvt = trace.traceEvents.find(e => e.name === 'navigationStart');
  assert(navigationStartEvt?.args?.frame);
  const mainFrameId = navigationStartEvt.args.frame;

  /** @type {Array<LH.TraceEvent>} */
  const interactionEvents = interactionEventsData.map(data => {
    const {
      maxDuration,
      ts,
      interactionType = 'keyboard',
      inChildFrame = false,
    } = data;

    return {
      name: 'Responsiveness.Renderer.UserInteraction',
      cat: 'devtools.timeline',
      ph: 'X',
      pid: 1111,
      tid: 222,
      ts: ts,
      tts: ts,
      dur: 14,
      tdur: 14,
      args: {
        frame: inChildFrame ? childFrameId : mainFrameId,
        data: {
          interactionType,
          maxDuration,
        },
      },
    };
  });

  trace.traceEvents.push(...interactionEvents);
  return trace;
}

describe('Metric: Responsiveness', () => {
  it('should return null if there were no interactions', async () => {
    const metricInputData = {
      trace: makeTrace([]),
      settings: {throttlingMethod: 'provided'},
    };
    const context = {computedCache: new Map()};
    const result = await Responsiveness.request(metricInputData, context);
    expect(result).toEqual(null);
  });

  it('should select the 98th percentile interaction', async () => {
    for (let eventCount = 1; eventCount < 601; eventCount++) {
      const interactionEvents = [];
      for (let i = 0; i < eventCount; i++) {
        interactionEvents.push({
          ts: i * (i + 3) / 2, // End of the last event + 1ms.
          maxDuration: i + 1, // Identify events by unique maxDuration.
        });
      }
      const metricInputData = {
        trace: makeTrace(interactionEvents),
        settings: {throttlingMethod: 'provided'},
      };

      // For a list labeled 1-n, result will be `Math.ceil(0.98 * n)`th element
      // until n > 500, when it becomes capped at the 10th worst duration.
      let expectedTiming = Math.ceil(0.98 * eventCount);
      if (eventCount >= 500) {
        expectedTiming = eventCount - 9;
      }

      const context = {computedCache: new Map()};
      const result = await Responsiveness.request(metricInputData, context);
      assert.equal(result.timing, expectedTiming, `error at ${eventCount} events`);
    }
  });

  it('should consider interaction events across the frame tree', async () => {
    const interactionEvents = [];
    for (let i = 0; i < 50; i++) {
      const maxDuration = i + 1;
      interactionEvents.push({
        ts: i * 100,
        maxDuration,
        inChildFrame: Boolean(maxDuration % 2),
      });
    }

    const trace = makeTrace(interactionEvents);
    // Ensure the target high-percentile event is where it's expected.
    const targetEvent = trace.traceEvents.find(evt => {
      return evt.name === 'Responsiveness.Renderer.UserInteraction' &&
          evt.args.data?.maxDuration === 49;
    });
    expect(targetEvent?.args.frame).toEqual(childFrameId);

    const metricInputData = {
      trace,
      settings: {throttlingMethod: 'provided'},
    };
    const context = {computedCache: new Map()};
    const result = await Responsiveness.request(metricInputData, context);
    expect(result).toEqual({timing: 49});
  });

  it('should throw on attempting with a simulated timespan', async () => {
    const metricInputData = {
      trace: makeTrace([]),
      settings: {throttlingMethod: 'simulate'},
    };
    expect(Responsiveness.request(metricInputData, {computedCache: new Map()}))
      .rejects.toThrow();
  });

  it('evaluates from a real trace', async () => {
    const metricInputData = {
      trace: interactionTrace,
      settings: {throttlingMethod: 'provided'},
    };
    const context = {computedCache: new Map()};
    const result = await Responsiveness.request(metricInputData, context);
    expect(result).toEqual({timing: 392});
  });

  it('evaluates from a real trace with no interaction events', async () => {
    const metricInputData = {
      trace: noInteractionTrace,
      settings: {throttlingMethod: 'provided'},
    };
    const context = {computedCache: new Map()};
    const result = await Responsiveness.request(metricInputData, context);
    expect(result).toEqual(null);
  });
});
