/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const assert = require('assert');
const Util = require('../../../../report/v2/renderer/util.js');
const NBSP = '\xa0';

/* eslint-env mocha */

describe('util helpers', () => {
  it('formats a number', () => {
    assert.strictEqual(Util.formatNumber(10), '10');
    assert.strictEqual(Util.formatNumber(100.01), '100');
    assert.strictEqual(Util.formatNumber(13000.456), '13,000.5');
  });

  it('formats a date', () => {
    const timestamp = Util.formatDateTime('2017-04-28T23:07:51.189Z');
    assert.ok(
      timestamp.includes('Apr 27, 2017') ||
      timestamp.includes('Apr 28, 2017') ||
      timestamp.includes('Apr 29, 2017')
    );
  });

  it('formats bytes', () => {
    assert.equal(Util.formatBytesToKB(100), `0.1${NBSP}KB`);
    assert.equal(Util.formatBytesToKB(2000), `2${NBSP}KB`);
    assert.equal(Util.formatBytesToKB(1014 * 1024), `1,014${NBSP}KB`);
  });

  it('formats ms', () => {
    assert.equal(Util.formatMilliseconds(123), `120${NBSP}ms`);
    assert.equal(Util.formatMilliseconds(2456.5, 0.1), `2,456.5${NBSP}ms`);
  });

  it('formats a duration', () => {
    assert.equal(Util.formatDuration(60 * 1000), `1${NBSP}m`);
    assert.equal(Util.formatDuration(60 * 60 * 1000 + 5000), `1${NBSP}h 5${NBSP}s`);
    assert.equal(Util.formatDuration(28 * 60 * 60 * 1000 + 5000), `1${NBSP}d 4${NBSP}h 5${NBSP}s`);
  });

  it('calculates a score ratings', () => {
    assert.equal(Util.calculateRating(0.0), 'fail');
    assert.equal(Util.calculateRating(0.10), 'fail');
    assert.equal(Util.calculateRating(0.45), 'average');
    assert.equal(Util.calculateRating(0.55), 'average');
    assert.equal(Util.calculateRating(0.75), 'pass');
    assert.equal(Util.calculateRating(0.80), 'pass');
    assert.equal(Util.calculateRating(1.00), 'pass');
  });
});
