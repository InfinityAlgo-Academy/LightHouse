/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const TimingSummary = require('../../../computed/metrics/timing-summary.js');

const trace = require('../../fixtures/traces/frame-metrics-m89.json');
const devtoolsLog = require('../../fixtures/traces/frame-metrics-m89.devtools.log.json');

/* eslint-env jest */
describe('Timing summary', () => {
  it('contains the correct data', async () => {
    const context = {settings: {throttlingMethod: 'devtools'}, computedCache: new Map()};
    const result = await TimingSummary.request({trace, devtoolsLog}, context);

    expect(result.metrics).toMatchInlineSnapshot(`
      Object {
        "cumulativeLayoutShift": 0.0011656245471340055,
        "cumulativeLayoutShiftAllFrames": 0.4591700003057729,
        "estimatedInputLatency": 16,
        "estimatedInputLatencyTs": undefined,
        "firstCPUIdle": 863.013,
        "firstCPUIdleTs": 23466886143,
        "firstContentfulPaint": 863.013,
        "firstContentfulPaintTs": 23466886143,
        "firstMeaningfulPaint": 863.013,
        "firstMeaningfulPaintTs": 23466886143,
        "interactive": 863.013,
        "interactiveTs": 23466886143,
        "largestContentfulPaint": 863.013,
        "largestContentfulPaintAllFrames": 682.853,
        "largestContentfulPaintAllFramesTs": 23466705983,
        "largestContentfulPaintTs": 23466886143,
        "maxPotentialFID": 16,
        "observedCumulativeLayoutShift": 0.0011656245471340055,
        "observedCumulativeLayoutShiftAllFrames": 0.4591700003057729,
        "observedDomContentLoaded": 596.195,
        "observedDomContentLoadedTs": 23466619325,
        "observedFirstContentfulPaint": 863.013,
        "observedFirstContentfulPaintTs": 23466886143,
        "observedFirstMeaningfulPaint": 863.013,
        "observedFirstMeaningfulPaintTs": 23466886143,
        "observedFirstPaint": 616.458,
        "observedFirstPaintTs": 23466639588,
        "observedFirstVisualChange": 609,
        "observedFirstVisualChangeTs": 23466632130,
        "observedLargestContentfulPaint": 863.013,
        "observedLargestContentfulPaintAllFrames": 682.853,
        "observedLargestContentfulPaintAllFramesTs": 23466705983,
        "observedLargestContentfulPaintTs": 23466886143,
        "observedLastVisualChange": 5881,
        "observedLastVisualChangeTs": 23471904130,
        "observedLoad": 672.966,
        "observedLoadTs": 23466696096,
        "observedNavigationStart": 0,
        "observedNavigationStartTs": 23466023130,
        "observedSpeedIndex": 1582.5727300003914,
        "observedSpeedIndexTs": 23467605702.73,
        "observedTimeOrigin": 0,
        "observedTimeOriginTs": 23466023130,
        "observedTraceEnd": 6006.323,
        "observedTraceEndTs": 23472029453,
        "speedIndex": 1583,
        "speedIndexTs": 23467606130,
        "totalBlockingTime": 0,
      }
    `);
    // Includes performance metrics
    expect(result.metrics.firstContentfulPaint).toBeDefined();
    // Includes timestamps from trace of tab
    expect(result.metrics.observedFirstContentfulPaint).toBeDefined();
    // Includs visual metrics from Speedline
    expect(result.metrics.observedFirstVisualChange).toBeDefined();

    expect(result.debugInfo).toEqual({lcpInvalidated: false});
  });
});
