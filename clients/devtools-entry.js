/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* global globalThis */

const lighthouse = require('../lighthouse-core/index.js');
const Runner = require('../lighthouse-core/runner.js');
const RawProtocol = require('../lighthouse-core/gather/connections/raw.js');
const log = require('lighthouse-logger');
const {lookupLocale} = require('../lighthouse-core/lib/i18n/i18n.js');
const {registerLocaleData, getCanonicalLocales} = require('../shared/localization/format.js');
const constants = require('../lighthouse-core/config/constants.js');

/** @typedef {import('../lighthouse-core/gather/connections/connection.js')} Connection */

// Rollup seems to overlook some references to `Buffer`, so it must be made explicit.
// (`parseSourceMapFromDataUrl` breaks without this)
/** @type {BufferConstructor} */
globalThis.Buffer = require('buffer').Buffer;

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
 * @return {RawProtocol}
 */
function setUpWorkerConnection(port) {
  return new RawProtocol(port);
}

/** @param {(status: [string, string, string]) => void} listenCallback */
function listenForStatus(listenCallback) {
  log.events.addListener('status', listenCallback);
}

let localDev = true;

/**
 * With just a trace, provide Lighthouse performance report
 * From DevTools it'll look something like this
 *
    self.analyzeTrace({traceEvents: tEvents}, {url: 'http://page', device: 'desktop'})
      .then(console.log)
      .catch(console.warn);
 *
 * @param {LH.Trace} trace
 * @param {{device: "mobile" | "desktop", url: string}} opts
 * @return {Promise<LH.RunnerResult|undefined>}
 */
function analyzeTrace(trace, opts) {
  const url = opts.url;

  /** @type {LH.Config.Json} */
  const configJSON = {
    extends: 'lighthouse:default',
    settings: {
      onlyCategories: ['performance'],
      output: ['json'],
      formFactor: opts.device,
      throttlingMethod: 'devtools', // can't do lantern right now, so need real throttling applied.
      // In DevTools, emulation is applied _before_ Lighthouse starts (to deal with viewport emulation bugs). go/xcnjf
      // As a result, we don't double-apply viewport emulation.
      screenEmulation: {disabled: true},
      traceBasedNetworkRecords: true,
    },
  };

  if (localDev) {
    configJSON.settings.output.push('html');
  }

  // TODO: use FR's initializeConfig. it'll filter for navigation-y things.
  const config = lighthouse.generateConfig(configJSON, {});
  const runOpts = {url, config, computedCache: new Map()};

  const gatherFn = () => {
    /** @type {LH.DevtoolsLog} */
    const fakeDtLogs = [];
    fakeDtLogs.smuggledTrace = trace;

    // /** @type {Partial<LH.Artifacts>} */
    const artifacts = {
      traces: {defaultPass: trace},
      devtoolsLogs: {defaultPass: fakeDtLogs},

      GatherContext: {gatherMode: 'navigation'}, // todo: timespan???
      settings: config.settings,
      URL: {requestedUrl: url, finalUrl: url},
      HostFormFactor: opts.device,
      HostUserAgent: '',
      NetworkUserAgent: '',
      Stacks: [],
      InstallabilityErrors: {errors: []},
      fetchTime: new Date().toJSON() || '',
      LighthouseRunWarnings: [],
      BenchmarkIndex: 1000,
      Timing: [],
      PageLoadError: null,
      WebAppManifest: null,
    };
    return Promise.resolve(artifacts);
  };
  return Runner.run(gatherFn, runOpts);
}

/**
 * Does a locale lookup but limits the result to the *canonical* Lighthouse
 * locales, which are only the locales with a messages locale file that can
 * be downloaded and then used via `registerLocaleData`.
 * @param {string|string[]=} locales
 * @return {LH.Locale}
 */
function lookupCanonicalLocale(locales) {
  return lookupLocale(locales, getCanonicalLocales());
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
  // TODO: expose as lookupCanonicalLocale in LighthouseService.ts?
  // @ts-expect-error
  self.lookupLocale = lookupCanonicalLocale;
  // @ts-expect-error
  self.analyzeTrace = analyzeTrace;
} else {
  // For the bundle smoke test.
  // @ts-expect-error
  global.runBundledLighthouse = lighthouse;
}


// If invoked as CLI, we're gonna read latest-run's trace and analyze that (as desktop)
if (require.main === module) {
  localDev = true;

  /** @type {LH.Trace} */
  const trace = JSON.parse(
    // Gather with:
    //     lighthouse https://paulirish.com --preset=desktop --only-categories=performance -GA --throttling-method=devtools
    require('fs').readFileSync(__dirname + '/../latest-run/defaultPass.trace.json', 'utf8')
  );

  /**
   * @param {LH.Trace} trace
   */
  const getInitialUrl = trace => {
    // TODO: this technique is wrong. it broke on the rv camping site.
    const urls = trace.traceEvents
    .filter(e =>
        (e.name === 'navigationStart' && e?.args?.data?.isLoadingMainFrame === true) ||
        e.name === 'NavigationBodyLoader::StartLoadingBody'
    )
    .map(e => e.args.data?.documentLoaderURL || e.args.url);
    // find most common item: https://stackoverflow.com/a/20762713/89484
    return urls.sort(
      (a, b) => urls.filter(v => v === a).length - urls.filter(v => v === b).length).pop();
  };


  analyzeTrace(trace, {
    device: 'desktop',
    url: getInitialUrl(trace),
  }).then(res => {
    require('fs').writeFileSync('./tracereport.json', res?.report[0], 'utf8');
    require('fs').writeFileSync('./tracereport.html', res?.report[1], 'utf8');
    console.log('done. written to ./tracereport.html');
  });
}

// find clients/ lighthouse-core/ lighthouse-core/audits/metrics/ -iname "*.js" | grep -v test | entr bash -c "node clients/devtools-entry.js && node lighthouse-core/scripts/cleanup-LHR-for-diff.js ./tracereport.json && git --no-pager diff --no-index --color=always ./tracereport-base.json ./tracereport.json; echo 'done' "

/**
 * See also:
 *     node lighthouse-core/test/lib/network-records-from-trace-test.js
 * which compares the network requests we constructed from trace compared to the dtlog ones.
 * it currently only tests 1 netreq at a time.
 */

/**
 * todo:
 * - removal of devtoolsLog from requiredArtifacts when its unused now
 */

