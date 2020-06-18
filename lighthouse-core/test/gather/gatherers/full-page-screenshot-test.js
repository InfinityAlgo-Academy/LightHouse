/**
 * @license Copyright 2020 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

const FullPageScreenshotGatherer = require('../../../gather/gatherers/full-page-screenshot.js');

/**
 * @param {{contentSize: any, screenshotData: string[]}}
 */
function createMockDriver({contentSize, screenshotData}) {
  return {
    evaluateAsync: async function(code) {
      if (code === 'window.innerWidth') {
        return 412;
      }
    },
    beginEmulation: jest.fn(),
    sendCommand: jest.fn().mockImplementation(method => {
      if (method === 'Page.getLayoutMetrics') {
        return {
          contentSize,
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

describe('Full-page screenshot gatherer', () => {
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
        emulatedFormFactor: 'mobile',
      },
      driver,
      baseArtifacts: {},
    };

    const artifact = await fpsGatherer.afterPass(passContext);
    expect(artifact).toEqual({
      data: 'data:image/jpeg;base64,abc',
      height: 2000,
      width: 412,
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
        emulatedFormFactor: 'mobile',
      },
      driver,
      baseArtifacts: {},
    };

    await fpsGatherer.afterPass(passContext);

    expect(driver.beginEmulation).toHaveBeenCalledWith({emulatedFormFactor: 'mobile'});
    expect(driver.beginEmulation).toHaveBeenCalledTimes(1);
  });

  it('resets the emulation correctly when Lighthouse does not control it', async () => {
    const fpsGatherer = new FullPageScreenshotGatherer();
    const driver = createMockDriver({
      contentSize: {
        width: 412,
        height: 2000,
      },
    });
    const passContext = {
      settings: {
        emulatedFormFactor: 'none',
      },
      driver,
      baseArtifacts: {},
    };

    await fpsGatherer.afterPass(passContext);

    expect(driver.sendCommand).toHaveBeenCalledWith(
      'Emulation.setDeviceMetricsOverride',
      expect.objectContaining({
        deviceScaleFactor: 1,
        height: 2000,
        screenHeight: 2000,
        screenWidth: 412,
        width: 412,
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
    });
    const passContext = {
      settings: {
        emulatedFormFactor: 'mobile',
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
        screenHeight: FullPageScreenshotGatherer.MAX_SCREENSHOT_HEIGHT,
      })
    );
  });

  it('captures a smaller screenshot if the captured data URL is too large', async () => {
    const fpsGatherer = new FullPageScreenshotGatherer();
    const driver = createMockDriver({
      contentSize: {
        width: 412,
        height: 15000,
      },
      screenshotData: [
        new Array(3 * 1024 * 1024).join('a'),
        new Array(1 * 1024 * 1024).join('a'),
      ],
    });
    const passContext = {
      settings: {
        emulatedFormFactor: 'mobile',
      },
      driver,
      baseArtifacts: {},
    };

    const result = await fpsGatherer.afterPass(passContext);

    expect(driver.sendCommand).toHaveBeenCalledWith(
      'Emulation.setDeviceMetricsOverride',
      expect.objectContaining({
        deviceScaleFactor: 1,
        height: 15000,
        screenHeight: 15000,
      })
    );
    expect(driver.sendCommand).toHaveBeenCalledWith(
      'Emulation.setDeviceMetricsOverride',
      expect.objectContaining({
        deviceScaleFactor: 1,
        height: 5000,
        screenHeight: 5000,
      })
    );

    expect(result).not.toBeNull();
  });

  it('returns null if the captured data URL is way too large', async () => {
    const fpsGatherer = new FullPageScreenshotGatherer();
    const driver = createMockDriver({
      contentSize: {
        width: 412,
        height: 15000,
      },
      screenshotData: [
        new Array(3 * 1024 * 1024).join('a'),
        new Array(2 * 1024 * 1024).join('a'),
      ],
    });
    const passContext = {
      settings: {
        emulatedFormFactor: 'mobile',
      },
      driver,
      baseArtifacts: {},
      LighthouseRunWarnings: [],
    };

    const result = await fpsGatherer.afterPass(passContext);

    expect(driver.sendCommand).toHaveBeenCalledWith(
      'Emulation.setDeviceMetricsOverride',
      expect.objectContaining({
        deviceScaleFactor: 1,
        height: 15000,
        screenHeight: 15000,
      })
    );
    expect(driver.sendCommand).toHaveBeenCalledWith(
      'Emulation.setDeviceMetricsOverride',
      expect.objectContaining({
        deviceScaleFactor: 1,
        height: 5000,
        screenHeight: 5000,
      })
    );

    expect(result).toBeNull();
  });
});
