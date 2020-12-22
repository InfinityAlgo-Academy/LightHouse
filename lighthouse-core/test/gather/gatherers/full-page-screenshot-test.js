/**
 * @license Copyright 2020 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

const FullPageScreenshotGatherer = require('../../../gather/gatherers/full-page-screenshot.js');

/**
 * @param {{contentSize: {width: number, height: number}, screenSize: {width?: number, height?: number, dpr: number}, screenshotData: string[]}}
 */
function createMockDriver({contentSize, screenSize, screenshotData}) {
  return {
    evaluate: async function(fn) {
      if (fn.name === 'resolveNodes') {
        return {};
      } else if (fn.name === 'getObservedDeviceMetrics') {
        return {
          width: screenSize.width,
          height: screenSize.height,
          screenWidth: screenSize.width,
          screenHeight: screenSize.height,
          screenOrientation: {
            type: 'landscapePrimary',
            angle: 30,
          },
          deviceScaleFactor: screenSize.dpr,
        };
      } else {
        throw new Error(`unexpected fn ${fn.name}`);
      }
    },
    beginEmulation: jest.fn(),
    sendCommand: jest.fn().mockImplementation(method => {
      if (method === 'Page.getLayoutMetrics') {
        return {
          contentSize,
          // See comment within _takeScreenshot() implementation
          layoutViewport: {clientWidth: contentSize.width, clientHeight: contentSize.height},
        };
      }
      if (method === 'Page.captureScreenshot') {
        return {
          data: screenshotData && screenshotData.length ? screenshotData.shift() : 'abc',
        };
      }
    }),
  };
}

describe('FullPageScreenshot gatherer', () => {
  it('captures a full-page screenshot', async () => {
    const fpsGatherer = new FullPageScreenshotGatherer();
    const driver = createMockDriver({
      contentSize: {
        width: 412,
        height: 2000,
      },
    });
    const passContext = {
      settings: {
        formFactor: 'mobile',
        screenEmulation: {
          mobile: true,
          disabled: false,
        },
      },
      driver,
      baseArtifacts: {},
    };

    const artifact = await fpsGatherer.afterPass(passContext);
    expect(artifact).toEqual({
      screenshot: {
        data: 'data:image/jpeg;base64,abc',
        height: 2000,
        width: 412,
      },
      nodes: {},
    });
  });

  it('resets the emulation correctly when Lighthouse controls it', async () => {
    const fpsGatherer = new FullPageScreenshotGatherer();
    const driver = createMockDriver({
      contentSize: {
        width: 412,
        height: 2000,
      },
    });
    const passContext = {
      settings: {
        formFactor: 'mobile',
        screenEmulation: {
          mobile: true,
          disabled: false,
        },
      },
      driver,
      baseArtifacts: {},
    };

    await fpsGatherer.afterPass(passContext);

    const expectedArgs = {formFactor: 'mobile', screenEmulation: {disabled: false, mobile: true}};
    expect(driver.beginEmulation).toHaveBeenCalledWith(expectedArgs);
    expect(driver.beginEmulation).toHaveBeenCalledTimes(1);
  });

  it('resets the emulation correctly when Lighthouse does not control it', async () => {
    const fpsGatherer = new FullPageScreenshotGatherer();
    const driver = createMockDriver({
      contentSize: {
        width: 500,
        height: 1500,
      },
      screenSize: {
        width: 500,
        height: 500,
        dpr: 2,
      },
    });
    const passContext = {
      settings: {
        screenEmulation: {
          mobile: true,
          disabled: true,
        },
        formFactor: 'mobile',
      },
      driver,
    };

    await fpsGatherer.afterPass(passContext);

    // Setting up for screenshot.
    expect(driver.sendCommand).toHaveBeenCalledWith(
      'Emulation.setDeviceMetricsOverride',
      expect.objectContaining({
        mobile: true,
        deviceScaleFactor: 1,
        height: 1500,
        width: 500,
      })
    );

    // Restoring.
    expect(driver.sendCommand).toHaveBeenCalledWith(
      'Emulation.setDeviceMetricsOverride',
      expect.objectContaining({
        mobile: true,
        deviceScaleFactor: 2,
        height: 500,
        width: 500,
        screenOrientation: {
          type: 'landscapePrimary',
          angle: 30,
        },
      })
    );
  });

  it('limits the screenshot height to the max Chrome can capture', async () => {
    const fpsGatherer = new FullPageScreenshotGatherer();
    const driver = createMockDriver({
      contentSize: {
        width: 412,
        height: 100000,
      },
      screenSize: {
        dpr: 1,
      },
    });
    const passContext = {
      settings: {
        formFactor: 'mobile',
        screenEmulation: {
          mobile: true,
          disabled: false,
        },
      },
      driver,
      baseArtifacts: {},
    };

    await fpsGatherer.afterPass(passContext);

    expect(driver.sendCommand).toHaveBeenCalledWith(
      'Emulation.setDeviceMetricsOverride',
      expect.objectContaining({
        deviceScaleFactor: 1,
        height: FullPageScreenshotGatherer.MAX_SCREENSHOT_HEIGHT,
      })
    );
  });
});
