/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

import * as a11y from './a11y/expectations.js';
import * as byte from './byte-efficiency/expectations.js';
import * as csp from './csp/csp-expectations.js';
import * as dbw from './dobetterweb/dbw-expectations.js';
import * as diagnostics from './perf-diagnostics/expectations.js';
import * as errors from './errors/error-expectations.js';
// import * as forms from './forms/form-expectations.js';
import * as lantern from './lantern/lantern-expectations.js';
import * as legacyJavascript from './legacy-javascript/expectations.js';
import * as metrics from './tricky-metrics/expectations.js';
import * as mixedContent from './issues/mixed-content-expectations.js';
import * as offline from './offline-local/offline-expectations.js';
import * as oopifg from './oopif/oopif-expectations.js';
import * as perf from './perf/expectations.js';
import * as pubads from './pubads/expectations.js';
import * as pwa from './pwa/pwa-expectations.js';
import * as pwa2 from './pwa/pwa2-expectations.js';
import * as pwa3 from './pwa/pwa3-expectations.js';
import * as redirects from './redirects/expectations.js';
import * as screenshots from './screenshot/expectations.js';
import * as seo from './seo/expectations.js';
import * as sourcemaps from './source-maps/expectations.js';
import a11yConfig from './a11y/a11y-config.js';
import byteConfig from './byte-efficiency/byte-config.js';
import cspConfig from './csp/csp-config.js';
import dbwConfig from './dobetterweb/dbw-config.js';
import errorConfig from './errors/error-config.js';
// import formConfig from './forms/form-config.js';
import lanternConfig from './lantern/lantern-config.js';
import legacyJavascriptConfig from './legacy-javascript/legacy-javascript-config.js';
import noThrottlingConfig from './tricky-metrics/no-throttling-config.js';
import offlineConfig from './offline-local/offline-config.js';
import oopifConfig from './oopif/oopif-config.js';
import perfConfig from './perf/perf-config.js';
import perfDiagnosticsConfig from './perf-diagnostics/perf-diagnostics-config.js';
import pubadsConfig from './pubads/pubads-config.js';
import pwaConfig from './pwa/pwa-config.js';
import redirectsConfig from './redirects/redirects-config.js';
import screenshotConfig from './screenshot/screenshot-config.js';
import seoConfig from './seo/seo-config.js';
import sourcemapsConfig from './source-maps/source-maps-config.js';

/** @type {ReadonlyArray<Smokehouse.TestDfn>} */
const smokeTests = [{
  id: 'a11y',
  expectations: a11y.expectations,
  config: a11yConfig,
}, {
  id: 'errors-infinite-loop',
  expectations: errors.infiniteLoop,
  config: errorConfig,
  runSerially: true,
}, {
  id: 'errors-expired-ssl',
  expectations: errors.expiredSsl,
  config: errorConfig,
  runSerially: true,
}, {
  id: 'errors-iframe-expired-ssl',
  expectations: errors.iframeBadSsl,
  config: errorConfig,
  runSerially: true,
}, {
  id: 'oopif',
  expectations: oopifg.expectations,
  config: oopifConfig,
}, {
  id: 'pwa-airhorner',
  expectations: pwa.airhorner,
  config: pwaConfig,
}, {
  id: 'pwa-chromestatus',
  expectations: pwa.chromestatus,
  config: pwaConfig,
}, {
  id: 'pwa-svgomg',
  expectations: pwa2.svgomg,
  config: pwaConfig,
}, {
  id: 'pwa-caltrain',
  expectations: pwa2.caltrain,
  config: pwaConfig,
}, {
  id: 'pwa-rocks',
  expectations: pwa3.pwarocks,
  config: pwaConfig,
}, {
  id: 'dbw',
  expectations: dbw.expectations,
  config: dbwConfig,
  runSerially: true, // Need access to network request assertions.
}, {
  id: 'issues-mixed-content',
  expectations: mixedContent.expectations,
}, {
  id: 'redirects-single-server',
  expectations: redirects.singleServer,
  config: redirectsConfig,
}, {
  id: 'redirects-multiple-server',
  expectations: redirects.multipleServer,
  config: redirectsConfig,
}, {
  id: 'redirects-client-paint-server',
  expectations: redirects.clientPaintServer,
  config: redirectsConfig,
}, {
  id: 'redirects-single-client',
  expectations: redirects.singleClient,
  config: redirectsConfig,
}, {
  id: 'redirects-history-push-state',
  expectations: redirects.historyPushState,
  config: redirectsConfig,
}, {
  id: 'seo-passing',
  expectations: seo.passing,
  config: seoConfig,
}, {
  id: 'seo-failing',
  expectations: seo.failing,
  config: seoConfig,
}, {
  id: 'seo-status-403',
  expectations: seo.status403,
  config: seoConfig,
}, {
  id: 'seo-tap-targets',
  expectations: seo.tapTargets,
  config: seoConfig,
}, {
  id: 'offline-online-only',
  expectations: offline.onlineOnly,
  config: offlineConfig,
  runSerially: true,
}, {
  id: 'offline-ready',
  expectations: offline.ready,
  config: offlineConfig,
  runSerially: true,
}, {
  id: 'offline-sw-broken',
  expectations: offline.swBroken,
  config: offlineConfig,
  runSerially: true,
}, {
  id: 'offline-sw-slow',
  expectations: offline.swSlow,
  config: offlineConfig,
  runSerially: true,
}, {
  id: 'byte-efficiency',
  expectations: byte.efficiency,
  config: byteConfig,
  runSerially: true,
}, {
  id: 'byte-gzip',
  expectations: byte.gzip,
  config: byteConfig,
  runSerially: true,
}, {
  id: 'perf-preload',
  expectations: perf.preload,
  config: perfConfig,
  runSerially: true,
}, {
  id: 'perf-budgets',
  expectations: perf.budgets,
  config: perfConfig,
  runSerially: true,
}, {
  id: 'perf-fonts',
  expectations: perf.fonts,
  config: perfConfig,
  runSerially: true,
}, {
  id: 'perf-trace-elements',
  expectations: perf.traceElements,
  config: perfConfig,
  runSerially: true,
}, {
  id: 'perf-frame-metrics',
  expectations: perf.frameMetrics,
  config: perfConfig,
  runSerially: true,
}, {
  id: 'perf-debug',
  expectations: perf.debug,
  config: {
    extends: 'lighthouse:default',
    settings: {debugNavigation: true, onlyAudits: ['metrics']},
  },
}, {
  id: 'perf-diagnostics-animations',
  expectations: diagnostics.animations,
  config: perfDiagnosticsConfig,
}, {
  id: 'perf-diagnostics-third-party',
  expectations: diagnostics.thirdParty,
  config: perfDiagnosticsConfig,
}, {
  id: 'perf-diagnostics-unsized-images',
  expectations: diagnostics.unsizedImages,
  config: perfDiagnosticsConfig,
}, {
  id: 'lantern-online',
  expectations: lantern.online,
  config: lanternConfig,
}, {
  id: 'lantern-settimeout',
  expectations: lantern.setTimeout,
  config: lanternConfig,
}, {
  id: 'lantern-fetch',
  expectations: lantern.fetch,
  config: lanternConfig,
}, {
  id: 'lantern-xhr',
  expectations: lantern.xhr,
  config: lanternConfig,
}, {
  id: 'lantern-idle-callback-short',
  expectations: lantern.idleCallbackShort,
  config: lanternConfig,
}, {
  id: 'lantern-idle-callback-long',
  expectations: lantern.idleCallbackLong,
  config: lanternConfig,
}, {
  id: 'metrics-tricky-tti',
  expectations: metrics.trickyTti,
  config: noThrottlingConfig,
}, {
  id: 'metrics-tricky-tti-late-fcp',
  expectations: metrics.trickyTtiLateFcp,
  config: noThrottlingConfig,
}, {
  id: 'metrics-delayed-lcp',
  expectations: metrics.delayedLcp,
  config: noThrottlingConfig,
}, {
  id: 'metrics-delayed-fcp',
  expectations: metrics.delayedFcp,
  config: noThrottlingConfig,
}, {
  id: 'metrics-debugger',
  expectations: metrics.debuggerStatement,
  config: noThrottlingConfig,
}, {
  id: 'legacy-javascript',
  expectations: legacyJavascript.expectations,
  config: legacyJavascriptConfig,
}, {
  id: 'source-maps',
  expectations: sourcemaps.expectations,
  config: sourcemapsConfig,
}, {
// TODO: restore when --enable-features=AutofillShowTypePredictions is not needed.
//   id: 'forms',
//   expectations: forms.expectations,
//   config: formConfig,
// }, {
  id: 'screenshot',
  expectations: screenshots.expectations,
  config: screenshotConfig,
}, {
  id: 'pubads',
  expectations: pubads.expectations,
  config: pubadsConfig,
}, {
  id: 'csp-allow-all',
  expectations: csp.allowAll,
  config: cspConfig,
}, {
  id: 'csp-block-all-m91',
  expectations: csp.blockAllM91,
  config: cspConfig,
}, {
  id: 'csp-block-all',
  expectations: csp.blockAll,
  config: cspConfig,
}];

export default smokeTests;
