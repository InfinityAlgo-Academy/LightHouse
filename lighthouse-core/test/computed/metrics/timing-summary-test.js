/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const TimingSummary = require('../../../computed/metrics/timing-summary.js');

const trace = require('../../fixtures/traces/lcp-all-frames-m89.json');
const devtoolsLog = require('../../fixtures/traces/lcp-all-frames-m89.devtools.log.json');

/* eslint-env jest */
describe('Timing summary', () => {
  it('contains the correct data', async () => {
    const context = {settings: {throttlingMethod: 'devtools'}, computedCache: new Map()};
    const result = await TimingSummary.request({trace, devtoolsLog}, context);

    expect(result.metrics).toMatchInlineSnapshot(`
      Object {
        "cumulativeLayoutShift": 0,
        "estimatedInputLatency": 16,
        "estimatedInputLatencyTs": undefined,
        "firstCPUIdle": 668.17,
        "firstCPUIdleTs": 10238937930,
        "firstContentfulPaint": 668.17,
        "firstContentfulPaintTs": 10238937930,
        "firstMeaningfulPaint": 668.17,
        "firstMeaningfulPaintTs": 10238937930,
        "interactive": 668.17,
        "interactiveTs": 10238937930,
        "largestContentfulPaint": 668.17,
        "largestContentfulPaintAllFrames": 2258.278,
        "largestContentfulPaintAllFramesTs": 10240528038,
        "largestContentfulPaintTs": 10238937930,
        "maxPotentialFID": 16,
        "observedCumulativeLayoutShift": 0,
        "observedDomContentLoaded": 604.897,
        "observedDomContentLoadedTs": 10238874657,
        "observedFirstContentfulPaint": 668.17,
        "observedFirstContentfulPaintTs": 10238937930,
        "observedFirstMeaningfulPaint": 668.17,
        "observedFirstMeaningfulPaintTs": 10238937930,
        "observedFirstPaint": 668.17,
        "observedFirstPaintTs": 10238937930,
        "observedFirstVisualChange": 671,
        "observedFirstVisualChangeTs": 10238940760,
        "observedLargestContentfulPaint": 668.17,
        "observedLargestContentfulPaintAllFrames": 2258.278,
        "observedLargestContentfulPaintAllFramesTs": 10240528038,
        "observedLargestContentfulPaintTs": 10238937930,
        "observedLastVisualChange": 704,
        "observedLastVisualChangeTs": 10238973760,
        "observedLoad": 683.914,
        "observedLoadTs": 10238953674,
        "observedNavigationStart": 0,
        "observedNavigationStartTs": 10238269760,
        "observedSpeedIndex": 687.9203400006518,
        "observedSpeedIndexTs": 10238957680.34,
        "observedTimeOrigin": 0,
        "observedTimeOriginTs": 10238269760,
        "observedTraceEnd": 5994.241,
        "observedTraceEndTs": 10244264001,
        "speedIndex": 688,
        "speedIndexTs": 10238957760,
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
