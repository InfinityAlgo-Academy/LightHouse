/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const CumulativeLayoutShiftAllFrames = require('../../../computed/metrics/cumulative-layout-shift-all-frames.js'); // eslint-disable-line max-len
const frameMetricsTrace = require('../../fixtures/traces/frame-metrics-m89.json');
const invalidTrace = require('../../fixtures/traces/progressive-app-m60.json');
const createTestTrace = require('../../create-test-trace.js');

/* eslint-env jest */

describe('Metrics: CLS All Frames', () => {
  it('should compute value', async () => {
    const context = {computedCache: new Map()};
    const result = await CumulativeLayoutShiftAllFrames.request(frameMetricsTrace, context);
    expect(result.value).toBeCloseTo(0.459);
  });

  it('should fail to compute a value for old trace', async () => {
    const context = {computedCache: new Map()};
    const result = await CumulativeLayoutShiftAllFrames.request(invalidTrace, context);
    expect(result.value).toBe(0);
  });

  it('collects layout shift data from main frame and all child frames', async () => {
    const trace = createTestTrace({timeOrigin: 0, traceEnd: 2000});
    const mainFrame = trace.traceEvents[0].args.frame;
    const childFrame = 'CHILDFRAME';
    const cat = 'loading,rail,devtools.timeline';
    const context = {computedCache: new Map()};
    trace.traceEvents.push(
      /* eslint-disable max-len */
      {name: 'FrameCommittedInBrowser', cat, args: {data: {frame: mainFrame, url: 'https://example.com'}}},
      {name: 'FrameCommittedInBrowser', cat, args: {data: {frame: childFrame, parent: mainFrame, url: 'https://frame.com'}}},
      {name: 'LayoutShift', cat, args: {frame: mainFrame, data: {had_recent_input: false, score: 1}}},
      {name: 'LayoutShift', cat, args: {frame: childFrame, data: {had_recent_input: false, score: 1}}},
      {name: 'LayoutShift', cat, args: {frame: childFrame, data: {had_recent_input: false, score: 1}}},
      {name: 'LayoutShift', cat, args: {frame: mainFrame, data: {had_recent_input: true, score: 1}}},
      {name: 'LayoutShift', cat, args: {frame: childFrame, data: {had_recent_input: true, score: 1}}}
      /* eslint-enable max-len */
    );
    const result = await CumulativeLayoutShiftAllFrames.request(trace, context);
    expect(result.value).toBe(3);
  });

  it('ignores layout shift data from other tabs', async () => {
    const trace = createTestTrace({timeOrigin: 0, traceEnd: 2000});
    const mainFrame = trace.traceEvents[0].args.frame;
    const childFrame = 'CHILDFRAME';
    const otherMainFrame = 'ANOTHERTABOPEN';
    const cat = 'loading,rail,devtools.timeline';
    const context = {computedCache: new Map()};
    trace.traceEvents.push(
      /* eslint-disable max-len */
      {name: 'FrameCommittedInBrowser', cat, args: {data: {frame: mainFrame, url: 'https://example.com'}}},
      {name: 'FrameCommittedInBrowser', cat, args: {data: {frame: childFrame, parent: mainFrame, url: 'https://frame.com'}}},
      {name: 'FrameCommittedInBrowser', cat, args: {data: {frame: otherMainFrame, url: 'https://example.com'}}},
      {name: 'LayoutShift', cat, args: {frame: mainFrame, data: {had_recent_input: false, score: 1}}},
      {name: 'LayoutShift', cat, args: {frame: childFrame, data: {had_recent_input: false, score: 1}}},
      {name: 'LayoutShift', cat, args: {frame: childFrame, data: {had_recent_input: false, score: 1}}},
      {name: 'LayoutShift', cat, args: {frame: mainFrame, data: {had_recent_input: true, score: 1}}},
      {name: 'LayoutShift', cat, args: {frame: childFrame, data: {had_recent_input: true, score: 1}}},
      {name: 'LayoutShift', cat, args: {frame: otherMainFrame, data: {had_recent_input: false, score: 1}}},
      {name: 'LayoutShift', cat, args: {frame: otherMainFrame, data: {had_recent_input: false, score: 1}}}
      /* eslint-enable max-len */
    );
    const result = await CumulativeLayoutShiftAllFrames.request(trace, context);
    expect(result.value).toBe(3);
  });
});
