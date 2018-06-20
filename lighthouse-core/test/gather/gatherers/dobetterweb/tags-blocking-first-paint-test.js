/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env mocha */

const TagsBlockingFirstPaint =
    require('../../../../gather/gatherers/dobetterweb/tags-blocking-first-paint');
const assert = require('assert');
let tagsBlockingFirstPaint;
const traceData = {
  networkRecords: [
    {
      _url: 'http://google.com/css/style.css',
      _mimeType: 'text/css',
      transferSize: 10,
      startTime: 10,
      endTime: 10,
      finished: true,
      _isLinkPreload: false,
      _initiator: {type: 'parser'},
    },
    {
      _url: 'http://google.com/wc/select.html',
      _mimeType: 'text/html',
      transferSize: 11,
      startTime: 11,
      endTime: 11,
      finished: true,
      _isLinkPreload: false,
      _initiator: {type: 'other'},
    },
    {
      _url: 'http://google.com/js/app.json',
      _mimeType: 'application/json',
      transferSize: 24,
      startTime: 24,
      endTime: 24,
      finished: true,
      _isLinkPreload: false,
      _initiator: {type: 'script'},
    },
    {
      _url: 'http://google.com/js/app.js',
      _mimeType: 'text/javascript',
      transferSize: 12,
      startTime: 12,
      endTime: 22,
      finished: true,
      _isLinkPreload: false,
      _initiator: {type: 'parser'},
    },
    {
      _url: 'http://google.com/wc/import.html',
      _mimeType: 'text/html',
      transferSize: 13,
      startTime: 13,
      endTime: 13,
      finished: true,
      _isLinkPreload: false,
      _initiator: {type: 'script'},
    },
    {
      _url: 'http://google.com/css/ignored.css',
      _mimeType: 'text/css',
      transferSize: 16,
      startTime: 16,
      endTime: 16,
      finished: true,
      _isLinkPreload: true,
      _initiator: {type: 'script'},
    },
    {
      _url: 'http://google.com/js/ignored.js',
      _mimeType: 'text/javascript',
      transferSize: 16,
      startTime: 16,
      endTime: 16,
      finished: true,
      _isLinkPreload: false,
      _initiator: {type: 'script'},
    },
    {
      _url: 'http://google.com/js/also-ignored.js',
      _mimeType: 'text/javascript',
      transferSize: 12,
      startTime: 12,
      endTime: 22,
      finished: false,
      _isLinkPreload: false,
      _initiator: {type: 'parser'},
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
    return assert.deepEqual(actual, {
      'http://google.com/css/style.css': {
        isLinkPreload: false,
        transferSize: 10,
        startTime: 10,
        endTime: 10,
      },
      'http://google.com/wc/select.html': {
        isLinkPreload: false,
        transferSize: 11,
        startTime: 11,
        endTime: 11,
      },
      'http://google.com/js/app.js': {
        isLinkPreload: false,
        transferSize: 12,
        startTime: 12,
        endTime: 22,
      },
      'http://google.com/wc/import.html': {
        isLinkPreload: false,
        transferSize: 13,
        startTime: 13,
        endTime: 13,
      },
    });
  });

  it('returns an artifact', () => {
    const linkDetails = {
      tagName: 'LINK',
      url: 'http://google.com/css/style.css',
      href: 'http://google.com/css/style.css',
      disabled: false,
      media: '',
      rel: 'stylesheet',
    };

    const scriptDetails = {
      tagName: 'SCRIPT',
      url: 'http://google.com/js/app.js',
      src: 'http://google.com/js/app.js',
    };

    return tagsBlockingFirstPaint.afterPass({
      driver: {
        evaluateAsync() {
          return Promise.resolve([linkDetails, linkDetails, scriptDetails]);
        },
      },
    }, traceData).then(artifact => {
      const expected = [
        {
          tag: linkDetails,
          transferSize: 10,
          startTime: 10,
          endTime: 10,
        },
        {
          tag: scriptDetails,
          transferSize: 12,
          startTime: 12,
          endTime: 22,
        },
      ];
      assert.deepEqual(artifact, expected);
    });
  });
});
