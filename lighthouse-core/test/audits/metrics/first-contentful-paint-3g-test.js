/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */


import FCP3G from '../../../audits/metrics/first-contentful-paint-3g.js';
import pwaTrace from '../../fixtures/traces/progressive-app-m60.json';
import pwaDevtoolsLog from '../../fixtures/traces/progressive-app-m60.devtools.log.json';
import {getURLArtifactFromDevtoolsLog} from '../../test-utils.js';

const options = FCP3G.defaultOptions;

/* eslint-env jest */

describe('Performance: first-contentful-paint-3g audit', () => {
  it('evaluates valid input correctly', async () => {
    const artifacts = {
      GatherContext: {gatherMode: 'navigation'},
      traces: {
        [FCP3G.DEFAULT_PASS]: pwaTrace,
      },
      devtoolsLogs: {
        [FCP3G.DEFAULT_PASS]: pwaDevtoolsLog,
      },
      URL: getURLArtifactFromDevtoolsLog(pwaDevtoolsLog),
    };

    const result = await FCP3G.audit(artifacts, {settings: {}, options, computedCache: new Map()});
    // Use InlineSnapshot here so changes to Lantern coefficients can be easily updated en masse
    expect({score: result.score, value: Math.round(result.numericValue)}).toMatchInlineSnapshot(`
Object {
  "score": 0.97,
  "value": 2087,
}
`);
  });
});
