/**
 * @license Copyright 2022 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import BFCache from '../../audits/bf-cache.js';

describe('BFCache audit', () => {
  it('fails if there are actionable failure reasons', async () => {
    /** @type {any} */
    const artifacts = {
      BFCacheFailures: [{
        notRestoredReasonsTree: {
          PageSupportNeeded: {
            AppBanner: ['https://example.com', 'https://frame.com'],
          },
          Circumstantial: {
            BackForwardCacheDisabled: ['https://example.com'],
          },
          SupportPending: {
            CacheControlNoStore: ['https://frame.com'],
          },
        },
      }],
    };

    const result = await BFCache.audit(artifacts);

    expect(result.displayValue).toBeDisplayString('3 failure reasons');
    expect(result.score).toEqual(0);

    if (result.details?.type !== 'table') throw new Error('details were not a table');

    const {items} = result.details;

    expect(items).toHaveLength(3);

    expect(items[0].reason).toBeDisplayString(
      'Pages that requested an AppBanner are not currently eligible for back/forward cache.');
    expect(items[0].failureType).toBeDisplayString('Actionable');
    expect(items[0].subItems?.items).toEqual([
      {frameUrl: 'https://example.com'},
      {frameUrl: 'https://frame.com'},
    ]);

    expect(items[1].reason).toBeDisplayString(
      'Pages with cache-control:no-store header cannot enter back/forward cache.');
    expect(items[1].failureType).toBeDisplayString('Pending browser support');
    expect(items[1].subItems?.items).toEqual([
      {frameUrl: 'https://frame.com'},
    ]);

    expect(items[2].reason).toBeDisplayString(
      'Back/forward cache is disabled by flags. Visit chrome://flags/#back-forward-cache to enable it locally on this device.');
    expect(items[2].failureType).toBeDisplayString('Not actionable');
    expect(items[2].subItems?.items).toEqual([
      {frameUrl: 'https://example.com'},
    ]);
  });

  it('fails if there are only non-actionable failures', async () => {
    /** @type {any} */
    const artifacts = {
      BFCacheFailures: [{
        notRestoredReasonsTree: {
          PageSupportNeeded: {},
          Circumstantial: {
            BackForwardCacheDisabled: ['https://example.com'],
          },
          SupportPending: {
            CacheControlNoStore: ['https://frame.com'],
          },
        },
      }],
    };

    const result = await BFCache.audit(artifacts);

    expect(result.displayValue).toBeDisplayString('2 failure reasons');
    expect(result.score).toEqual(0);

    if (result.details?.type !== 'table') throw new Error('details were not a table');
    expect(result.details.items).toHaveLength(2);
  });

  it('passes if there are no failures', async () => {
    /** @type {any} */
    const artifacts = {
      BFCacheFailures: [{
        notRestoredReasonsTree: {
          PageSupportNeeded: {},
          Circumstantial: {},
          SupportPending: {},
        },
      }],
    };

    const result = await BFCache.audit(artifacts);

    expect(result.displayValue).toBeUndefined();
    expect(result.score).toEqual(1);

    if (result.details?.type !== 'table') throw new Error('details were not a table');
    expect(result.details.items).toHaveLength(0);
  });
});
