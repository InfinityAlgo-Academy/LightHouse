/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */


import {jest} from '@jest/globals';

import MetricsAudit from '../../audits/metrics.js';
import TTIComputed from '../../computed/metrics/interactive.js';
import pwaTrace from '../fixtures/traces/progressive-app-m60.json';
import pwaDevtoolsLog from '../fixtures/traces/progressive-app-m60.devtools.log.json';
import lcpTrace from '../fixtures/traces/lcp-m78.json';
import lcpDevtoolsLog from '../fixtures/traces/lcp-m78.devtools.log.json';
import lcpAllFramesTrace from '../fixtures/traces/frame-metrics-m89.json';
import lcpAllFramesDevtoolsLog from '../fixtures/traces/frame-metrics-m89.devtools.log.json'; // eslint-disable-line max-len
import clsAllFramesTrace from '../fixtures/traces/frame-metrics-m90.json';
import clsAllFramesDevtoolsLog from '../fixtures/traces/frame-metrics-m90.devtools.log.json'; // eslint-disable-line max-len
import jumpyClsTrace from '../fixtures/traces/jumpy-cls-m90.json';
import jumpyClsDevtoolsLog from '../fixtures/traces/jumpy-cls-m90.devtoolslog.json';
import {getURLArtifactFromDevtoolsLog} from '../test-utils.js';

/* eslint-env jest */

describe('Performance: metrics', () => {
  it('evaluates valid input correctly', async () => {
    const URL = getURLArtifactFromDevtoolsLog(pwaDevtoolsLog);
    const artifacts = {
      URL,
      GatherContext: {gatherMode: 'navigation'},
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
    const URL = getURLArtifactFromDevtoolsLog(pwaDevtoolsLog);
    const artifacts = {
      URL,
      GatherContext: {gatherMode: 'navigation'},
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
    const URL = getURLArtifactFromDevtoolsLog(lcpDevtoolsLog);
    const artifacts = {
      URL,
      GatherContext: {gatherMode: 'navigation'},
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
    const URL = getURLArtifactFromDevtoolsLog(lcpAllFramesDevtoolsLog);
    const artifacts = {
      URL,
      GatherContext: {gatherMode: 'navigation'},
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

  it('leaves CLS undefined in an old trace without weighted scores', async () => {
    const artifacts = {
      GatherContext: {gatherMode: 'navigation'},
      traces: {
        [MetricsAudit.DEFAULT_PASS]: lcpAllFramesTrace,
      },
      devtoolsLogs: {
        [MetricsAudit.DEFAULT_PASS]: lcpAllFramesDevtoolsLog,
      },
    };

    const context = {settings: {throttlingMethod: 'simulate'}, computedCache: new Map()};
    const {details} = await MetricsAudit.audit(artifacts, context);
    expect(details.items[0]).toMatchObject({
      cumulativeLayoutShift: undefined,
      cumulativeLayoutShiftMainFrame: undefined,
      totalCumulativeLayoutShift: undefined,
      observedCumulativeLayoutShift: undefined,
      observedCumulativeLayoutShiftMainFrame: undefined,
      observedTotalCumulativeLayoutShift: undefined,
    });
  });

  it('evaluates new CLS correctly across all frames', async () => {
    const URL = getURLArtifactFromDevtoolsLog(clsAllFramesDevtoolsLog);
    const artifacts = {
      URL,
      GatherContext: {gatherMode: 'navigation'},
      traces: {
        [MetricsAudit.DEFAULT_PASS]: clsAllFramesTrace,
      },
      devtoolsLogs: {
        [MetricsAudit.DEFAULT_PASS]: clsAllFramesDevtoolsLog,
      },
    };

    const context = {settings: {throttlingMethod: 'provided'}, computedCache: new Map()};
    const {details} = await MetricsAudit.audit(artifacts, context);

    // Only a single main-frame shift event, so mfCls and oldCls are equal.
    expect(details.items[0]).toMatchObject({
      cumulativeLayoutShift: expect.toBeApproximately(0.026463, 6),
      cumulativeLayoutShiftMainFrame: expect.toBeApproximately(0.001166, 6),
      totalCumulativeLayoutShift: expect.toBeApproximately(0.001166, 6),

      observedCumulativeLayoutShift: expect.toBeApproximately(0.026463, 6),
      observedCumulativeLayoutShiftMainFrame: expect.toBeApproximately(0.001166, 6),
      observedTotalCumulativeLayoutShift: expect.toBeApproximately(0.001166, 6),
    });
  });

  it('does not fail the entire audit when TTI errors', async () => {
    const URL = getURLArtifactFromDevtoolsLog(pwaDevtoolsLog);
    const artifacts = {
      URL,
      GatherContext: {gatherMode: 'navigation'},
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

  it('evaluates CLS correctly', async () => {
    const URL = getURLArtifactFromDevtoolsLog(jumpyClsDevtoolsLog);
    const artifacts = {
      URL,
      GatherContext: {gatherMode: 'navigation'},
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
      cumulativeLayoutShift: expect.toBeApproximately(2.268816, 6),
      cumulativeLayoutShiftMainFrame: expect.toBeApproximately(2.268816, 6),
      totalCumulativeLayoutShift: expect.toBeApproximately(4.809794, 6),

      observedCumulativeLayoutShift: expect.toBeApproximately(2.268816, 6),
      observedCumulativeLayoutShiftMainFrame: expect.toBeApproximately(2.268816, 6),
      observedTotalCumulativeLayoutShift: expect.toBeApproximately(4.809794, 6),
    });
  });
});
