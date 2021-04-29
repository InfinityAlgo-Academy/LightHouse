/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Driver = require('./driver.js');
const Runner = require('../../runner.js');
const {
  getEmptyArtifactState,
  collectPhaseArtifacts,
  awaitArtifacts,
} = require('./runner-helpers.js');
const {defaultNavigationConfig} = require('../../config/constants.js');
const {initializeConfig} = require('../config/config.js');
const {getBaseArtifacts} = require('./base-artifacts.js');

/**
 * @typedef NavigationContext
 * @property {Driver} driver
 * @property {LH.Config.NavigationDefn} navigation
 * @property {string} requestedUrl
 */


/**
 * @param {{driver: Driver, config: LH.Config.FRConfig, requestedUrl: string}} args
 */
async function _setup({driver, config, requestedUrl}) {
  await driver.connect();
  // TODO(FR-COMPAT): use frameNavigated-based navigation
  await driver._page.goto(defaultNavigationConfig.blankPage);

  // TODO(FR-COMPAT): setupDriver

  const baseArtifacts = await getBaseArtifacts(config, driver);
  baseArtifacts.URL.requestedUrl = requestedUrl;

  return {baseArtifacts};
}

/**
 * @param {NavigationContext} navigationContext
 */
async function _setupNavigation({driver, navigation}) {
  // TODO(FR-COMPAT): use frameNavigated-based navigation
  await driver._page.goto(navigation.blankPage);

  // TODO(FR-COMPAT): setup network conditions (throttling & cache state)
}

/**
 * @param {NavigationContext} navigationContext
 */
async function _navigate(navigationContext) {
  const {driver, requestedUrl} = navigationContext;
  // TODO(FR-COMPAT): use waitForCondition-based navigation
  await driver._page.goto(requestedUrl, {waitUntil: ['load', 'networkidle2']});

  // TODO(FR-COMPAT): disable all throttling settings
  // TODO(FR-COMPAT): capture page load errors
}


/**
 * @param {NavigationContext} navigationContext
 */
async function _navigation(navigationContext) {
  const artifactState = getEmptyArtifactState();
  const options = {
    gatherMode: /** @type {'navigation'} */ ('navigation'),
    driver: navigationContext.driver,
    artifactDefinitions: navigationContext.navigation.artifacts,
    artifactState,
  };

  await _setupNavigation(navigationContext);
  await collectPhaseArtifacts({phase: 'startInstrumentation', ...options});
  await collectPhaseArtifacts({phase: 'startSensitiveInstrumentation', ...options});
  await _navigate(navigationContext);
  await collectPhaseArtifacts({phase: 'stopSensitiveInstrumentation', ...options});
  await collectPhaseArtifacts({phase: 'stopInstrumentation', ...options});
  await collectPhaseArtifacts({phase: 'getArtifact', ...options});

  const artifacts = await awaitArtifacts(artifactState);
  return {artifacts};
}

/**
 * @param {{driver: Driver, config: LH.Config.FRConfig, requestedUrl: string}} args
 */
async function _navigations({driver, config, requestedUrl}) {
  if (!config.navigations) throw new Error('No navigations configured');

  /** @type {Partial<LH.GathererArtifacts>} */
  const artifacts = {};

  for (const navigation of config.navigations) {
    const navigationContext = {
      driver,
      navigation,
      requestedUrl,
    };

    const navigationResult = await _navigation(navigationContext);
    Object.assign(artifacts, navigationResult.artifacts);
  }

  return {artifacts};
}

/**
 * @param {{driver: Driver}} args
 */
async function _cleanup({driver}) { // eslint-disable-line no-unused-vars
  // TODO(FR-COMPAT): clear storage if necessary
}

/**
 * @param {{url: string, page: import('puppeteer').Page, config?: LH.Config.Json}} options
 * @return {Promise<LH.RunnerResult|undefined>}
 */
async function navigation(options) {
  const {url: requestedUrl, page} = options;
  const {config} = initializeConfig(options.config, {gatherMode: 'navigation'});

  return Runner.run(
    async () => {
      const driver = new Driver(page);
      const {baseArtifacts} = await _setup({driver, config, requestedUrl});
      const {artifacts} = await _navigations({driver, config, requestedUrl});
      await _cleanup({driver});

      return /** @type {LH.Artifacts} */ ({...baseArtifacts, ...artifacts}); // Cast to drop Partial<>
    },
    {
      url: requestedUrl,
      config,
    }
  );
}

module.exports = {
  navigation,
  _setup,
  _setupNavigation,
  _navigate,
  _navigation,
  _navigations,
  _cleanup,
};
