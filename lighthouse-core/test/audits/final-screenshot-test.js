/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */


import FinalScreenshotAudit from '../../audits/final-screenshot.js';
import pwaTrace from '../fixtures/traces/progressive-app-m60.json';
const noScreenshotsTrace = {traceEvents: pwaTrace.traceEvents.filter(e => e.name !== 'Screenshot')};

/* eslint-env jest */

describe('Final screenshot', () => {
  let context;

  beforeEach(() => {
    context = {computedCache: new Map()};
  });

  it('should extract a final screenshot from a trace', async () => {
    const artifacts = Object.assign({
      traces: {defaultPass: pwaTrace},
      GatherContext: {gatherMode: 'timespan'},
    });
    const results = await FinalScreenshotAudit.audit(artifacts, context);

    expect(results.score).toEqual(1);
    expect(results.details.timing).toEqual(818);
    expect(results.details.timestamp).toEqual(225414990064);
    expect(results.details.data).toContain('data:image/jpeg;base64,/9j/4AAQSkZJRgABA');
  });

  it('should returns not applicable for missing screenshots in timespan mode', async () => {
    const artifacts = {
      traces: {defaultPass: noScreenshotsTrace},
      GatherContext: {gatherMode: 'timespan'},
    };

    const results = await FinalScreenshotAudit.audit(artifacts, context);
    expect(results.notApplicable).toEqual(true);
  });

  it('should throws for missing screenshots in navigation mode', async () => {
    const artifacts = {
      traces: {defaultPass: noScreenshotsTrace},
      GatherContext: {gatherMode: 'navigation'},
    };

    await expect(FinalScreenshotAudit.audit(artifacts, context)).rejects.toThrow();
  });
});
