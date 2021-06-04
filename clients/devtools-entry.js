/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const lighthouse = require('../lighthouse-core/index.js');
const Runner = require('../lighthouse-core/runner.js');
const RawProtocol = require('../lighthouse-core/gather/connections/raw.js');
const log = require('lighthouse-logger');
const {registerLocaleData, lookupLocale} = require('../lighthouse-core/lib/i18n/i18n.js');
const constants = require('../lighthouse-core/config/constants.js');

/** @typedef {import('../lighthouse-core/gather/connections/connection.js')} Connection */

/**
 * Returns a config, which runs only certain categories.
 * Varies the config to use based on device.
 * If `lighthouse-plugin-publisher-ads` is in the list of
 * `categoryIDs` the plugin will also be run.
 * Counterpart to the CDT code that sets flags.
 * @see https://cs.chromium.org/chromium/src/third_party/devtools-frontend/src/front_end/lighthouse/LighthouseController.js?type=cs&q=%22const+RuntimeSettings%22+f:lighthouse+-f:out&g=0&l=250
 * @param {Array<string>} categoryIDs
 * @param {string} device
 * @return {LH.Config.Json}
 */
function createConfig(categoryIDs, device) {
  /** @type {LH.SharedFlagsSettings} */
  const settings = {
    onlyCategories: categoryIDs,
    // In DevTools, emulation is applied _before_ Lighthouse starts (to deal with viewport emulation bugs). go/xcnjf
    // As a result, we don't double-apply viewport emulation.
    screenEmulation: {disabled: true},
  };
  if (device === 'desktop') {
    settings.throttling = constants.throttling.desktopDense4G;
    // UA emulation, however, is lost in the protocol handover from devtools frontend to the lighthouse_worker. So it's always applied.
    settings.emulatedUserAgent = constants.userAgents.desktop;
    settings.formFactor = 'desktop';
  }

  return {
    extends: 'lighthouse:default',
    plugins: ['lighthouse-plugin-publisher-ads'],
    settings,
  };
}

/**
 * @param {RawProtocol.Port} port
 * @returns {RawProtocol}
 */
function setUpWorkerConnection(port) {
  return new RawProtocol(port);
}

/** @param {(status: [string, string, string]) => void} listenCallback */
function listenForStatus(listenCallback) {
  log.events.addListener('status', listenCallback);
}

/**
 * With just a trace, provide Lighthouse performance report
 * @param {LH.Trace} trace
 * @param {{device: string, url: string}} opts
 * @return {Promise<LH.RunnerResult|undefined>}
 */
function analyzeTrace(trace, opts) {
  const configJSON = createConfig(undefined, opts.device);
  configJSON.settings.output = ['html'];
  configJSON.settings.onlyAudits = [
    'first-contentful-paint',
    'speed-index',
    'largest-contentful-paint',
    'interactive',
    'total-blocking-time',
    'cumulative-layout-shift',
  ];
  const config = lighthouse.generateConfig(configJSON, {});
  const computedCache = new Map();
  const url = opts.url;
  const runOpts = {url, config, computedCache};

  const gatherFn = ({requestedUrl}) => {
    /** @type {Partial<LH.GathererArtifacts>} */
    const artifacts = {
      traces: {defaultPass: trace},
      devtoolsLogs: {defaultPass: []},

      URL: {requestedUrl: url, finalUrl: url},
      HostFormFactor: opts.device,
      HostUserAgent: 'UA ',
      NetworkUserAgent: 'UA ',
      Stacks: [],
      InstallabilityErrors: {errors: []},
      fetchTime: new Date().toJSON(),
      LighthouseRunWarnings: [],
      BenchmarkIndex: 1000,
      Timing: [],
      PageLoadError: null,
      WebAppManifest: null,
    };
    return artifacts;
  };
  return Runner.run(gatherFn, runOpts);
}

async function testAnalyzeTrace() {
  const fs = require('fs');
  const trace = JSON.parse(
    fs.readFileSync(__dirname + '/../latest-run/defaultPass.trace.json', 'utf8')
  );
  const artifacts = JSON.parse(
    fs.readFileSync(__dirname + '/../latest-run/artifacts.json', 'utf8')
  );
  const res = await analyzeTrace(trace, {
    device: artifacts.settings.formFactor,
    url: artifacts.URL.finalUrl,
  });

  fs.writeFileSync('./tracereport.html', res?.report[0], 'utf8');
  delete res?.report;
  console.log({res});
  console.log('done');
}
// For the bundle smoke test.
if (typeof module !== 'undefined' && module.exports) {
  // Ideally this could be exposed via browserify's `standalone`, but it doesn't
  // work for LH because of https://github.com/browserify/browserify/issues/968
  // Instead, since this file is only ever run in node for testing, expose a
  // bundle entry point as global.
  // @ts-expect-error
  global.runBundledLighthouse = lighthouse;

  // TODO: remove once i dont need it here
  global.analyzeTrace = analyzeTrace;
}

// if invoked as CLI
if (require.main === module) {
  console.log('\n\n\n\n\n\n\n\n\n');
  testAnalyzeTrace();
}

// Expose only in DevTools' worker
if (typeof self !== 'undefined') {
  // TODO: refactor and delete `global.isDevtools`.
  global.isDevtools = true;

  // @ts-expect-error
  self.setUpWorkerConnection = setUpWorkerConnection;
  // @ts-expect-error
  self.runLighthouse = lighthouse;
  // @ts-expect-error
  self.createConfig = createConfig;
  // @ts-expect-error
  self.listenForStatus = listenForStatus;
  // @ts-expect-error
  self.registerLocaleData = registerLocaleData;
  // @ts-expect-error
  self.lookupLocale = lookupLocale;
  // @ts-expect-error
  self.analyzeTrace = analyzeTrace;
}
