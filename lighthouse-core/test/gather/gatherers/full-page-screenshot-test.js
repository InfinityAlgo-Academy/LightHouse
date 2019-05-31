/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

const FullPageScreenshotGatherer = require('../../../gather/gatherers/full-page-screenshot.js');

function createMockDriver({contentSize, screenshotData}) {
  return {
    evaluateAsync: async function(code) {
      if (code === 'window.innerWidth') {
        return 412;
      }
    },
    beginEmulation: jest.fn(),
    sendCommand: function(method) {
      if (method === 'Page.getLayoutMetrics') {
        return {
          contentSize,
        };
      }
      if (method === 'Page.captureScreenshot') {
        return {
          data: screenshotData || 'abc',
        };
      }
    },
  };
}

describe('Full-page screenshot gatherer', () => {
  it('captures a full-page screenshots and then resets the emulation settings', async () => {
    const fpsGatherer = new FullPageScreenshotGatherer();
    const driver = createMockDriver({
      contentSize: {
        width: 412,
        height: 2000,
      },
    });
    const opts = {
      settings: {
        emulatedFormFactor: 'mobile',
      },
      driver,
    };

    const artifact = await fpsGatherer.afterPass(opts);

    const beginEmulationCalls = driver.beginEmulation.mock.calls;
    expect(beginEmulationCalls[0]).toEqual([
      {emulatedFormFactor: 'mobile'},
      {
        deviceScaleFactor: 1,
        height: 2000,
        screenHeight: 2000,
      },
    ]);
    expect(beginEmulationCalls[1]).toEqual([{emulatedFormFactor: 'mobile'}]);

    expect(artifact).toEqual({
      data: 'data:image/jpeg;base64,abc',
      height: 2000,
      width: 412,
    });
  });

  it('limits the screenshot height to the max chrome can capture', async () => {
    const fpsGatherer = new FullPageScreenshotGatherer();
    const driver = createMockDriver({
      contentSize: {
        width: 412,
        height: 100000,
      },
    });
    const opts = {
      settings: {
        emulatedFormFactor: 'mobile',
      },
      driver,
    };

    await fpsGatherer.afterPass(opts);

    const beginEmulationCalls = driver.beginEmulation.mock.calls;
    expect(beginEmulationCalls[0]).toEqual([
      {emulatedFormFactor: 'mobile'},
      {
        deviceScaleFactor: 1,
        height: FullPageScreenshotGatherer.MAX_SCREENSHOT_HEIGHT,
        screenHeight: FullPageScreenshotGatherer.MAX_SCREENSHOT_HEIGHT,
      },
    ]);
  });

  it('captures a smaller screenshot if the captured data URL is too large', async () => {
    const fpsGatherer = new FullPageScreenshotGatherer();
    const driver = createMockDriver({
      contentSize: {
        width: 412,
        height: 15000,
      },
      screenshotData: new Array(3 * 1024 * 1024).join('a'),
    });
    const opts = {
      settings: {
        emulatedFormFactor: 'mobile',
      },
      driver,
    };

    await fpsGatherer.afterPass(opts);

    const beginEmulationCalls = driver.beginEmulation.mock.calls;
    expect(beginEmulationCalls[0]).toEqual([
      {emulatedFormFactor: 'mobile'},
      {
        deviceScaleFactor: 1,
        height: 15000,
        screenHeight: 15000,
      },
    ]);
    expect(beginEmulationCalls[2]).toEqual([
      {emulatedFormFactor: 'mobile'},
      {
        deviceScaleFactor: 1,
        height: 5000,
        screenHeight: 5000,
      },
    ]);
  });
});
