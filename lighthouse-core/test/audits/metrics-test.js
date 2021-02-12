/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const MetricsAudit = require('../../audits/metrics.js');
const TTIComputed = require('../../computed/metrics/interactive.js');

const pwaTrace = require('../fixtures/traces/progressive-app-m60.json');
const pwaDevtoolsLog = require('../fixtures/traces/progressive-app-m60.devtools.log.json');

const lcpTrace = require('../fixtures/traces/lcp-m78.json');
const lcpDevtoolsLog = require('../fixtures/traces/lcp-m78.devtools.log.json');

const lcpAllFramesTrace = require('../fixtures/traces/frame-metrics-m89.json');
const lcpAllFramesDevtoolsLog = require('../fixtures/traces/frame-metrics-m89.devtools.log.json'); // eslint-disable-line max-len

const clsAllFramesTrace = require('../fixtures/traces/frame-metrics-m90.json');
const clsAllFramesDevtoolsLog = require('../fixtures/traces/frame-metrics-m90.devtools.log.json'); // eslint-disable-line max-len

const artifactsTrace = require('../results/artifacts/defaultPass.trace.json');
const artifactsDevtoolsLog = require('../results/artifacts/defaultPass.devtoolslog.json');

const jumpyClsTrace = require('../fixtures/traces/jumpy-cls-m90.json');
const jumpyClsDevtoolsLog = require('../fixtures/traces/jumpy-cls-m90.devtoolslog.json');

/* eslint-env jest */

describe('Performance: metrics', () => {
  it('evaluates valid input correctly', async () => {
    const artifacts = {
      traces: {
        [MetricsAudit.DEFAULT_PASS]: pwaTrace,
      },
      devtoolsLogs: {
        [MetricsAudit.DEFAULT_PASS]: pwaDevtoolsLog,
      },
    };

    const context = {settings: {throttlingMethod: 'simulate'}, computedCache: new Map()};
    const result = await MetricsAudit.audit(artifacts, context);
    expect(result.details.items[0]).toMatchSnapshot();
  });

  it('evaluates valid input correctly (throttlingMethod=provided)', async () => {
    const artifacts = {
      traces: {
        [MetricsAudit.DEFAULT_PASS]: pwaTrace,
      },
      devtoolsLogs: {
        [MetricsAudit.DEFAULT_PASS]: pwaDevtoolsLog,
      },
    };

    const context = {settings: {throttlingMethod: 'provided'}, computedCache: new Map()};
    const result = await MetricsAudit.audit(artifacts, context);
    expect(result.details.items[0]).toMatchSnapshot();
  });

  it('evaluates valid input (with lcp) correctly', async () => {
    const artifacts = {
      traces: {
        [MetricsAudit.DEFAULT_PASS]: lcpTrace,
      },
      devtoolsLogs: {
        [MetricsAudit.DEFAULT_PASS]: lcpDevtoolsLog,
      },
    };

    const context = {settings: {throttlingMethod: 'simulate'}, computedCache: new Map()};
    const result = await MetricsAudit.audit(artifacts, context);
    expect(result.details.items[0]).toMatchSnapshot();
  });

  it('evaluates valid input (with lcp from all frames) correctly', async () => {
    const artifacts = {
      traces: {
        [MetricsAudit.DEFAULT_PASS]: lcpAllFramesTrace,
      },
      devtoolsLogs: {
        [MetricsAudit.DEFAULT_PASS]: lcpAllFramesDevtoolsLog,
      },
    };

    const context = {settings: {throttlingMethod: 'provided'}, computedCache: new Map()};
    const result = await MetricsAudit.audit(artifacts, context);
    expect(result.details.items[0]).toMatchSnapshot();
  });

  it('evaluates valid input (with CLS) correctly', async () => {
    const artifacts = {
      traces: {
        [MetricsAudit.DEFAULT_PASS]: artifactsTrace,
      },
      devtoolsLogs: {
        [MetricsAudit.DEFAULT_PASS]: artifactsDevtoolsLog,
      },
    };

    const context = {settings: {throttlingMethod: 'simulate'}, computedCache: new Map()};
    const {details} = await MetricsAudit.audit(artifacts, context);
    expect(details.items[0].cumulativeLayoutShift).toMatchInlineSnapshot(`0.42`);
    expect(details.items[0].observedCumulativeLayoutShift).toMatchInlineSnapshot(`0.42`);
  });

  it('evaluates valid input (with CLS from all frames) correctly', async () => {
    const artifacts = {
      traces: {
        [MetricsAudit.DEFAULT_PASS]: clsAllFramesTrace,
      },
      devtoolsLogs: {
        [MetricsAudit.DEFAULT_PASS]: clsAllFramesDevtoolsLog,
      },
    };

    const context = {settings: {throttlingMethod: 'provided'}, computedCache: new Map()};
    const {details} = await MetricsAudit.audit(artifacts, context);
    expect(details.items[0].cumulativeLayoutShift).toBeCloseTo(0.0011);
    expect(details.items[0].observedCumulativeLayoutShift).toBeCloseTo(0.0011);
    expect(details.items[0].cumulativeLayoutShiftAllFrames).toBeCloseTo(0.0276);
    expect(details.items[0].observedCumulativeLayoutShiftAllFrames).toBeCloseTo(0.0276);
  });

  it('does not fail the entire audit when TTI errors', async () => {
    const artifacts = {
      traces: {
        [MetricsAudit.DEFAULT_PASS]: pwaTrace,
      },
      devtoolsLogs: {
        [MetricsAudit.DEFAULT_PASS]: pwaDevtoolsLog,
      },
    };

    const mockTTIFn = jest.spyOn(TTIComputed, 'request');
    mockTTIFn.mockRejectedValueOnce(new Error('TTI failed'));
    const context = {settings: {throttlingMethod: 'simulate'}, computedCache: new Map()};
    const result = await MetricsAudit.audit(artifacts, context);
    expect(result.details.items[0].interactive).toEqual(undefined);
  });

  it('evaluates LayoutShift variants correctly', async () => {
    const artifacts = {
      traces: {
        [MetricsAudit.DEFAULT_PASS]: jumpyClsTrace,
      },
      devtoolsLogs: {
        [MetricsAudit.DEFAULT_PASS]: jumpyClsDevtoolsLog,
      },
    };

    const context = {settings: {throttlingMethod: 'simulate'}, computedCache: new Map()};
    const {details} = await MetricsAudit.audit(artifacts, context);
    expect(details.items[0]).toMatchObject({
      cumulativeLayoutShift: expect.toBeApproximately(4.809794, 6),
      cumulativeLayoutShiftAllFrames: expect.toBeApproximately(4.809794, 6),
      layoutShiftAvgSessionGap5s: expect.toBeApproximately(4.809794, 6),
      layoutShiftMaxSessionGap1s: expect.toBeApproximately(2.897995, 6),
      layoutShiftMaxSessionGap1sLimit5s: expect.toBeApproximately(2.268816, 6),
      layoutShiftMaxSliding1s: expect.toBeApproximately(1.911799, 6),
      layoutShiftMaxSliding300ms: expect.toBeApproximately(1.436742, 6),
    });
  });
});
