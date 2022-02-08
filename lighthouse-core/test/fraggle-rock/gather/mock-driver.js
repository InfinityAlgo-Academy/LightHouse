/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

const {
  createMockOnFn,
  createMockOnceFn,
  createMockSendCommandFn,
} = require('../../gather/mock-commands.js');
const {defaultSettings} = require('../../../config/constants.js');

/**
 * @fileoverview Mock fraggle rock driver for testing.
 */

/** @typedef {import('../../../fraggle-rock/gather/driver.js')} Driver */
/** @typedef {import('../../../gather/driver/execution-context.js')} ExecutionContext */

function createMockSession() {
  return {
    setTargetInfo: jestMock.fn(),
    sendCommand: createMockSendCommandFn({useSessionId: false}),
    setNextProtocolTimeout: jestMock.fn(),
    once: createMockOnceFn(),
    on: createMockOnFn(),
    off: jestMock.fn(),
    addProtocolMessageListener: createMockOnFn(),
    removeProtocolMessageListener: jestMock.fn(),
    addSessionAttachedListener: createMockOnFn(),
    removeSessionAttachedListener: jestMock.fn(),
    dispose: jestMock.fn(),

    /** @return {LH.Gatherer.FRProtocolSession} */
    asSession() {
      // @ts-expect-error - We'll rely on the tests passing to know this matches.
      return this;
    },
  };
}

/**
 * @param {LH.Gatherer.AnyFRGathererInstance['meta']} meta
 */
function createMockGathererInstance(meta) {
  return {
    meta,
    startInstrumentation: jestMock.fn(),
    stopInstrumentation: jestMock.fn(),
    startSensitiveInstrumentation: jestMock.fn(),
    stopSensitiveInstrumentation: jestMock.fn(),
    getArtifact: jestMock.fn(),

    /** @return {LH.Gatherer.AnyFRGathererInstance} */
    asGatherer() {
      // @ts-expect-error - We'll rely on the tests passing to know this matches.
      return this;
    },
  };
}

function createMockPage() {
  return {
    url: jestMock.fn().mockReturnValue('https://example.com'),
    goto: jestMock.fn(),
    target: () => ({createCDPSession: () => createMockSession()}),

    /** @return {import('puppeteer').Page} */
    asPage() {
      // @ts-expect-error - We'll rely on the tests passing to know this matches.
      return this;
    },
  };
}

function createMockExecutionContext() {
  return {
    evaluate: jestMock.fn(),
    evaluateAsync: jestMock.fn(),
    evaluateOnNewDocument: jestMock.fn(),
    cacheNativesOnNewDocument: jestMock.fn(),

    /** @return {ExecutionContext} */
    asExecutionContext() {
      // @ts-expect-error - We'll rely on the tests passing to know this matches.
      return this;
    },
  };
}

function createMockTargetManager() {
  return {
    enable: jestMock.fn(),
    disable: jestMock.fn(),
    addTargetAttachedListener: createMockOnFn(),
    removeTargetAttachedListener: jestMock.fn(),
    /** @param {LH.Gatherer.FRProtocolSession} session */
    mockEnable(session) {
      this.enable.mockImplementation(async () => {
        const listeners = this.addTargetAttachedListener.mock.calls.map(call => call[0]);
        const targetWithSession = {target: {type: 'page', targetId: 'page'}, session};
        for (const listener of listeners) await listener(targetWithSession);
      });
    },
    reset() {
      this.enable = jestMock.fn();
      this.disable = jestMock.fn();
      this.addTargetAttachedListener = createMockOnFn();
      this.removeTargetAttachedListener = jestMock.fn();
    },
    /** @return {import('../../../gather/driver/target-manager.js')} */
    asTargetManager() {
      // @ts-expect-error - We'll rely on the tests passing to know this matches.
      return this;
    },
  };
}

function createMockDriver() {
  const page = createMockPage();
  const session = createMockSession();
  const context = createMockExecutionContext();

  return {
    _page: page,
    _executionContext: context,
    _session: session,
    url: () => page.url(),
    defaultSession: session,
    connect: jestMock.fn(),
    disconnect: jestMock.fn(),
    executionContext: context.asExecutionContext(),

    /** @return {Driver} */
    asDriver() {
      // @ts-expect-error - We'll rely on the tests passing to know this matches.
      return this;
    },
  };
}

function mockRunnerModule() {
  const runnerModule = {
    getGathererList: jestMock.fn().mockReturnValue([]),
    audit: jestMock.fn(),
    gather: jestMock.fn(),
    reset,
  };

  jest.mock('../../../runner.js', () => runnerModule);

  function reset() {
    runnerModule.getGathererList.mockReturnValue([]);
    runnerModule.audit.mockReset();
    runnerModule.gather.mockReset();
  }

  return runnerModule;
}

/** @param {() => Driver} driverProvider */
function mockDriverModule(driverProvider) {
  // This must be a regular function becaues Driver is always invoked as a constructor.
  // Arrow functions cannot be invoked with `new`.
  return function() {
    return driverProvider();
  };
}

/**
 * @returns {LH.FRBaseArtifacts}
 */
function createMockBaseArtifacts() {
  return {
    fetchTime: new Date().toISOString(),
    URL: {finalUrl: 'https://example.com', requestedUrl: 'https://example.com'},
    PageLoadError: null,
    settings: defaultSettings,
    BenchmarkIndex: 500,
    LighthouseRunWarnings: [],
    Timing: [],
    HostFormFactor: 'desktop',
    HostUserAgent: 'Chrome/93.0.1449.0',
    GatherContext: {gatherMode: 'navigation'},
  };
}

function mockTargetManagerModule() {
  const targetManagerMock = createMockTargetManager();

  /** @type {(instance: any) => (...args: any[]) => any} */
  const proxyCtor = instance => function() {
    // IMPORTANT! This must be a `function` not an arrow function so it can be invoked as a constructor.
    return instance;
  };

  jest.mock('../../../gather/driver/target-manager.js', () => proxyCtor(targetManagerMock));

  return targetManagerMock;
}

function createMockContext() {
  return {
    driver: createMockDriver(),
    url: 'https://example.com',
    gatherMode: 'navigation',
    computedCache: new Map(),
    dependencies: {},
    baseArtifacts: createMockBaseArtifacts(),
    settings: defaultSettings,

    /** @return {LH.Gatherer.FRTransitionalContext} */
    asContext() {
      // @ts-expect-error - We'll rely on the tests passing to know this matches.
      return this;
    },

    /** @return {LH.Gatherer.PassContext} */
    asLegacyContext() {
      // @ts-expect-error - We'll rely on the tests passing to know this matches.
      return this;
    },
  };
}

function mockDriverSubmodules() {
  const navigationMock = {gotoURL: jestMock.fn()};
  const prepareMock = {
    prepareThrottlingAndNetwork: jestMock.fn(),
    prepareTargetForTimespanMode: jestMock.fn(),
    prepareTargetForNavigationMode: jestMock.fn(),
    prepareTargetForIndividualNavigation: jestMock.fn(),
  };
  const storageMock = {clearDataForOrigin: jestMock.fn()};
  const emulationMock = {
    clearThrottling: jestMock.fn(),
    emulate: jestMock.fn(),
  };
  const networkMock = {
    fetchResponseBodyFromCache: jestMock.fn(),
  };
  const targetManagerMock = mockTargetManagerModule();

  function reset() {
    navigationMock.gotoURL = jestMock.fn().mockResolvedValue({finalUrl: 'https://example.com', warnings: [], timedOut: false});
    prepareMock.prepareThrottlingAndNetwork = jestMock.fn().mockResolvedValue(undefined);
    prepareMock.prepareTargetForTimespanMode = jestMock.fn().mockResolvedValue(undefined);
    prepareMock.prepareTargetForNavigationMode = jestMock.fn().mockResolvedValue({warnings: []});
    prepareMock.prepareTargetForIndividualNavigation = jestMock.fn().mockResolvedValue({warnings: []});
    storageMock.clearDataForOrigin = jestMock.fn();
    emulationMock.clearThrottling = jestMock.fn();
    emulationMock.emulate = jestMock.fn();
    networkMock.fetchResponseBodyFromCache = jestMock.fn().mockResolvedValue('');
    targetManagerMock.reset();
  }

  /**
   * @param {Record<string, (...args: any[]) => any>} target
   * @param {string} name
   * @return {(...args: any[]) => void}
   */
  const get = (target, name) => {
    if (!target[name]) throw new Error(`Target does not have property "${name}"`);
    return (...args) => target[name](...args);
  };

  jest.mock('../../../gather/driver/navigation.js', () => new Proxy(navigationMock, {get}));
  jest.mock('../../../gather/driver/prepare.js', () => new Proxy(prepareMock, {get}));
  jest.mock('../../../gather/driver/storage.js', () => new Proxy(storageMock, {get}));
  jest.mock('../../../gather/driver/network.js', () => new Proxy(networkMock, {get}));
  jest.mock('../../../lib/emulation.js', () => new Proxy(emulationMock, {get}));

  reset();

  return {
    navigationMock,
    prepareMock,
    storageMock,
    emulationMock,
    networkMock,
    targetManagerMock,
    reset,
  };
}

module.exports = {
  mockRunnerModule,
  mockTargetManagerModule,
  mockDriverModule,
  mockDriverSubmodules,
  createMockDriver,
  createMockPage,
  createMockSession,
  createMockGathererInstance,
  createMockBaseArtifacts,
  createMockContext,
};
