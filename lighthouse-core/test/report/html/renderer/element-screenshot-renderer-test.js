/**
 * @license Copyright 2020 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

const ElementScreenshotRenderer =
  require('../../../../report/html/renderer/element-screenshot-renderer.js');
const RectHelpers = require('../../../../../lighthouse-core/lib/rect-helpers.js');

describe('getScreenshotPositionDetails', () => {
  beforeAll(() => {
    global.RectHelpers = RectHelpers;
  });

  afterAll(() => {
    global.RectHelpers = undefined;
  });

  it('centers the screenshot on the highlighted area', () => {
    expect(
      ElementScreenshotRenderer.getScreenshotPositionDetails(
        {left: 400, top: 500, width: 100, height: 40},
        {width: 412, height: 300},
        {width: 1300, height: 5000}
      )
    ).toMatchObject({
      screenshot: {
        left: 244,
        top: 370,
      },
      clip: {
        left: 156,
        top: 130,
      },
    });
  });

  it('contains the screenshot within the display area if the clip is in the top left', () => {
    expect(
      ElementScreenshotRenderer.getScreenshotPositionDetails(
        {left: 0, top: 0, width: 100, height: 40},
        {width: 412, height: 300},
        {width: 412, height: 5000}
      )
    ).toMatchObject({
      screenshot: {
        left: 0,
        top: 0,
      },
      clip: {
        left: 0,
        top: 0,
      },
    });
  });

  it('contains the screenshot within the display area if the clip is in the bottom right', () => {
    expect(
      ElementScreenshotRenderer.getScreenshotPositionDetails(
        {left: 300, top: 4950, width: 100, height: 40},
        {width: 412, height: 300},
        {width: 412, height: 5000}
      )
    ).toMatchObject({
      screenshot: {
        left: 0,
        top: 4700,
      },
      clip: {
        left: 300,
        top: 250,
      },
    });
  });
});
