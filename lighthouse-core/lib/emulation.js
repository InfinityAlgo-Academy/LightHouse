/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Driver = require('../gather/driver'); // eslint-disable-line no-unused-vars
const mobile3G = require('../config/constants').throttling.mobile3G;

const NBSP = '\xa0';

/**
 * Nexus 5X metrics adapted from emulated_devices/module.json
 * @type {LH.Crdp.Emulation.SetDeviceMetricsOverrideRequest}
 */
const NEXUS5X_EMULATION_METRICS = {
  mobile: true,
  screenWidth: 412,
  screenHeight: 732,
  width: 412,
  height: 732,
  positionX: 0,
  positionY: 0,
  scale: 1,
  deviceScaleFactor: 2.625,
  screenOrientation: {
    angle: 0,
    type: 'portraitPrimary',
  },
};

const NEXUS5X_USERAGENT = {
  userAgent: 'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5 Build/MRA58N) AppleWebKit/537.36' +
    '(KHTML, like Gecko) Chrome/66.0.3359.30 Mobile Safari/537.36',
};

const OFFLINE_METRICS = {
  offline: true,
  // values of 0 remove any active throttling. crbug.com/456324#c9
  latency: 0,
  downloadThroughput: 0,
  uploadThroughput: 0,
};

const NO_THROTTLING_METRICS = {
  latency: 0,
  downloadThroughput: 0,
  uploadThroughput: 0,
  offline: false,
};

const NO_CPU_THROTTLE_METRICS = {
  rate: 1,
};
const CPU_THROTTLE_METRICS = {
  rate: 4,
};

/**
 * @param {Driver} driver
 */
function enableNexus5X(driver) {
  return Promise.all([
    driver.sendCommand('Emulation.setDeviceMetricsOverride', NEXUS5X_EMULATION_METRICS),
    // Network.enable must be called for UA overriding to work
    driver.sendCommand('Network.enable'),
    driver.sendCommand('Network.setUserAgentOverride', NEXUS5X_USERAGENT),
    driver.sendCommand('Emulation.setEmitTouchEventsForMouse', {
      enabled: true,
      configuration: 'mobile',
    }),
  ]);
}

/**
 * @param {Driver} driver
 * @param {LH.ThrottlingSettings|undefined} throttlingSettings
 * @return {Promise<void>}
 */
function enableNetworkThrottling(driver, throttlingSettings = mobile3G) {
  /** @type {LH.Crdp.Network.EmulateNetworkConditionsRequest} */
  const conditions = {
    offline: false,
    latency: throttlingSettings.requestLatencyMs || 0,
    downloadThroughput: throttlingSettings.downloadThroughputKbps || 0,
    uploadThroughput: throttlingSettings.uploadThroughputKbps || 0,
  };

  // DevTools expects throughput in bytes per second rather than kbps
  conditions.downloadThroughput = Math.floor(conditions.downloadThroughput * 1024 / 8);
  conditions.uploadThroughput = Math.floor(conditions.uploadThroughput * 1024 / 8);
  return driver.sendCommand('Network.emulateNetworkConditions', conditions);
}

/**
 * @param {Driver} driver
 * @return {Promise<void>}
 */
function clearAllNetworkEmulation(driver) {
  return driver.sendCommand('Network.emulateNetworkConditions', NO_THROTTLING_METRICS);
}

/**
 * @param {Driver} driver
 * @return {Promise<void>}
 */
function goOffline(driver) {
  return driver.sendCommand('Network.emulateNetworkConditions', OFFLINE_METRICS);
}

/**
 * @param {Driver} driver
 * @param {LH.ThrottlingSettings|undefined} throttlingSettings
 * @return {Promise<void>}
 */
function enableCPUThrottling(driver, throttlingSettings) {
  // TODO: cpuSlowdownMultiplier should be a required property by this point
  const rate = throttlingSettings && throttlingSettings.cpuSlowdownMultiplier !== undefined
    ? throttlingSettings.cpuSlowdownMultiplier
    : CPU_THROTTLE_METRICS.rate;
  return driver.sendCommand('Emulation.setCPUThrottlingRate', {rate});
}

/**
 * @param {Driver} driver
 * @return {Promise<void>}
 */
function disableCPUThrottling(driver) {
  return driver.sendCommand('Emulation.setCPUThrottlingRate', NO_CPU_THROTTLE_METRICS);
}

/**
 * @param {LH.ConfigSettings} settings
 * @return {{deviceEmulation: string, cpuThrottling: string, networkThrottling: string}}
 */
function getEmulationDesc(settings) {
  let cpuThrottling;
  let networkThrottling;

  /** @type {LH.ThrottlingSettings} */
  const throttling = settings.throttling || {};

  switch (settings.throttlingMethod) {
    case 'provided':
      cpuThrottling = 'Provided by environment';
      networkThrottling = 'Provided by environment';
      break;
    case 'devtools': {
      const {cpuSlowdownMultiplier, requestLatencyMs} = throttling;
      cpuThrottling = `${cpuSlowdownMultiplier}x slowdown (DevTools)`;
      networkThrottling = `${requestLatencyMs}${NBSP}ms HTTP RTT, ` +
        `${throttling.downloadThroughputKbps}${NBSP}Kbps down, ` +
        `${throttling.uploadThroughputKbps}${NBSP}Kbps up (DevTools)`;
      break;
    }
    case 'simulate': {
      const {cpuSlowdownMultiplier, rttMs, throughputKbps} = throttling;
      cpuThrottling = `${cpuSlowdownMultiplier}x slowdown (Simulated)`;
      networkThrottling = `${rttMs}${NBSP}ms TCP RTT, ` +
        `${throughputKbps}${NBSP}Kbps throughput (Simulated)`;
      break;
    }
    default:
      cpuThrottling = 'Unknown';
      networkThrottling = 'Unknown';
  }

  return {
    deviceEmulation: settings.disableDeviceEmulation ? 'Disabled' : 'Nexus 5X',
    cpuThrottling,
    networkThrottling,
  };
}

module.exports = {
  enableNexus5X,
  enableNetworkThrottling,
  clearAllNetworkEmulation,
  enableCPUThrottling,
  disableCPUThrottling,
  goOffline,
  getEmulationDesc,
};
