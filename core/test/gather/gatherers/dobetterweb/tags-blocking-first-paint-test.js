/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import TagsBlockingFirstPaint from
  '../../../../gather/gatherers/dobetterweb/tags-blocking-first-paint.js';
import {createMockContext} from '../../../gather/mock-driver.js';

let tagsBlockingFirstPaint;
const traceData = {
  networkRecords: [
    {
      url: 'http://google.com/css/style.css',
      mimeType: 'text/css',
      transferSize: 10,
      rendererStartTime: 10_000,
      networkEndTime: 10_000,
      rendererEndTime: 10_000,
      finished: true,
      isLinkPreload: false,
      initiator: {type: 'parser'},
    },
    {
      url: 'http://google.com/wc/select.html',
      mimeType: 'text/html',
      transferSize: 11,
      rendererStartTime: 11_000,
      networkEndTime: 11_000,
      rendererEndTime: 11_000,
      finished: true,
      isLinkPreload: false,
      initiator: {type: 'other'},
    },
    {
      url: 'http://google.com/js/app.json',
      mimeType: 'application/json',
      transferSize: 24,
      rendererStartTime: 24_000,
      networkEndTime: 24_000,
      rendererEndTime: 24_000,
      finished: true,
      isLinkPreload: false,
      initiator: {type: 'script'},
    },
    {
      url: 'http://google.com/js/app.js',
      mimeType: 'text/javascript',
      transferSize: 12,
      rendererStartTime: 12_000,
      networkEndTime: 22_000,
      rendererEndTime: 22_000,
      finished: true,
      isLinkPreload: false,
      initiator: {type: 'parser'},
    },
    {
      url: 'http://google.com/wc/import.html',
      mimeType: 'text/html',
      transferSize: 13,
      rendererStartTime: 13_000,
      networkEndTime: 13_000,
      rendererEndTime: 13_000,
      finished: true,
      isLinkPreload: false,
      initiator: {type: 'script'},
    },
    {
      url: 'http://google.com/css/ignored.css',
      mimeType: 'text/css',
      transferSize: 16,
      rendererStartTime: 16_000,
      networkEndTime: 16_000,
      rendererEndTime: 16_000,
      finished: true,
      isLinkPreload: true,
      initiator: {type: 'script'},
    },
    {
      url: 'http://google.com/js/ignored.js',
      mimeType: 'text/javascript',
      transferSize: 16,
      rendererStartTime: 16_000,
      networkEndTime: 16_000,
      rendererEndTime: 16_000,
      finished: true,
      isLinkPreload: false,
      initiator: {type: 'script'},
    },
    {
      url: 'http://google.com/js/also-ignored.js',
      mimeType: 'text/javascript',
      transferSize: 12,
      rendererStartTime: 12_000,
      networkEndTime: 22_000,
      rendererEndTime: 22_000,
      finished: false,
      isLinkPreload: false,
      initiator: {type: 'parser'},
    },
  ],
};

describe('First paint blocking tags', () => {
  // Reset the Gatherer before each test.
  beforeEach(() => {
    tagsBlockingFirstPaint = new TagsBlockingFirstPaint();
  });

  it('return filtered and indexed requests', () => {
    const actual = TagsBlockingFirstPaint
      ._filteredAndIndexedByUrl(traceData.networkRecords);
    return expect(Object.fromEntries(actual)).toMatchObject({
      'http://google.com/css/style.css': {
        isLinkPreload: false,
        transferSize: 10,
        rendererStartTime: 10_000,
        networkEndTime: 10_000,
      },
      'http://google.com/wc/select.html': {
        isLinkPreload: false,
        transferSize: 11,
        rendererStartTime: 11_000,
        networkEndTime: 11_000,
      },
      'http://google.com/js/app.js': {
        isLinkPreload: false,
        transferSize: 12,
        rendererStartTime: 12_000,
        networkEndTime: 22_000,
      },
      'http://google.com/wc/import.html': {
        isLinkPreload: false,
        transferSize: 13,
        rendererStartTime: 13_000,
        networkEndTime: 13_000,
      },
    });
  });

  it('returns an artifact', async () => {
    const linkDetails = {
      tagName: 'LINK',
      url: 'http://google.com/css/style.css',
      href: 'http://google.com/css/style.css',
      disabled: false,
      media: '',
      rel: 'stylesheet',
      mediaChanges: [],
    };

    const scriptDetails = {
      tagName: 'SCRIPT',
      url: 'http://google.com/js/app.js',
      src: 'http://google.com/js/app.js',
    };

    const mockContext = createMockContext();
    mockContext.driver._executionContext.evaluate
      .mockResolvedValue([linkDetails, linkDetails, scriptDetails]);

    const artifact = await tagsBlockingFirstPaint.afterPass(mockContext, traceData);

    const expected = [
      {
        tag: {tagName: 'LINK', url: linkDetails.url, mediaChanges: []},
        transferSize: 10,
        rendererStartTime: 10_000,
        networkEndTime: 10_000,
      },
      {
        tag: {tagName: 'SCRIPT', url: scriptDetails.url, mediaChanges: undefined},
        transferSize: 12,
        rendererStartTime: 12_000,
        networkEndTime: 22_000,
      },
    ];
    expect(artifact).toEqual(expected);
  });
});
