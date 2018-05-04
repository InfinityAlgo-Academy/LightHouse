/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('../../audits/metrics.js');
const Runner = require('../../runner.js');
const assert = require('assert');

const pwaTrace = require('../fixtures/traces/progressive-app-m60.json');
const pwaDevtoolsLog = require('../fixtures/traces/progressive-app-m60.devtools.log.json');

/* eslint-env mocha */

describe('Performance: metrics', () => {
  it('evaluates valid input correctly', async () => {
    const artifacts = Object.assign({
      traces: {
        [Audit.DEFAULT_PASS]: pwaTrace,
      },
      devtoolsLogs: {
        [Audit.DEFAULT_PASS]: pwaDevtoolsLog,
      },
    }, Runner.instantiateComputedArtifacts());

    const settings = {throttlingMethod: 'simulate'};
    const result = await Audit.audit(artifacts, {settings});

    assert.deepStrictEqual(result.details.items[0], {
      firstContentfulPaint: 2038,
      firstContentfulPaintTs: undefined,
      firstMeaningfulPaint: 2851,
      firstMeaningfulPaintTs: undefined,
      firstCPUIdle: 5308,
      firstCPUIdleTs: undefined,
      interactive: 5308,
      interactiveTs: undefined,
      speedIndex: 2063,
      speedIndexTs: undefined,
      estimatedInputLatency: 104,
      estimatedInputLatencyTs: undefined,

      observedNavigationStart: 0,
      observedNavigationStartTs: 225414172015,
      observedFirstPaint: 499,
      observedFirstPaintTs: 225414670868,
      observedFirstContentfulPaint: 499,
      observedFirstContentfulPaintTs: 225414670885,
      observedFirstMeaningfulPaint: 783,
      observedFirstMeaningfulPaintTs: 225414955343,
      observedTraceEnd: 12540,
      observedTraceEndTs: 225426711887,
      observedLoad: 2199,
      observedLoadTs: 225416370913,
      observedDomContentLoaded: 560,
      observedDomContentLoadedTs: 225414732309,
      observedFirstVisualChange: 520,
      observedFirstVisualChangeTs: 225414692015,
      observedLastVisualChange: 818,
      observedLastVisualChangeTs: 225414990015,
      observedSpeedIndex: 605,
      observedSpeedIndexTs: 225414776724,
    });
  });
});
