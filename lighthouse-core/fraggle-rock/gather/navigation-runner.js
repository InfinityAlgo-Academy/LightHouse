/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Driver = require('./driver.js');
const Runner = require('../../runner.js');
const {defaultNavigationConfig} = require('../../config/constants.js');
const {initializeConfig} = require('../config/config.js');
const {getBaseArtifacts} = require('./base-artifacts.js');

/**
 * @typedef NavigationContext
 * @property {Driver} driver
 * @property {LH.Config.NavigationDefn} navigation
 * @property {string} requestedUrl
 */

/** @typedef {Record<string, Promise<any>>} IntermediateArtifacts */

/**
 * @param {{driver: Driver, config: LH.Config.FRConfig, requestedUrl: string}} args
 */
async function _setup({driver, config, requestedUrl}) {
  await driver.connect();
  // TODO(FR-COMPAT): use frameNavigated-based navigation
  await driver._page.goto(defaultNavigationConfig.blankPage);

  // TODO(FR-COMPAT): setupDriver

  const baseArtifacts = getBaseArtifacts(config);
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
 * @param {IntermediateArtifacts} artifacts
 */
async function _beforeTimespanPhase(navigationContext, artifacts) {
  for (const artifactDefn of navigationContext.navigation.artifacts) {
    const gatherer = artifactDefn.gatherer.instance;
    if (!gatherer.meta.supportedModes.includes('timespan')) continue;

    const artifactPromise = Promise.resolve().then(() =>
      gatherer.beforeTimespan({driver: navigationContext.driver, gatherMode: 'navigation'})
    );
    artifacts[artifactDefn.id] = artifactPromise;
    await artifactPromise.catch(() => {});
  }
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
 * @param {IntermediateArtifacts} artifacts
 */
async function _afterTimespanPhase(navigationContext, artifacts) {
  for (const artifactDefn of navigationContext.navigation.artifacts) {
    const gatherer = artifactDefn.gatherer.instance;
    if (!gatherer.meta.supportedModes.includes('timespan')) continue;

    const artifactPromise = (artifacts[artifactDefn.id] || Promise.resolve()).then(() =>
      gatherer.afterTimespan({driver: navigationContext.driver, gatherMode: 'navigation'})
    );
    artifacts[artifactDefn.id] = artifactPromise;
    await artifactPromise.catch(() => {});
  }
}

/**
 * @param {NavigationContext} navigationContext
 * @param {IntermediateArtifacts} artifacts
 */
async function _snapshotPhase(navigationContext, artifacts) {
  for (const artifactDefn of navigationContext.navigation.artifacts) {
    const gatherer = artifactDefn.gatherer.instance;
    if (!gatherer.meta.supportedModes.includes('snapshot')) continue;

    const artifactPromise = Promise.resolve().then(() =>
      gatherer.snapshot({driver: navigationContext.driver, gatherMode: 'navigation'})
    );
    artifacts[artifactDefn.id] = artifactPromise;
    await artifactPromise.catch(() => {});
  }
}

/**
 * @param {IntermediateArtifacts} timespanArtifacts
 * @param {IntermediateArtifacts} snapshotArtifacts
 * @return {Promise<Partial<LH.GathererArtifacts>>}
 */
async function _mergeArtifacts(timespanArtifacts, snapshotArtifacts) {
  /** @type {IntermediateArtifacts} */
  const artifacts = {};
  for (const [id, promise] of Object.entries({...timespanArtifacts, ...snapshotArtifacts})) {
    artifacts[id] = await promise.catch(err => err);
  }

  return artifacts;
}

/**
 * @param {NavigationContext} navigationContext
 */
async function _navigation(navigationContext) {
  /** @type {IntermediateArtifacts} */
  const timespanArtifacts = {};
  /** @type {IntermediateArtifacts} */
  const snapshotArtifacts = {};

  await _setupNavigation(navigationContext);
  await _beforeTimespanPhase(navigationContext, timespanArtifacts);
  await _navigate(navigationContext);
  await _afterTimespanPhase(navigationContext, timespanArtifacts);
  await _snapshotPhase(navigationContext, snapshotArtifacts);

  const artifacts = await _mergeArtifacts(timespanArtifacts, snapshotArtifacts);
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
  _beforeTimespanPhase,
  _afterTimespanPhase,
  _snapshotPhase,
  _navigate,
  _navigation,
  _navigations,
  _cleanup,
};
