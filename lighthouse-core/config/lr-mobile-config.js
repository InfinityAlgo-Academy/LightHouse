/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/** @type {LH.Config.Json} */
const config = {
  // This is just `node lighthouse --config-path lighthouse-core/config/lr-mobile-config.js --print-config`
  // with `onlyAudits: ['speed-index']
  // This avoids using `default-config` and trying to load gatherers just to filter them out, that
  // way we can not include the in the bundle without error.
  settings: {
    output: ['json'],
    maxWaitForFcp: 15000,
    maxWaitForLoad: 35000,
    formFactor: 'mobile',
    throttling: {
      rttMs: 150,
      throughputKbps: 1638.4,
      requestLatencyMs: 562.5,
      downloadThroughputKbps: 1474.5600000000002,
      uploadThroughputKbps: 675,
      cpuSlowdownMultiplier: 4,
    },
    throttlingMethod: 'simulate',
    screenEmulation: {
      mobile: true,
      width: 360,
      height: 640,
      deviceScaleFactor: 2.625,
      disabled: false,
    },
    // eslint-disable-next-line max-len
    emulatedUserAgent: 'Mozilla/5.0 (Linux; Android 7.0; Moto G (4)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4420.0 Mobile Safari/537.36 Chrome-Lighthouse',
    auditMode: false,
    gatherMode: false,
    disableStorageReset: false,
    channel: 'cli',
    budgets: null,
    locale: 'en-US',
    blockedUrlPatterns: null,
    additionalTraceCategories: null,
    extraHeaders: null,
    precomputedLanternData: null,
    onlyAudits: ['speed-index'],
    onlyCategories: null,
    skipAudits: null,
  },
  passes: [
    {
      passName: 'defaultPass',
      loadFailureMode: 'fatal',
      recordTrace: true,
      useThrottling: true,
      pauseAfterFcpMs: 1000,
      pauseAfterLoadMs: 1000,
      networkQuietThresholdMs: 1000,
      cpuQuietThresholdMs: 1000,
      blockedUrlPatterns: [],
      blankPage: 'about:blank',
      gatherers: [],
    },
  ],
  audits: [{path: 'metrics/speed-index'},
  ],
  categories: {
    performance: {
      title: 'Performance',
      auditRefs: [
        {
          id: 'speed-index',
          weight: 15,
          group: 'metrics',
          acronym: 'SI',
        },
      ],
    },
  },
  groups: {
    'metrics': {
      title: 'Metrics',
    },
  },
};

module.exports = config;
