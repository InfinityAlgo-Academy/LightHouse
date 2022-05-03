/**
 * @license Copyright 2022 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const InjectedIframesAudit = require('../../audits/injected-iframes.js');
const injectedIframesTrace = require('../fixtures/traces/injected-iframes-m102.trace.json');
const injectedIframesArtifacts = require('../fixtures/traces/injected-iframes-m102.artifacts.json');

/* eslint-env jest */

describe('injected-iframes', () => {
  let context;

  beforeEach(() => {
    context = {computedCache: new Map()};
  });

  it('should find injected iframes causing layout shifts in trace', async () => {
    const artifacts = Object.assign({
      traces: {defaultPass: injectedIframesTrace},
      GatherContext: {gatherMode: 'timespan'},
      ...injectedIframesArtifacts,
    });
    const results = await InjectedIframesAudit.audit(artifacts, context);

    // TODO
    expect(results.score).toEqual(0);
  });
});
