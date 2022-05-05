/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */


import CumulativeLayoutShift from '../../../audits/metrics/cumulative-layout-shift.js';
import jumpyClsTrace from '../../fixtures/traces/jumpy-cls-m90.json';

/* eslint-env jest */

describe('Cumulative Layout Shift', () => {
  it('evaluates CLS correctly', async () => {
    const artifacts = {
      GatherContext: {gatherMode: 'navigation'},
      traces: {
        [CumulativeLayoutShift.DEFAULT_PASS]: jumpyClsTrace,
      },
    };

    const context = {
      settings: {throttlingMethod: 'simulate'},
      computedCache: new Map(),
      options: CumulativeLayoutShift.defaultOptions,
    };
    const result = await CumulativeLayoutShift.audit(artifacts, context);
    expect(result).toMatchObject({
      score: 0,
      numericValue: expect.toBeApproximately(2.268816, 6),
      numericUnit: 'unitless',
      details: {
        type: 'debugdata',
        items: [{
          cumulativeLayoutShiftMainFrame: expect.toBeApproximately(2.268816, 6),
          totalCumulativeLayoutShift: expect.toBeApproximately(4.809794, 6),
        }],
      },
    });
  });
});
