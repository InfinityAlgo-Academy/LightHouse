/**
 * @license Copyright 2020 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Gatherer = require('./gatherer.js');

// JPEG quality setting
// Exploration and examples of reports using different quality settings: https://docs.google.com/document/d/1ZSffucIca9XDW2eEwfoevrk-OTl7WQFeMf0CgeJAA8M/edit#
const FULL_PAGE_SCREENSHOT_QUALITY = 30;
// Maximum screenshot height in Chrome https://bugs.chromium.org/p/chromium/issues/detail?id=770769
const MAX_SCREENSHOT_HEIGHT = 16384;
// Maximum data URL size in Chrome https://bugs.chromium.org/p/chromium/issues/detail?id=69227
const MAX_DATA_URL_SIZE = 2 * 1024 * 1024 - 1;

class FullPageScreenshot extends Gatherer {
  /**
   * @param {LH.Gatherer.PassContext} passContext
   * @param {number} maxScreenshotHeight
   * @return {Promise<LH.Artifacts.FullPageScreenshot>}
   */
  async _takeScreenshot(passContext, maxScreenshotHeight) {
    const driver = passContext.driver;
    const metrics = await driver.sendCommand('Page.getLayoutMetrics');
    const width = await driver.evaluateAsync(`window.innerWidth`);
    const height = Math.min(metrics.contentSize.height, maxScreenshotHeight);

    await driver.sendCommand('Emulation.setDeviceMetricsOverride', {
      mobile: passContext.baseArtifacts.TestedAsMobileDevice,
      height,
      screenHeight: height,
      width,
      screenWidth: width,
      deviceScaleFactor: 1,
    });

    const result = await driver.sendCommand('Page.captureScreenshot', {
      format: 'jpeg',
      quality: FULL_PAGE_SCREENSHOT_QUALITY,
    });
    const data = 'data:image/jpeg;base64,' + result.data;

    return {
      data,
      width,
      height,
    };
  }

  /**
   * @param {LH.Gatherer.PassContext} passContext
   * @return {Promise<LH.Artifacts.FullPageScreenshot | null>}
   */
  async afterPass_(passContext) {
    let screenshot = await this._takeScreenshot(passContext, MAX_SCREENSHOT_HEIGHT);

    if (screenshot.data.length > MAX_DATA_URL_SIZE) {
      // Hitting the data URL size limit is rare, it only happens for pages on tall
      // desktop sites with lots of images.
      // So just cutting down the height a bit fixes the issue.
      screenshot = await this._takeScreenshot(passContext, 5000);
      if (screenshot.data.length > MAX_DATA_URL_SIZE) {
        passContext.LighthouseRunWarnings.push('Full page screenshot is too big.');
        return null;
      }
    }

    return screenshot;
  }

  /**
   * @param {LH.Gatherer.PassContext} passContext
   * @return {Promise<LH.Artifacts['FullPageScreenshot']>}
   */
  async afterPass(passContext) {
    const {driver} = passContext;

    // In case some other program is controlling emulation, try to remember what the device looks
    // like now and reset after gatherer is done.
    // TODO: use screen orientation?
    const lighthouseControlsEmulation = passContext.settings.emulatedFormFactor !== 'none' &&
      !passContext.settings.internalDisableDeviceScreenEmulation;
    const observedDeviceMetrics =
      lighthouseControlsEmulation && await driver.evaluateAsync(`(function() {
        return {
          mobile: ${passContext.baseArtifacts.TestedAsMobileDevice}, // could easily be wrong
          width: document.documentElement.clientWidth,
          height: document.documentElement.clientHeight,
          screenWidth: window.screen.width,
          screenHeight: window.screen.height,
          deviceScaleFactor: window.devicePixelRatio,
        };
      })()`, {useIsolation: true});

    try {
      return await this.afterPass_(passContext);
    } finally {
      // Revert resized page.

      if (lighthouseControlsEmulation) {
        await driver.beginEmulation(passContext.settings);
      } else {
        // Best effort to reset emulation to what it was.
        // https://github.com/GoogleChrome/lighthouse/pull/10716#discussion_r428970681
        // TODO: seems like this would be brittle. Should at least work for devtools, but what
        // about scripted puppeteer usages? Better to introduce a "setEmulation" callback
        // in the LH runner api, which for ex. puppeteer consumers would setup puppeteer emulation,
        // and then just call that to reset?
        await driver.sendCommand('Emulation.setDeviceMetricsOverride', observedDeviceMetrics);
      }
    }
  }
}

module.exports = FullPageScreenshot;
module.exports.MAX_SCREENSHOT_HEIGHT = MAX_SCREENSHOT_HEIGHT;
