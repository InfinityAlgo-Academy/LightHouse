/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env mocha */

const ImageUsage = require('../../../gather/gatherers/image-usage');
const assert = require('assert');

function generateNetworkRecord(data) {
  return Object.assign({
    mimeType: 'image/jpeg',
    _mimeType: 'image/jpeg',
    finished: true,
    resourceSize: 100,
    startTime: 0,
    endTime: 200,
    responseReceivedTime: 100,
  }, data);
}

function omit(obj, omitKeys) {
  const outObj = {};
  Object.keys(obj).forEach(key => {
    if (omitKeys.includes(key)) return;
    outObj[key] = obj[key];
  });

  return outObj;
}


describe('ImageUsage', () => {
  let gatherer;
  let driver;
  let trace;
  let networkRecords;
  let mockEvaluateAsync;

  beforeEach(() => {
    gatherer = new ImageUsage();
    mockEvaluateAsync = () => Promise.resolve();
    driver = {evaluateAsync: (...args) => mockEvaluateAsync(...args)};
    trace = {traceEvents: []};
    networkRecords = [];
  });

  it('should find image information in trace', () => {
    trace.traceEvents = [
      {
        name: 'PaintImage',
        args: {
          data: {
            url: 'file://image.jpg',
            x: 0, y: 0,
            width: 202, height: 101,
            srcWidth: 600, srcHeight: 300,
          }
        }
      },
      {
        name: 'PaintImage',
        args: {
          data: {
            url: 'file://image-2.jpg',
            x: 200, y: 0,
            width: 202, height: 101,
            srcWidth: 600, srcHeight: 300,
          }
        }
      },
    ];

    const usedRecord = generateNetworkRecord({url: 'file://image-2.jpg'});
    const unusedRecord = generateNetworkRecord({url: 'file://missing.jpg'});
    networkRecords = [
      usedRecord,
      unusedRecord,
      generateNetworkRecord({url: 'file://image.jpg', finished: false}),
      generateNetworkRecord({url: 'file://data.json', _mimeType: 'application/json'}),
    ];

    return gatherer.afterPass({driver}, {trace, networkRecords})
      .then(results => {
        assert.deepEqual(results, [
          {
            src: 'file://image.jpg',
            clientRect: {top: 0, left: 0, bottom: 101, right: 202},
            clientWidth: 202, clientHeight: 101,
            naturalWidth: 600, naturalHeight: 300,
            isLikelySprite: false,
            networkRecord: undefined,
          },
          {
            src: 'file://image-2.jpg',
            clientRect: {top: 0, left: 200, bottom: 101, right: 402},
            clientWidth: 202, clientHeight: 101,
            naturalWidth: 600, naturalHeight: 300,
            isLikelySprite: false,
            networkRecord: omit(usedRecord, ['_mimeType', 'finished']),
          },
          {
            src: 'file://missing.jpg',
            networkRecord: omit(unusedRecord, ['_mimeType', 'finished']),
          },
        ]);
      });
  });
});
