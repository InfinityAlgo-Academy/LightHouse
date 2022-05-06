/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */


import TBTAudit from '../../../audits/metrics/total-blocking-time.js';
import constants from '../../../config/constants.js';
import trace from '../../fixtures/traces/progressive-app-m60.json';
import devtoolsLog from '../../fixtures/traces/progressive-app-m60.devtools.log.json';
import lcpTrace from '../../fixtures/traces/lcp-m78.json';
import lcpDevtoolsLog from '../../fixtures/traces/lcp-m78.devtools.log.json';
import {getURLArtifactFromDevtoolsLog} from '../../test-utils.js';

const defaultOptions = TBTAudit.defaultOptions;

function generateArtifacts({gatherMode = 'navigation', trace, devtoolsLog}) {
  return {
    GatherContext: {gatherMode},
    traces: {[TBTAudit.DEFAULT_PASS]: trace},
    devtoolsLogs: {[TBTAudit.DEFAULT_PASS]: devtoolsLog},
    URL: getURLArtifactFromDevtoolsLog(devtoolsLog),
  };
}

/**
 * @param {{
 * {LH.SharedFlagsSettings['formFactor']} formFactor
 * {LH.SharedFlagsSettings['throttlingMethod']} throttlingMethod
 * }} param0
 */
const getFakeContext = ({formFactor, throttlingMethod}) => ({
  options: defaultOptions,
  computedCache: new Map(),
  settings: {
    formFactor: formFactor,
    throttlingMethod,
    screenEmulation: constants.screenEmulationMetrics[formFactor],
  },
});

/* eslint-env jest */

describe('Performance: total-blocking-time audit', () => {
  it('evaluates Total Blocking Time metric properly', async () => {
    const artifacts = generateArtifacts({trace, devtoolsLog});
    const context = getFakeContext({formFactor: 'mobile', throttlingMethod: 'provided'});

    const output = await TBTAudit.audit(artifacts, context);
    expect(output.numericValue).toBeCloseTo(48.3, 1);
    expect(output.score).toBe(1);
    expect(output.displayValue).toBeDisplayString('50\xa0ms');
  });

  it('adjusts scoring based on form factor', async () => {
    const artifactsMobile = generateArtifacts({trace: lcpTrace,
      devtoolsLog: lcpDevtoolsLog});
    const contextMobile = getFakeContext({formFactor: 'mobile', throttlingMethod: 'provided'});

    const outputMobile = await TBTAudit.audit(artifactsMobile, contextMobile);
    expect(outputMobile.numericValue).toBeCloseTo(333, 1);
    expect(outputMobile.score).toBe(0.75);
    expect(outputMobile.displayValue).toBeDisplayString('330\xa0ms');

    const artifactsDesktop = generateArtifacts({trace: lcpTrace,
      devtoolsLog: lcpDevtoolsLog});
    const contextDesktop = getFakeContext({formFactor: 'desktop', throttlingMethod: 'provided'});

    const outputDesktop = await TBTAudit.audit(artifactsDesktop, contextDesktop);
    expect(outputDesktop.numericValue).toBeCloseTo(333, 1);
    expect(outputDesktop.score).toBe(0.53);
    expect(outputDesktop.displayValue).toBeDisplayString('330\xa0ms');
  });

  it('marks metric not applicable (throttlingMethod=simulate, gatherMode=timespan)', async () => {
    const artifacts = generateArtifacts({gatherMode: 'timespan', trace, devtoolsLog});
    const context = getFakeContext({formFactor: 'mobile', throttlingMethod: 'simulate'});

    const output = await TBTAudit.audit(artifacts, context);
    expect(output.notApplicable).toBe(true);
  });
});
