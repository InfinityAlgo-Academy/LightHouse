/**
 * @license Copyright 2022 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import BFCacheFailures from '../../../gather/gatherers/bf-cache-failures.js';
import {createMockContext} from '../mock-driver.js';

/**
 * @returns {LH.Crdp.Page.BackForwardCacheNotUsedEvent}
 */
function createMockBfCacheEvent() {
  return {
    loaderId: 'LOADERID',
    frameId: 'FRAMEID',
    notRestoredExplanations: [
      {type: 'PageSupportNeeded', reason: 'AppBanner'},
      {type: 'Circumstantial', reason: 'BackForwardCacheDisabled'},
      {type: 'SupportPending', reason: 'CacheControlNoStore'},
    ],
    notRestoredExplanationsTree: {
      url: 'https://example.com',
      explanations: [
        {type: 'PageSupportNeeded', reason: 'AppBanner'},
        {type: 'Circumstantial', reason: 'BackForwardCacheDisabled'},
      ],
      children: [
        {
          url: 'https://frame.com',
          explanations: [
            {type: 'PageSupportNeeded', reason: 'AppBanner'},
            {type: 'SupportPending', reason: 'CacheControlNoStore'},
          ],
          children: [],
        },
      ],
    },
  };
}

describe('BFCacheFailures', () => {
  /** @type {LH.Gatherer.FRTransitionalContext<'DevtoolsLog'>} */
  let context;
  let mockContext = createMockContext();
  /** @type {LH.Crdp.Page.BackForwardCacheNotUsedEvent|undefined} */
  let mockActiveBfCacheEvent;

  beforeEach(() => {
    mockContext = createMockContext();
    // @ts-expect-error contains DT log dependency
    context = mockContext.asContext();

    mockActiveBfCacheEvent = createMockBfCacheEvent();

    context.dependencies.DevtoolsLog = [];

    mockContext.driver.defaultSession.sendCommand
      .mockResponse('Page.getNavigationHistory', {
        currentIndex: 1,
        entries: [
          {id: 0},
          {id: 1},
        ],
      })
      .mockResponse('Page.navigate', undefined)
      .mockResponse('Page.navigateToHistoryEntry', () => {
        if (mockActiveBfCacheEvent) {
          const listener =
            mockContext.driver.defaultSession.on.findListener('Page.backForwardCacheNotUsed');
          listener(mockActiveBfCacheEvent);
        }
      });

    mockContext.driver.defaultSession.once
      .mockEvent('Page.loadEventFired', {})
      .mockEvent('Page.frameNavigated', {});
  });

  it('actively triggers bf cache in navigation mode', async () => {
    const gatherer = new BFCacheFailures();
    const artifact = await gatherer.getArtifact(context);

    expect(mockContext.driver.defaultSession.sendCommand)
      .toHaveBeenCalledWith('Page.navigate', {url: 'about:blank'});
    expect(mockContext.driver.defaultSession.sendCommand)
      .toHaveBeenCalledWith('Page.navigateToHistoryEntry', {entryId: 1});

    expect(artifact).toHaveLength(1);
    expect(artifact[0].notRestoredReasonsTree).toEqual({
      PageSupportNeeded: {
        AppBanner: ['https://example.com', 'https://frame.com'],
      },
      Circumstantial: {
        BackForwardCacheDisabled: ['https://example.com'],
      },
      SupportPending: {
        CacheControlNoStore: ['https://frame.com'],
      },
    });
  });

  it('actively triggers bf cache in legacy navigation mode', async () => {
    const gatherer = new BFCacheFailures();
    const artifact = await gatherer.afterPass(mockContext.asLegacyContext(), {
      devtoolsLog: context.dependencies.DevtoolsLog,
      networkRecords: [],
    });

    expect(mockContext.driver.defaultSession.sendCommand)
      .toHaveBeenCalledWith('Page.navigate', {url: 'about:blank'});
    expect(mockContext.driver.defaultSession.sendCommand)
      .toHaveBeenCalledWith('Page.navigateToHistoryEntry', {entryId: 1});

    expect(artifact).toHaveLength(1);
    expect(artifact[0].notRestoredReasonsTree).toEqual({
      PageSupportNeeded: {
        AppBanner: ['https://example.com', 'https://frame.com'],
      },
      Circumstantial: {
        BackForwardCacheDisabled: ['https://example.com'],
      },
      SupportPending: {
        CacheControlNoStore: ['https://frame.com'],
      },
    });
  });

  it('passively collects bf cache event in timespan mode', async () => {
    context.gatherMode = 'timespan';
    context.dependencies.DevtoolsLog = [{
      method: 'Page.backForwardCacheNotUsed',
      params: createMockBfCacheEvent(),
    }];

    const gatherer = new BFCacheFailures();
    const artifact = await gatherer.getArtifact(context);

    expect(mockContext.driver.defaultSession.sendCommand)
      .not.toHaveBeenCalledWith('Page.navigate', {url: 'about:blank'});
    expect(mockContext.driver.defaultSession.sendCommand)
      .not.toHaveBeenCalledWith('Page.navigateToHistoryEntry', {entryId: 1});

    expect(artifact).toHaveLength(1);
    expect(artifact[0].notRestoredReasonsTree).toEqual({
      PageSupportNeeded: {
        AppBanner: ['https://example.com', 'https://frame.com'],
      },
      Circumstantial: {
        BackForwardCacheDisabled: ['https://example.com'],
      },
      SupportPending: {
        CacheControlNoStore: ['https://frame.com'],
      },
    });
  });

  it('constructs a tree with no frame urls if no frame tree is provided', async () => {
    delete mockActiveBfCacheEvent?.notRestoredExplanationsTree;

    const gatherer = new BFCacheFailures();
    const artifact = await gatherer.getArtifact(context);

    expect(mockContext.driver.defaultSession.sendCommand)
      .toHaveBeenCalledWith('Page.navigate', {url: 'about:blank'});
    expect(mockContext.driver.defaultSession.sendCommand)
      .toHaveBeenCalledWith('Page.navigateToHistoryEntry', {entryId: 1});

    expect(artifact).toHaveLength(1);
    expect(artifact[0].notRestoredReasonsTree).toEqual({
      PageSupportNeeded: {
        AppBanner: [],
      },
      Circumstantial: {
        BackForwardCacheDisabled: [],
      },
      SupportPending: {
        CacheControlNoStore: [],
      },
    });
  });

  it('returns an empty list if no events were found passively or actively', async () => {
    mockActiveBfCacheEvent = undefined;

    const gatherer = new BFCacheFailures();
    const artifact = await gatherer.getArtifact(context);

    expect(mockContext.driver.defaultSession.sendCommand)
      .toHaveBeenCalledWith('Page.navigate', {url: 'about:blank'});
    expect(mockContext.driver.defaultSession.sendCommand)
      .toHaveBeenCalledWith('Page.navigateToHistoryEntry', {entryId: 1});

    expect(artifact).toHaveLength(0);
  });
});
