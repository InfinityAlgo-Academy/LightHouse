/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */


import LCPAudit from '../../../audits/metrics/largest-contentful-paint.js';
const defaultOptions = LCPAudit.defaultOptions;
import constants from '../../../config/constants.js';
import trace from '../../fixtures/traces/lcp-m78.json';
import devtoolsLog from '../../fixtures/traces/lcp-m78.devtools.log.json';
import preLcpTrace from '../../fixtures/traces/progressive-app-m60.json';
import preLcpDevtoolsLog from '../../fixtures/traces/progressive-app-m60.devtools.log.json';

function generateArtifacts({trace, devtoolsLog, HostUserAgent}) {
  return {
    GatherContext: {gatherMode: 'navigation'},
    traces: {[LCPAudit.DEFAULT_PASS]: trace},
    devtoolsLogs: {[LCPAudit.DEFAULT_PASS]: devtoolsLog},
    HostUserAgent,
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

describe('Performance: largest-contentful-paint audit', () => {
  it('adjusts scoring based on form factor', async () => {
    const artifactsMobile = generateArtifacts({
      trace,
      devtoolsLog,
    });
    const contextMobile = getFakeContext({formFactor: 'mobile', throttlingMethod: 'provided'});

    const outputMobile = await LCPAudit.audit(artifactsMobile, contextMobile);
    expect(outputMobile.numericValue).toBeCloseTo(1121.711, 1);
    expect(outputMobile.score).toBe(1);
    expect(outputMobile.displayValue).toBeDisplayString('1.1\xa0s');

    const artifactsDesktop = generateArtifacts({
      trace,
      devtoolsLog,
    });
    const contextDesktop = getFakeContext({formFactor: 'desktop', throttlingMethod: 'provided'});

    const outputDesktop = await LCPAudit.audit(artifactsDesktop, contextDesktop);
    expect(outputDesktop.numericValue).toBeCloseTo(1121.711, 1);
    expect(outputDesktop.score).toBe(0.92);
    expect(outputDesktop.displayValue).toBeDisplayString('1.1\xa0s');
  });

  it('throws error when old Chrome does not support LCP', async () => {
    const artifactsOldChrome = generateArtifacts({
      trace: preLcpTrace,
      devtoolsLog: preLcpDevtoolsLog,
      HostUserAgent: 'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5 Build/MRA58N) ' +
        'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.78 ' +
        'Mobile Safari/537.36 Chrome-Lighthouse',
    });
    const contextOldChrome = getFakeContext({formFactor: 'mobile', throttlingMethod: 'provided'});

    await expect(LCPAudit.audit(artifactsOldChrome, contextOldChrome))
      .rejects.toThrow(/UNSUPPORTED_OLD_CHROME/);

    const artifactsNewChrome = generateArtifacts({
      trace: preLcpTrace,
      devtoolsLog: preLcpDevtoolsLog,
      HostUserAgent: 'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5 Build/MRA58N) ' +
        'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 ' +
        'Mobile Safari/537.36 Chrome-Lighthouse',
    });
    const contextNewChrome = getFakeContext({formFactor: 'mobile', throttlingMethod: 'provided'});

    await expect(LCPAudit.audit(artifactsNewChrome, contextNewChrome)).rejects.toThrow(/NO_LCP/);
  });
});
