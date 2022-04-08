/**
 * @license Copyright 2022 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Driver = require('./driver.js');
const emulation = require('../../lib/emulation.js');
const {initializeConfig} = require('../config/config.js');

/**
 * @param {LH.Gatherer.GatherMode} gatherMode
 * @param {{page: import('puppeteer').Page, config?: LH.Config.Json, configContext?: LH.Config.FRContext}} options
 */
async function dryRunSetup(gatherMode, options) {
  const {page, config: configJson, configContext} = options;
  const {config} = initializeConfig(configJson, {...configContext, gatherMode});
  const driver = new Driver(page);
  await driver.connect();
  await emulation.emulate(driver.defaultSession, config.settings);
  await driver.disconnect();
}

/**
 * @param {LH.NavigationRequestor} requestor
 * @param {{page: import('puppeteer').Page, config?: LH.Config.Json, configContext?: LH.Config.FRContext}} options
 */
async function dryRunNavigation(requestor, options) {
  await dryRunSetup('navigation', options);
  if (typeof requestor === 'string') {
    await options.page.goto(requestor);
  } else {
    await requestor();
  }
}

module.exports = {
  dryRunSetup,
  dryRunNavigation,
};
