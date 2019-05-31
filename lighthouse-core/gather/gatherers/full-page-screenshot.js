/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
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
const MAX_DATA_URL_SIZE = 2 * 1024 * 1024;

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

    await driver.beginEmulation(passContext.settings, {
      height,
      screenHeight: height,
      deviceScaleFactor: 1,
    });

    const result = await driver.sendCommand('Page.captureScreenshot', {
      format: 'jpeg',
      quality: FULL_PAGE_SCREENSHOT_QUALITY,
    });
    const data = 'data:image/jpeg;base64,' + result.data;

    // Revert resized page
    await driver.beginEmulation(passContext.settings);

    return {
      data,
      width,
      height,
    };
  }

  /**
   * @param {LH.Gatherer.PassContext} passContext
   * @return {Promise<LH.Artifacts.FullPageScreenshot>}
   */
  async afterPass(passContext) {
    let screenshot = await this._takeScreenshot(passContext, MAX_SCREENSHOT_HEIGHT);

    if (screenshot.data.length > MAX_DATA_URL_SIZE) {
      // Hitting the data URL size limit is rare, it only happens for pages on tall
      // desktop sites with lots of images.
      // So just cutting down the height a bit fixes the issue.
      screenshot = await this._takeScreenshot(passContext, 5000);
    }

    return screenshot;
  }
}

module.exports = FullPageScreenshot;
module.exports.MAX_SCREENSHOT_HEIGHT = MAX_SCREENSHOT_HEIGHT;
