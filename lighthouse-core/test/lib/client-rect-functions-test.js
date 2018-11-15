/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

const {simplifyClientRects} = require('../../lib/client-rect-functions');
const assert = require('assert');

describe('simplifyClientRects', () => {
  it('Merges rects if a smaller rect is inside a larger one', () => {
    const res = simplifyClientRects([
      {
        left: 10,
        right: 110,
        width: 100,
        height: 10,
        top: 10,
        bottom: 20,
      },
      {
        left: 10,
        right: 60,
        width: 50,
        height: 10,
        top: 10,
        bottom: 20,
      },
    ]);
    assert.deepEqual(res, [
      {
        left: 10,
        right: 110,
        width: 100,
        height: 10,
        top: 10,
        bottom: 20,
      },
    ]);
  });
  it('Merges two horizontally adjacent client rects', () => {
    const res = simplifyClientRects([
      {
        left: 10,
        right: 110,
        width: 100,
        height: 10,
        top: 10,
        bottom: 20,
      },
      {
        left: 110,
        right: 210,
        width: 100,
        height: 10,
        top: 10,
        bottom: 20,
      },
    ]);
    assert.deepEqual(res, [
      {
        left: 10,
        right: 210,
        width: 200,
        height: 10,
        top: 10,
        bottom: 20,
      },
    ]);
  });

  it('Merges three horizontally adjacent client rects', () => {
    const res = simplifyClientRects([
      {
        left: 10,
        right: 110,
        width: 100,
        height: 10,
        top: 10,
        bottom: 20,
      },
      {
        left: 110,
        right: 210,
        width: 100,
        height: 10,
        top: 10,
        bottom: 20,
      },
      {
        left: 210,
        right: 310,
        width: 100,
        height: 10,
        top: 10,
        bottom: 20,
      },
    ]);
    assert.deepEqual(res, [
      {
        left: 10,
        right: 310,
        width: 300,
        height: 10,
        top: 10,
        bottom: 20,
      },
    ]);
  });

  it('Merges two vertically adjacent client rects even if one is wider than the other', () => {
    // todo: rephrase
    // We do this because to fix issues with images inside links.
    // If we don't merge we'll put a finger on the image and link separately, with the link
    // being small and on one side and overlapping with something.
    const res = simplifyClientRects([
      {
        left: 10,
        right: 110,
        width: 100,
        height: 10,
        top: 10,
        bottom: 20,
      },
      {
        left: 10,
        right: 210,
        width: 200,
        height: 10,
        top: 15,
        bottom: 30,
      },
    ]);
    assert.deepEqual(res, [
      {
        left: 10,
        right: 210,
        width: 200,
        height: 20,
        top: 10,
        bottom: 30,
      },
    ]);
  });

  // todO: rename this one!!!!
  it('Merges two horizontally adjacent client recttha tare only adjcentishs', () => {
    // 2px diff is ok, often there are cases where an image is a px or two out of the main link bcr
    // should not be called simplofybcrs...
    const res = simplifyClientRects([
      {
        left: 10,
        right: 110,
        width: 100,
        height: 10,
        top: 10,
        bottom: 20,
      },
      {
        left: 110,
        right: 210,
        width: 100,
        height: 10,
        top: 12,
        bottom: 22,
      },
    ]);
    assert.deepEqual(res, [
      {
        left: 10,
        right: 210,
        width: 200,
        height: 12,
        top: 10,
        bottom: 22,
      },
    ]);
  });
});
