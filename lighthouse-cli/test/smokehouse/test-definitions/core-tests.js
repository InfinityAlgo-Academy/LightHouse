/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const errors = require('./errors/error-expectations.js');
const pwa = require('./pwa/pwa-expectations.js');
const pwa2 = require('./pwa/pwa2-expectations.js');
const redirects = require('./redirects/expectations.js');
const seo = require('./seo/expectations.js');
const offline = require('./offline-local/offline-expectations.js');
const byte = require('./byte-efficiency/expectations.js');
const perf = require('./perf/expectations.js');
const diagnostics = require('./perf-diagnostics/expectations.js');
const lantern = require('./lantern/lantern-expectations.js');
const metrics = require('./tricky-metrics/expectations.js');
const csp = require('./csp/csp-expectations.js');

/** @type {ReadonlyArray<Smokehouse.TestDfn>} */
const smokeTests = [{
  id: 'a11y',
  expectations: require('./a11y/expectations.js'),
  config: require('./a11y/a11y-config.js'),
}, {
  id: 'errors-infinite-loop',
  expectations: errors.infiniteLoop,
  config: require('./errors/error-config.js'),
  runSerially: true,
}, {
  id: 'errors-expired-ssl',
  expectations: errors.expiredSsl,
  config: require('./errors/error-config.js'),
  runSerially: true,
}, {
  id: 'errors-iframe-expired-ssl',
  expectations: errors.iframeBadSsl,
  config: require('./errors/error-config.js'),
  runSerially: true,
}, {
  id: 'oopif',
  expectations: require('./oopif/oopif-expectations.js'),
  config: require('./oopif/oopif-config.js'),
}, {
  id: 'pwa-airhorner',
  expectations: pwa.airhorner,
  config: require('./pwa/pwa-config.js'),
}, {
  id: 'pwa-chromestatus',
  expectations: pwa.chromestatus,
  config: require('./pwa/pwa-config.js'),
}, {
  id: 'pwa-svgomg',
  expectations: pwa2.svgomg,
  config: require('./pwa/pwa-config.js'),
}, {
  id: 'pwa-caltrain',
  expectations: pwa2.caltrain,
  config: require('./pwa/pwa-config.js'),
}, {
  id: 'pwa-rocks',
  expectations: require('./pwa/pwa3-expectations.js').pwarocks,
  config: require('./pwa/pwa-config.js'),
}, {
  id: 'dbw',
  expectations: require('./dobetterweb/dbw-expectations.js'),
  config: require('./dobetterweb/dbw-config.js'),
  runSerially: true, // Need access to network request assertions.
}, {
  id: 'issues-mixed-content',
  expectations: require('./issues/mixed-content.js'),
}, {
  id: 'redirects-single-server',
  expectations: redirects.singleServer,
  config: require('./redirects/redirects-config.js'),
}, {
  id: 'redirects-multiple-server',
  expectations: redirects.multipleServer,
  config: require('./redirects/redirects-config.js'),
}, {
  id: 'redirects-client-paint-server',
  expectations: redirects.clientPaintServer,
  config: require('./redirects/redirects-config.js'),
}, {
  id: 'redirects-single-client',
  expectations: redirects.singleClient,
  config: require('./redirects/redirects-config.js'),
}, {
  id: 'redirects-history-push-state',
  expectations: redirects.historyPushState,
  config: require('./redirects/redirects-config.js'),
}, {
  id: 'seo-passing',
  expectations: seo.passing,
  config: require('./seo/seo-config.js'),
}, {
  id: 'seo-failing',
  expectations: seo.failing,
  config: require('./seo/seo-config.js'),
}, {
  id: 'seo-status-403',
  expectations: seo.status403,
  config: require('./seo/seo-config.js'),
}, {
  id: 'seo-tap-targets',
  expectations: seo.tapTargets,
  config: require('./seo/seo-config.js'),
}, {
  id: 'offline-online-only',
  expectations: offline.onlineOnly,
  config: require('./offline-local/offline-config.js'),
  runSerially: true,
}, {
  id: 'offline-ready',
  expectations: offline.ready,
  config: require('./offline-local/offline-config.js'),
  runSerially: true,
}, {
  id: 'offline-sw-broken',
  expectations: offline.swBroken,
  config: require('./offline-local/offline-config.js'),
  runSerially: true,
}, {
  id: 'offline-sw-slow',
  expectations: offline.swSlow,
  config: require('./offline-local/offline-config.js'),
  runSerially: true,
}, {
  id: 'byte-efficiency',
  expectations: byte.efficiency,
  config: require('./byte-efficiency/byte-config.js'),
  runSerially: true,
}, {
  id: 'byte-gzip',
  expectations: byte.gzip,
  config: require('./byte-efficiency/byte-config.js'),
  runSerially: true,
}, {
  id: 'perf-preload',
  expectations: perf.preload,
  config: require('./perf/perf-config.js'),
  runSerially: true,
}, {
  id: 'perf-budgets',
  expectations: perf.budgets,
  config: require('./perf/perf-config.js'),
  runSerially: true,
}, {
  id: 'perf-fonts',
  expectations: perf.fonts,
  config: require('./perf/perf-config.js'),
  runSerially: true,
}, {
  id: 'perf-trace-elements',
  expectations: perf.traceElements,
  config: require('./perf/perf-config.js'),
  runSerially: true,
}, {
  id: 'perf-frame-metrics',
  expectations: perf.frameMetrics,
  config: require('./perf/perf-config.js'),
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
  config: require('./perf-diagnostics/perf-diagnostics-config.js'),
}, {
  id: 'perf-diagnostics-third-party',
  expectations: diagnostics.thirdParty,
  config: require('./perf-diagnostics/perf-diagnostics-config.js'),
}, {
  id: 'perf-diagnostics-unsized-images',
  expectations: diagnostics.unsizedImages,
  config: require('./perf-diagnostics/perf-diagnostics-config.js'),
}, {
  id: 'lantern-online',
  expectations: lantern.online,
  config: require('./lantern/lantern-config.js'),
}, {
  id: 'lantern-settimeout',
  expectations: lantern.setTimeout,
  config: require('./lantern/lantern-config.js'),
}, {
  id: 'lantern-fetch',
  expectations: lantern.fetch,
  config: require('./lantern/lantern-config.js'),
}, {
  id: 'lantern-xhr',
  expectations: lantern.xhr,
  config: require('./lantern/lantern-config.js'),
}, {
  id: 'lantern-idle-callback-short',
  expectations: lantern.idleCallbackShort,
  config: require('./lantern/lantern-config.js'),
}, {
  id: 'lantern-idle-callback-long',
  expectations: lantern.idleCallbackLong,
  config: require('./lantern/lantern-config.js'),
}, {
  id: 'metrics-tricky-tti',
  expectations: metrics.trickyTti,
  config: require('./tricky-metrics/no-throttling-config.js'),
}, {
  id: 'metrics-tricky-tti-late-fcp',
  expectations: metrics.trickyTtiLateFcp,
  config: require('./tricky-metrics/no-throttling-config.js'),
}, {
  id: 'metrics-delayed-lcp',
  expectations: metrics.delayedLcp,
  config: require('./tricky-metrics/no-throttling-config.js'),
}, {
  id: 'metrics-delayed-fcp',
  expectations: metrics.delayedFcp,
  config: require('./tricky-metrics/no-throttling-config.js'),
}, {
  id: 'metrics-debugger',
  expectations: metrics.debuggerStatement,
  config: require('./tricky-metrics/no-throttling-config.js'),
}, {
  id: 'legacy-javascript',
  expectations: require('./legacy-javascript/expectations.js'),
  config: require('./legacy-javascript/legacy-javascript-config.js'),
}, {
  id: 'source-maps',
  expectations: require('./source-maps/expectations.js'),
  config: require('./source-maps/source-maps-config.js'),
}, {
// TODO: restore when --enable-features=AutofillShowTypePredictions is not needed.
//   id: 'forms',
//   expectations: require('./forms/form-expectations.js'),
//   config: require('./forms/form-config.js'),
// }, {
  id: 'screenshot',
  expectations: require('./screenshot/expectations.js'),
  config: require('./screenshot/screenshot-config.js'),
}, {
  id: 'pubads',
  expectations: require('./pubads/expectations.js'),
  config: require('./pubads/pubads-config.js'),
}, {
  id: 'csp-allow-all',
  expectations: csp.allowAll,
  config: require('./csp/csp-config.js'),
}, {
  id: 'csp-block-all-m91',
  expectations: csp.blockAllM91,
  config: require('./csp/csp-config.js'),
}, {
  id: 'csp-block-all',
  expectations: csp.blockAll,
  config: require('./csp/csp-config.js'),
}];

module.exports = smokeTests;
