/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */


/* eslint-env jest */

import NetworkUserAgent from '../../../gather/gatherers/network-user-agent.js';
import devtoolsLog from '../../fixtures/traces/lcp-m78.devtools.log.json';

describe('.getNetworkUserAgent', () => {
  it('should return empty string when no network events available', async () => {
    const result = await NetworkUserAgent.getNetworkUserAgent([]);
    expect(result).toEqual('');
  });

  it('should return the user agent that was used to make requests', async () => {
    // @ts-expect-error
    const result = await NetworkUserAgent.getNetworkUserAgent(devtoolsLog);
    // eslint-disable-next-line max-len
    expect(result).toEqual('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.97 Safari/537.36');
  });
});
