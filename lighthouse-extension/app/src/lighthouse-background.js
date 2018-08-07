/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const RawProtocol = require('../../../lighthouse-core/gather/connections/raw');
const Runner = require('../../../lighthouse-core/runner');
const Config = require('../../../lighthouse-core/config/config');
const defaultConfig = require('../../../lighthouse-core/config/default-config.js');
const i18n = require('../../../lighthouse-core/lib/i18n');
const log = require('lighthouse-logger');

/** @typedef {import('../../../lighthouse-core/gather/connections/connection.js')} Connection */

/**
 * @param {Connection} connection
 * @param {string} url
 * @param {LH.Flags} flags Lighthouse flags.
 * @param {Array<string>} categoryIDs Name values of categories to include.
 * @param {(url?: string) => void} updateBadgeFn
 * @return {Promise<LH.RunnerResult|void>}
 */
function runLighthouseForConnection(connection, url, flags, categoryIDs, updateBadgeFn = _ => {}) {
  const config = new Config({
    extends: 'lighthouse:default',
    settings: {
      onlyCategories: categoryIDs,
    },
  }, flags);

  updateBadgeFn(url);

  return Runner.run(connection, {url, config}) // Run Lighthouse.
    .then(result => {
      updateBadgeFn();
      return result;
    })
    .catch(err => {
      updateBadgeFn();
      throw err;
    });
}

/**
 * @param {RawProtocol.Port} port
 * @param {string} url
 * @param {LH.Flags} flags Lighthouse flags.
 * @param {Array<string>} categoryIDs Name values of categories to include.
 * @return {Promise<LH.RunnerResult|void>}
 */
function runLighthouseInWorker(port, url, flags, categoryIDs) {
  // Default to 'info' logging level.
  log.setLevel('info');
  const connection = new RawProtocol(port);
  return runLighthouseForConnection(connection, url, flags, categoryIDs);
}

/**
 * Returns list of top-level categories from the default config.
 * @return {Array<{title: string, id: string}>}
 */
function getDefaultCategories() {
  const categories = Config.getCategories(defaultConfig);
  categories.forEach(cat => cat.title = i18n.getFormatted(cat.title, 'en-US'));
  return categories;
}

/** @param {(status: [string, string, string]) => void} listenCallback */
function listenForStatus(listenCallback) {
  log.events.addListener('status', listenCallback);
}

if (typeof module !== 'undefined' && module.exports) {
  // export for lighthouse-ext-background to require (via browserify).
  module.exports = {
    runLighthouseForConnection,
    runLighthouseInWorker,
    getDefaultCategories,
    listenForStatus,
  };
}

if (typeof window !== 'undefined') {
  // Expose on window for devtools, other consumers of file.
  // @ts-ignore
  window.runLighthouseInWorker = runLighthouseInWorker;
  // @ts-ignore
  window.listenForStatus = listenForStatus;
}
