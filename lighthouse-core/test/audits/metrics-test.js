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
      metricName: 'firstContentfulPaint',
      timing: 2038,
      timestamp: undefined,
    });

    const metrics = {};
    result.details.items.forEach(item => metrics[item.metricName] = Math.round(item.timing));

    assert.deepStrictEqual(metrics, {
      firstContentfulPaint: 2038,
      firstMeaningfulPaint: 2851,
      firstCPUIdle: 5308,
      timeToInteractive: 5308,
      speedIndex: 2063,
      estimatedInputLatency: 104,

      observedNavigationStart: 0,
      observedFirstPaint: 499,
      observedFirstContentfulPaint: 499,
      observedFirstMeaningfulPaint: 783,
      observedTraceEnd: 12540,
      observedLoad: 2199,
      observedDomContentLoaded: 560,
      observedFirstVisualChange: 520,
      observedLastVisualChange: 818,
      observedSpeedIndex: 605,
    });
  });
});
