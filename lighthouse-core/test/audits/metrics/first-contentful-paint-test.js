/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import {strict as assert} from 'assert';

import FcpAudit from '../../../audits/metrics/first-contentful-paint.js';
const options = FcpAudit.defaultOptions;
import constants from '../../../config/constants.js';
import pwaTrace from '../../fixtures/traces/progressive-app-m60.json';
import pwaDevtoolsLog from '../../fixtures/traces/progressive-app-m60.devtools.log.json';
import frameTrace from '../../fixtures/traces/frame-metrics-m90.json';
import frameDevtoolsLog from '../../fixtures/traces/frame-metrics-m90.devtools.log.json';

/**
 * @param {{
 * {LH.SharedFlagsSettings['formFactor']} formFactor
 * {LH.SharedFlagsSettings['throttlingMethod']} throttlingMethod
 * }} param0
 */
const getFakeContext = ({formFactor, throttlingMethod}) => ({
  options: options,
  computedCache: new Map(),
  settings: {
    formFactor: formFactor,
    throttlingMethod,
    screenEmulation: constants.screenEmulationMetrics[formFactor],
  },
});


/* eslint-env jest */

describe('Performance: first-contentful-paint audit', () => {
  it('evaluates valid input correctly', async () => {
    const artifacts = {
      GatherContext: {gatherMode: 'navigation'},
      traces: {
        [FcpAudit.DEFAULT_PASS]: pwaTrace,
      },
      devtoolsLogs: {
        [FcpAudit.DEFAULT_PASS]: pwaDevtoolsLog,
      },
    };

    const context = getFakeContext({formFactor: 'mobile', throttlingMethod: 'provided'});
    const result = await FcpAudit.audit(artifacts, context);
    assert.equal(result.score, 1);
    assert.equal(result.numericValue, 498.87);
  });

  it('evaluates a modern trace correctly', async () => {
    const artifacts = {
      GatherContext: {gatherMode: 'navigation'},
      traces: {
        [FcpAudit.DEFAULT_PASS]: frameTrace,
      },
      devtoolsLogs: {
        [FcpAudit.DEFAULT_PASS]: frameDevtoolsLog,
      },
    };

    const context = getFakeContext({formFactor: 'mobile', throttlingMethod: 'provided'});
    const result = await FcpAudit.audit(artifacts, context);
    assert.equal(result.score, 0.05);
    assert.equal(result.numericValue, 5668.275);
  });
});
