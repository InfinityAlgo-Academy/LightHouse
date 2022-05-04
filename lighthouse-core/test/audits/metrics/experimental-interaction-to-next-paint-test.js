/**
 * @license Copyright 2022 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

import ExperimentalInteractionToNextPaint from
  '../../../audits/metrics/experimental-interaction-to-next-paint.js';
import interactionTrace from '../../fixtures/traces/timespan-responsiveness-m103.trace.json';
import noInteractionTrace from '../../fixtures/traces/jumpy-cls-m90.json';

/* eslint-env jest */

describe('Interaction to Next Paint', () => {
  function getTestData() {
    const artifacts = {
      traces: {
        [ExperimentalInteractionToNextPaint.DEFAULT_PASS]: interactionTrace,
      },
    };

    const context = {
      settings: {throttlingMethod: 'devtools'},
      computedCache: new Map(),
      options: ExperimentalInteractionToNextPaint.defaultOptions,
    };

    return {artifacts, context};
  }

  it('evaluates INP correctly', async () => {
    const {artifacts, context} = getTestData();
    const result = await ExperimentalInteractionToNextPaint.audit(artifacts, context);
    expect(result).toEqual({
      score: 0.63,
      numericValue: 392,
      numericUnit: 'millisecond',
      displayValue: expect.toBeDisplayString('390 ms'),
    });
  });

  it('is not applicable if using simulated throttling', async () => {
    const {artifacts, context} = getTestData();
    context.settings.throttlingMethod = 'simulate';
    const result = await ExperimentalInteractionToNextPaint.audit(artifacts, context);
    expect(result).toMatchObject({
      score: null,
      notApplicable: true,
    });
  });

  it('is not applicable if no interactions occurred in trace', async () => {
    const {artifacts, context} = getTestData();
    artifacts.traces[ExperimentalInteractionToNextPaint.DEFAULT_PASS] = noInteractionTrace;
    const result = await ExperimentalInteractionToNextPaint.audit(artifacts, context);
    expect(result).toMatchObject({
      score: null,
      notApplicable: true,
    });
  });
});
