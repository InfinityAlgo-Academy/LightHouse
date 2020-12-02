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
        "cumulativeLayoutShiftAllFrames": 0.5436596106821069,
        "estimatedInputLatency": 16,
        "estimatedInputLatencyTs": undefined,
        "firstCPUIdle": 688.13,
        "firstCPUIdleTs": 46134430620,
        "firstContentfulPaint": 688.13,
        "firstContentfulPaintTs": 46134430620,
        "firstMeaningfulPaint": 688.13,
        "firstMeaningfulPaintTs": 46134430620,
        "interactive": 688.13,
        "interactiveTs": 46134430620,
        "largestContentfulPaint": 688.13,
        "largestContentfulPaintAllFrames": 5948.408,
        "largestContentfulPaintAllFramesTs": 46139690898,
        "largestContentfulPaintTs": 46134430620,
        "maxPotentialFID": 16,
        "observedCumulativeLayoutShift": 0.0011656245471340055,
        "observedCumulativeLayoutShiftAllFrames": 0.5436596106821069,
        "observedDomContentLoaded": 616.917,
        "observedDomContentLoadedTs": 46134359407,
        "observedFirstContentfulPaint": 688.13,
        "observedFirstContentfulPaintTs": 46134430620,
        "observedFirstMeaningfulPaint": 688.13,
        "observedFirstMeaningfulPaintTs": 46134430620,
        "observedFirstPaint": 688.13,
        "observedFirstPaintTs": 46134430620,
        "observedFirstVisualChange": 679,
        "observedFirstVisualChangeTs": 46134421490,
        "observedLargestContentfulPaint": 688.13,
        "observedLargestContentfulPaintAllFrames": 5948.408,
        "observedLargestContentfulPaintAllFramesTs": 46139690898,
        "observedLargestContentfulPaintTs": 46134430620,
        "observedLastVisualChange": 5967,
        "observedLastVisualChangeTs": 46139709490,
        "observedLoad": 706.036,
        "observedLoadTs": 46134448526,
        "observedNavigationStart": 0,
        "observedNavigationStartTs": 46133742490,
        "observedSpeedIndex": 1370.3598600006846,
        "observedSpeedIndexTs": 46135112849.86001,
        "observedTimeOrigin": 0,
        "observedTimeOriginTs": 46133742490,
        "observedTraceEnd": 6019.104,
        "observedTraceEndTs": 46139761594,
        "speedIndex": 1370,
        "speedIndexTs": 46135112490,
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
