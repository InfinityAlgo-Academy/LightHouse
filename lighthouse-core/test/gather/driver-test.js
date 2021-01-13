/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Driver = require('../../gather/driver.js');
const Connection = require('../../gather/connections/connection.js');
const LHElement = require('../../lib/lh-element.js');
const {protocolGetVersionResponse} = require('./fake-driver.js');
const {
  createMockSendCommandFn,
  createMockOnceFn,
  makePromiseInspectable,
  flushAllTimersAndMicrotasks,
} = require('../test-utils.js');

/* eslint-env jest */

jest.useFakeTimers();


/**
 * @typedef DriverMockMethods
 * @property {ReturnType<typeof createMockOnceFn>} on
 * @property {ReturnType<typeof createMockOnceFn>} once
 * @property {(...args: RecursivePartial<Parameters<Driver['gotoURL']>>) => ReturnType<Driver['gotoURL']>} gotoURL
 * @property {(...args: RecursivePartial<Parameters<Driver['goOnline']>>) => ReturnType<Driver['goOnline']>} goOnline
*/

/** @typedef {Omit<Driver, keyof DriverMockMethods> & DriverMockMethods} TestDriver */

/** @type {TestDriver} */
let driver;
/** @type {Connection & {sendCommand: ReturnType<typeof createMockSendCommandFn>}} */
let connectionStub;

beforeEach(() => {
  // @ts-expect-error - connectionStub has a mocked version of sendCommand implemented in each test
  connectionStub = new Connection();
  // @ts-expect-error
  connectionStub.sendCommand = cmd => {
    throw new Error(`${cmd} not implemented`);
  };
  // @ts-expect-error - driver has a mocked version of on/once implemented in each test
  driver = new Driver(connectionStub);
});

describe('.querySelector(All)', () => {
  it('returns null when DOM.querySelector finds no node', async () => {
    connectionStub.sendCommand = createMockSendCommandFn()
      .mockResponse('DOM.getDocument', {root: {nodeId: 249}})
      .mockResponse('DOM.querySelector', {nodeId: 0});

    const result = await driver.querySelector('invalid');
    expect(result).toEqual(null);
  });

  it('returns element instance when DOM.querySelector finds a node', async () => {
    connectionStub.sendCommand = createMockSendCommandFn()
      .mockResponse('DOM.getDocument', {root: {nodeId: 249}})
      .mockResponse('DOM.querySelector', {nodeId: 231});

    const result = await driver.querySelector('meta head');
    expect(result).toBeInstanceOf(LHElement);
  });
});

describe('.getObjectProperty', () => {
  it('returns value when getObjectProperty finds property name', async () => {
    const property = {
      name: 'testProp',
      value: {
        value: 123,
      },
    };

    connectionStub.sendCommand = createMockSendCommandFn()
      .mockResponse('Runtime.getProperties', {result: [property]});

    const result = await driver.getObjectProperty('objectId', 'testProp');
    expect(result).toEqual(123);
  });

  it('returns null when getObjectProperty finds no property name', async () => {
    connectionStub.sendCommand = createMockSendCommandFn()
      .mockResponse('Runtime.getProperties', {result: []});

    const result = await driver.getObjectProperty('objectId', 'testProp');
    expect(result).toEqual(null);
  });

  it('returns null when getObjectProperty finds property name with no value', async () => {
    connectionStub.sendCommand = createMockSendCommandFn()
      .mockResponse('Runtime.getProperties', {result: [{name: 'testProp'}]});

    const result = await driver.getObjectProperty('objectId', 'testProp');
    expect(result).toEqual(null);
  });
});

describe('.getRequestContent', () => {
  it('throws if getRequestContent takes too long', async () => {
    const mockTimeout = 5000;
    const driverTimeout = 1000;
    // @ts-expect-error
    connectionStub.sendCommand = jest.fn()
      .mockImplementation(() => new Promise(r => setTimeout(r, mockTimeout)));

    // Fail if we don't reach our two assertions in the catch block
    expect.assertions(2);

    try {
      const responsePromise = driver.getRequestContent('', driverTimeout);
      await flushAllTimersAndMicrotasks(Math.max(driverTimeout, mockTimeout) + 1);
      await responsePromise;
    } catch (err) {
      expect(err.code).toEqual('PROTOCOL_TIMEOUT');
      expect(err.friendlyMessage).toBeDisplayString(
        /^Waiting for DevTools.*Method: Network.getResponseBody/
      );
    }
  });
});

describe('.evaluateAsync', () => {
  // Most of the logic here is tested by lighthouse-core/test/gather/driver/execution-context-test.js
  // Just exercise a bit of the plumbing here to ensure we delegate correctly.
  it('evaluates an expression', async () => {
    connectionStub.sendCommand = createMockSendCommandFn()
      .mockResponse('Runtime.evaluate', {result: {value: 2}});

    const value = await driver.evaluateAsync('1 + 1');
    expect(value).toEqual(2);
    connectionStub.sendCommand.findInvocation('Runtime.evaluate');
  });

  it('uses the specific timeout given', async () => {
    connectionStub.sendCommand = createMockSendCommandFn()
      .mockResponse('Runtime.evaluate', {result: {value: 2}}, 10000);

    driver.setNextProtocolTimeout(5000);
    const evaluatePromise = makePromiseInspectable(driver.evaluateAsync('1 + 1'));

    jest.advanceTimersByTime(5001);
    await flushAllTimersAndMicrotasks();
    expect(evaluatePromise).toBeDone();
    await expect(evaluatePromise).rejects.toBeTruthy();
  });
});

describe('.sendCommand', () => {
  it('.sendCommand timesout when commands take too long', async () => {
    const mockTimeout = 5000;
    // @ts-expect-error
    connectionStub.sendCommand = jest.fn()
      .mockImplementation(() => new Promise(r => setTimeout(r, mockTimeout)));

    driver.setNextProtocolTimeout(10000);
    const pageEnablePromise = driver.sendCommand('Page.enable');
    jest.advanceTimersByTime(mockTimeout + 1);
    await pageEnablePromise;

    const driverTimeout = 5;
    driver.setNextProtocolTimeout(driverTimeout);
    const pageDisablePromise = driver.sendCommand('Page.disable');

    await flushAllTimersAndMicrotasks(driverTimeout + 1);
    await expect(pageDisablePromise).rejects.toMatchObject({
      code: 'PROTOCOL_TIMEOUT',
    });
  });
});

describe('.beginTrace', () => {
  beforeEach(() => {
    connectionStub.sendCommand = createMockSendCommandFn()
      .mockResponse('Browser.getVersion', protocolGetVersionResponse)
      .mockResponse('Page.enable')
      .mockResponse('Tracing.start');
  });

  it('will request default traceCategories', async () => {
    await driver.beginTrace();

    const tracingStartArgs = connectionStub.sendCommand.findInvocation('Tracing.start');
    expect(tracingStartArgs.categories).toContain('devtools.timeline');
    expect(tracingStartArgs.categories).not.toContain('toplevel');
    expect(tracingStartArgs.categories).toContain('disabled-by-default-lighthouse');
  });

  it('will use requested additionalTraceCategories', async () => {
    await driver.beginTrace({additionalTraceCategories: 'loading,xtra_cat'});

    const tracingStartArgs = connectionStub.sendCommand.findInvocation('Tracing.start');
    expect(tracingStartArgs.categories).toContain('blink.user_timing');
    expect(tracingStartArgs.categories).toContain('xtra_cat');
    // Make sure it deduplicates categories too
    expect(tracingStartArgs.categories).not.toMatch(/loading.*loading/);
  });

  it('will adjust traceCategories based on chrome version', async () => {
    connectionStub.sendCommand = createMockSendCommandFn()
      .mockResponse('Browser.getVersion', {product: 'Chrome/70.0.3577.0'})
      .mockResponse('Page.enable')
      .mockResponse('Tracing.start');

    await driver.beginTrace();

    const tracingStartArgs = connectionStub.sendCommand.findInvocation('Tracing.start');
    // COMPAT: m70 doesn't have disabled-by-default-lighthouse, so 'toplevel' is used instead.
    expect(tracingStartArgs.categories).toContain('toplevel');
    expect(tracingStartArgs.categories).not.toContain('disabled-by-default-lighthouse');
  });
});

describe('.setExtraHTTPHeaders', () => {
  it('should Network.setExtraHTTPHeaders when there are extra-headers', async () => {
    connectionStub.sendCommand = createMockSendCommandFn()
      .mockResponse('Network.setExtraHTTPHeaders');

    await driver.setExtraHTTPHeaders({
      'Cookie': 'monster',
      'x-men': 'wolverine',
    });

    expect(connectionStub.sendCommand).toHaveBeenCalledWith(
      'Network.setExtraHTTPHeaders',
      undefined,
      expect.anything()
    );
  });

  it('should not call Network.setExtraHTTPHeaders when there are not extra-headers', async () => {
    connectionStub.sendCommand = createMockSendCommandFn();
    await driver.setExtraHTTPHeaders(null);
    expect(connectionStub.sendCommand).not.toHaveBeenCalled();
  });
});

describe('.getAppManifest', () => {
  it('should return null when no manifest', async () => {
    connectionStub.sendCommand = createMockSendCommandFn().mockResponse(
      'Page.getAppManifest',
      {data: undefined, url: '/manifest'}
    );
    const result = await driver.getAppManifest();
    expect(result).toEqual(null);
  });

  it('should return the manifest', async () => {
    const manifest = {name: 'The App'};
    connectionStub.sendCommand = createMockSendCommandFn().mockResponse(
      'Page.getAppManifest',
      {data: JSON.stringify(manifest), url: '/manifest'}
    );
    const result = await driver.getAppManifest();
    expect(result).toEqual({data: JSON.stringify(manifest), url: '/manifest'});
  });

  it('should handle BOM-encoded manifest', async () => {
    const fs = require('fs');
    const manifestWithoutBOM = fs.readFileSync(__dirname + '/../fixtures/manifest.json').toString();
    const manifestWithBOM = fs
      .readFileSync(__dirname + '/../fixtures/manifest-bom.json')
      .toString();

    connectionStub.sendCommand = createMockSendCommandFn().mockResponse(
      'Page.getAppManifest',
      {data: manifestWithBOM, url: '/manifest'}
    );
    const result = await driver.getAppManifest();
    expect(result).toEqual({data: manifestWithoutBOM, url: '/manifest'});
  });
});

describe('.goOffline', () => {
  it('should send offline emulation', async () => {
    connectionStub.sendCommand = createMockSendCommandFn()
      .mockResponse('Network.enable')
      .mockResponse('Network.emulateNetworkConditions');

    await driver.goOffline();
    const emulateArgs = connectionStub.sendCommand
      .findInvocation('Network.emulateNetworkConditions');
    expect(emulateArgs).toEqual({
      offline: true,
      latency: 0,
      downloadThroughput: 0,
      uploadThroughput: 0,
    });
  });
});

describe('.gotoURL', () => {
  beforeEach(() => {
    connectionStub.sendCommand = createMockSendCommandFn()
      .mockResponse('Network.enable')
      .mockResponse('Page.enable')
      .mockResponse('Page.setLifecycleEventsEnabled')
      .mockResponse('Emulation.setScriptExecutionDisabled')
      .mockResponse('Page.navigate')
      .mockResponse('Target.setAutoAttach')
      .mockResponse('Runtime.evaluate')
      .mockResponse('Page.getResourceTree', {frameTree: {frame: {id: 'ABC'}}});
  });

  it('will track redirects through gotoURL load', async () => {
    driver.on = driver.once = createMockOnceFn();

    const url = 'https://www.example.com';
    const loadOptions = {
      waitForNavigated: true,
    };

    const loadPromise = makePromiseInspectable(driver.gotoURL(url, loadOptions));
    await flushAllTimersAndMicrotasks();
    expect(loadPromise).not.toBeDone('Did not wait for frameNavigated');

    // Use `findListener` instead of `mockEvent` so we can control exactly when the promise resolves
    const loadListener = driver.on.findListener('Page.frameNavigated');

    /** @param {LH.Crdp.Page.Frame} frame */
    const navigate = frame => driver._eventEmitter.emit('Page.frameNavigated', {frame});
    const baseFrame = {
      id: 'ABC', loaderId: '', securityOrigin: '', mimeType: 'text/html', domainAndRegistry: '',
      secureContextType: /** @type {'Secure'} */ ('Secure'),
      crossOriginIsolatedContextType: /** @type {'Isolated'} */ ('Isolated'),
    };
    navigate({...baseFrame, url: 'http://example.com'});
    navigate({...baseFrame, url: 'https://example.com'});
    navigate({...baseFrame, url: 'https://www.example.com'});
    navigate({...baseFrame, url: 'https://m.example.com'});
    navigate({...baseFrame, id: 'ad1', url: 'https://frame-a.example.com'});
    navigate({...baseFrame, url: 'https://m.example.com/client'});
    navigate({...baseFrame, id: 'ad2', url: 'https://frame-b.example.com'});
    navigate({...baseFrame, id: 'ad3', url: 'https://frame-c.example.com'});

    loadListener();
    await flushAllTimersAndMicrotasks();
    expect(loadPromise).toBeDone('Did not resolve after frameNavigated');

    const results = await loadPromise;
    expect(results.finalUrl).toEqual('https://m.example.com/client');
  });

  describe('when waitForNavigated', () => {
    it('waits for Page.frameNavigated', async () => {
      driver.on = driver.once = createMockOnceFn();

      const url = 'https://www.example.com';
      const loadOptions = {
        waitForNavigated: true,
      };

      const loadPromise = makePromiseInspectable(driver.gotoURL(url, loadOptions));
      await flushAllTimersAndMicrotasks();
      expect(loadPromise).not.toBeDone('Did not wait for frameNavigated');

      // Use `findListener` instead of `mockEvent` so we can control exactly when the promise resolves
      const listener = driver.on.findListener('Page.frameNavigated');
      listener();
      await flushAllTimersAndMicrotasks();
      expect(loadPromise).toBeDone('Did not resolve after frameNavigated');

      await loadPromise;
    });
  });
});

describe('.assertNoSameOriginServiceWorkerClients', () => {
  beforeEach(() => {
    connectionStub.sendCommand = createMockSendCommandFn()
      .mockResponse('ServiceWorker.enable')
      .mockResponse('ServiceWorker.disable')
      .mockResponse('ServiceWorker.enable')
      .mockResponse('ServiceWorker.disable');
  });

  /**
   * @param {number} id
   * @param {string} url
   * @param {boolean=} isDeleted
   */
  function createSWRegistration(id, url, isDeleted) {
    return {
      isDeleted: !!isDeleted,
      registrationId: String(id),
      scopeURL: url,
    };
  }

  /**
   * @param {number} id
   * @param {string} url
   * @param {string[]} controlledClients
   * @param {LH.Crdp.ServiceWorker.ServiceWorkerVersionStatus=} status
   */
  function createActiveWorker(id, url, controlledClients, status = 'activated') {
    return {
      registrationId: String(id),
      scriptURL: url,
      controlledClients,
      status,
    };
  }

  it('will pass if there are no current service workers', async () => {
    const pageUrl = 'https://example.com/';

    driver.on = driver.once = createMockOnceFn()
      .mockEvent('ServiceWorker.workerRegistrationUpdated', {registrations: []})
      .mockEvent('ServiceWorker.workerVersionUpdated', {versions: []});

    const assertPromise = driver.assertNoSameOriginServiceWorkerClients(pageUrl);
    await flushAllTimersAndMicrotasks();
    await assertPromise;
  });

  it('will pass if there is an active service worker for a different origin', async () => {
    const pageUrl = 'https://example.com/';
    const secondUrl = 'https://example.edu';
    const swUrl = `${secondUrl}sw.js`;

    const registrations = [createSWRegistration(1, secondUrl)];
    const versions = [createActiveWorker(1, swUrl, ['uniqueId'])];

    driver.on = driver.once = createMockOnceFn()
      .mockEvent('ServiceWorker.workerRegistrationUpdated', {registrations})
      .mockEvent('ServiceWorker.workerVersionUpdated', {versions});

    const assertPromise = driver.assertNoSameOriginServiceWorkerClients(pageUrl);
    await flushAllTimersAndMicrotasks();
    await assertPromise;
  });

  it('will fail if a service worker with a matching origin has a controlled client', async () => {
    const pageUrl = 'https://example.com/';
    const swUrl = `${pageUrl}sw.js`;
    const registrations = [createSWRegistration(1, pageUrl)];
    const versions = [createActiveWorker(1, swUrl, ['uniqueId'])];

    driver.on = driver.once = createMockOnceFn()
      .mockEvent('ServiceWorker.workerRegistrationUpdated', {registrations})
      .mockEvent('ServiceWorker.workerVersionUpdated', {versions});

    expect.assertions(1);

    try {
      const assertPromise = driver.assertNoSameOriginServiceWorkerClients(pageUrl);
      await flushAllTimersAndMicrotasks();
      await assertPromise;
    } catch (err) {
      expect(err.message.toLowerCase()).toContain('multiple tabs');
    }
  });

  it('will succeed if a service worker with has no controlled clients', async () => {
    const pageUrl = 'https://example.com/';
    const swUrl = `${pageUrl}sw.js`;
    const registrations = [createSWRegistration(1, pageUrl)];
    const versions = [createActiveWorker(1, swUrl, [])];

    driver.on = driver.once = createMockOnceFn()
      .mockEvent('ServiceWorker.workerRegistrationUpdated', {registrations})
      .mockEvent('ServiceWorker.workerVersionUpdated', {versions});

    const assertPromise = driver.assertNoSameOriginServiceWorkerClients(pageUrl);
    await flushAllTimersAndMicrotasks();
    await assertPromise;
  });

  it('will wait for serviceworker to be activated', async () => {
    const pageUrl = 'https://example.com/';
    const swUrl = `${pageUrl}sw.js`;
    const registrations = [createSWRegistration(1, pageUrl)];
    const versions = [createActiveWorker(1, swUrl, [], 'installing')];
    const activatedVersions = [createActiveWorker(1, swUrl, [], 'activated')];

    driver.on = driver.once = createMockOnceFn()
      .mockEvent('ServiceWorker.workerRegistrationUpdated', {registrations})
      .mockEvent('ServiceWorker.workerVersionUpdated', {versions});

    const assertPromise = driver.assertNoSameOriginServiceWorkerClients(pageUrl);
    const inspectable = makePromiseInspectable(assertPromise);

    // After receiving the empty versions the promise still shouldn't be resolved
    await flushAllTimersAndMicrotasks();
    expect(inspectable).not.toBeDone();

    // Use `findListener` instead of `mockEvent` so we can control exactly when the promise resolves
    // After we invoke the listener with the activated versions we expect the promise to have resolved
    const listener = driver.on.findListener('ServiceWorker.workerVersionUpdated');
    listener({versions: activatedVersions});
    await flushAllTimersAndMicrotasks();
    expect(inspectable).toBeDone();
    await assertPromise;
  });
});

describe('.goOnline', () => {
  beforeEach(() => {
    connectionStub.sendCommand = createMockSendCommandFn()
      .mockResponse('Network.enable')
      .mockResponse('Emulation.setCPUThrottlingRate')
      .mockResponse('Network.emulateNetworkConditions');
  });

  it('re-establishes previous throttling settings', async () => {
    await driver.goOnline({
      passConfig: {useThrottling: true},
      settings: {
        throttlingMethod: 'devtools',
        throttling: {
          requestLatencyMs: 500,
          downloadThroughputKbps: 1000,
          uploadThroughputKbps: 1000,
        },
      },
    });

    const emulateArgs = connectionStub.sendCommand
      .findInvocation('Network.emulateNetworkConditions');
    expect(emulateArgs).toEqual({
      offline: false,
      latency: 500,
      downloadThroughput: (1000 * 1024) / 8,
      uploadThroughput: (1000 * 1024) / 8,
    });
  });

  it('clears network emulation when throttling is not devtools', async () => {
    await driver.goOnline({
      passConfig: {useThrottling: true},
      settings: {
        throttlingMethod: 'provided',
      },
    });

    const emulateArgs = connectionStub.sendCommand
      .findInvocation('Network.emulateNetworkConditions');
    expect(emulateArgs).toEqual({
      offline: false,
      latency: 0,
      downloadThroughput: 0,
      uploadThroughput: 0,
    });
  });

  it('clears network emulation when useThrottling is false', async () => {
    await driver.goOnline({
      passConfig: {useThrottling: false},
      settings: {
        throttlingMethod: 'devtools',
        throttling: {
          requestLatencyMs: 500,
          downloadThroughputKbps: 1000,
          uploadThroughputKbps: 1000,
        },
      },
    });

    const emulateArgs = connectionStub.sendCommand
      .findInvocation('Network.emulateNetworkConditions');
    expect(emulateArgs).toEqual({
      offline: false,
      latency: 0,
      downloadThroughput: 0,
      uploadThroughput: 0,
    });
  });
});

describe('.clearDataForOrigin', () => {
  it('only clears data from certain locations', async () => {
    let foundStorageTypes;
    connectionStub.sendCommand = createMockSendCommandFn()
      .mockResponse('Storage.clearDataForOrigin', ({storageTypes}) => {
        foundStorageTypes = storageTypes;
      });
    await driver.clearDataForOrigin('https://example.com');
    // Should not see cookies, websql, indexeddb, or local_storage.
    // Cookies are not cleared to preserve login.
    // websql, indexeddb, and local_storage are not cleared to preserve important user data.
    expect(foundStorageTypes).toMatchInlineSnapshot(
      `"appcache,file_systems,shader_cache,service_workers,cache_storage"`
    );
  });
});

describe('.getImportantDataWarning', () => {
  it('properly returns warning', async () => {
    connectionStub.sendCommand = createMockSendCommandFn()
      .mockResponse('Storage.getUsageAndQuota', {usageBreakdown: [
        {storageType: 'local_storage', usage: 5},
        {storageType: 'indexeddb', usage: 5},
        {storageType: 'websql', usage: 0},
        {storageType: 'appcache', usage: 5},
        {storageType: 'cookies', usage: 5},
        {storageType: 'file_systems', usage: 5},
        {storageType: 'shader_cache', usage: 5},
        {storageType: 'service_workers', usage: 5},
        {storageType: 'cache_storage', usage: 0},
      ]});
    const warning = await driver.getImportantStorageWarning('https://example.com');
    expect(warning).toBeDisplayString(
      'There may be stored data affecting loading performance in ' +
      'these locations: Local Storage, IndexedDB. ' +
      'Audit this page in an incognito window to prevent those resources ' +
      'from affecting your scores.'
    );
  });

  it('only warn for certain locations', async () => {
    connectionStub.sendCommand = createMockSendCommandFn()
      .mockResponse('Storage.getUsageAndQuota', {usageBreakdown: [
        {storageType: 'local_storage', usage: 0},
        {storageType: 'indexeddb', usage: 0},
        {storageType: 'websql', usage: 0},
        {storageType: 'appcache', usage: 5},
        {storageType: 'cookies', usage: 5},
        {storageType: 'file_systems', usage: 5},
        {storageType: 'shader_cache', usage: 5},
        {storageType: 'service_workers', usage: 5},
        {storageType: 'cache_storage', usage: 5},
      ]});
    const warning = await driver.getImportantStorageWarning('https://example.com');
    expect(warning).toBeUndefined();
  });
});

describe('Domain.enable/disable State', () => {
  it('dedupes (simple)', async () => {
    connectionStub.sendCommand = createMockSendCommandFn()
      .mockResponse('Network.enable')
      .mockResponse('Network.disable')
      .mockResponse('Fetch.enable')
      .mockResponse('Fetch.disable');

    await driver.sendCommand('Network.enable');
    await driver.sendCommand('Network.enable');
    expect(connectionStub.sendCommand).toHaveBeenCalledTimes(1);

    await driver.sendCommand('Network.disable');
    expect(connectionStub.sendCommand).toHaveBeenCalledTimes(1);
    // Network still has one enable.

    await driver.sendCommand('Fetch.enable');
    expect(connectionStub.sendCommand).toHaveBeenCalledTimes(2);

    await driver.sendCommand('Network.disable');
    expect(connectionStub.sendCommand).toHaveBeenCalledTimes(3);
    // Network is now disabled.

    await driver.sendCommand('Fetch.disable');
    expect(connectionStub.sendCommand).toHaveBeenCalledTimes(4);
  });

  it('dedupes (sessions)', async () => {
    connectionStub.sendCommand = createMockSendCommandFn()
      .mockResponse('Network.enable')
      .mockResponseToSession('Network.enable', '123')
      .mockResponse('Network.disable')
      .mockResponseToSession('Network.disable', '123');

    await driver.sendCommand('Network.enable');
    await driver.sendCommandToSession('Network.enable', '123');
    expect(connectionStub.sendCommand).toHaveBeenCalledTimes(2);

    await driver.sendCommand('Network.enable');
    await driver.sendCommandToSession('Network.enable', '123');
    expect(connectionStub.sendCommand).toHaveBeenCalledTimes(2);

    await driver.sendCommandToSession('Network.disable', '123');
    expect(connectionStub.sendCommand).toHaveBeenCalledTimes(2);

    await driver.sendCommand('Network.disable');
    expect(connectionStub.sendCommand).toHaveBeenCalledTimes(2);

    await driver.sendCommandToSession('Network.disable', '123');
    expect(connectionStub.sendCommand).toHaveBeenCalledTimes(3);

    await driver.sendCommand('Network.disable');
    expect(connectionStub.sendCommand).toHaveBeenCalledTimes(4);
  });
});

describe('Multi-target management', () => {
  it('enables the Network domain for iframes', async () => {
    connectionStub.sendCommand = createMockSendCommandFn()
      .mockResponseToSession('Network.enable', '123')
      .mockResponseToSession('Target.setAutoAttach', '123')
      .mockResponseToSession('Runtime.runIfWaitingForDebugger', '123');

    driver._eventEmitter.emit('Target.attachedToTarget', {
      sessionId: '123',
      // @ts-expect-error: Ignore partial targetInfo.
      targetInfo: {type: 'iframe'},
    });
    await flushAllTimersAndMicrotasks();

    expect(connectionStub.sendCommand).toHaveBeenNthCalledWith(1, 'Network.enable', '123');
    expect(connectionStub.sendCommand)
      .toHaveBeenNthCalledWith(2, 'Target.setAutoAttach', '123', expect.anything());
    expect(connectionStub.sendCommand)
      .toHaveBeenNthCalledWith(3, 'Runtime.runIfWaitingForDebugger', '123');
  });

  it('ignores other target types, but still resumes them', async () => {
    connectionStub.sendCommand = createMockSendCommandFn()
      .mockResponse('Target.sendMessageToTarget');

    driver._eventEmitter.emit('Target.attachedToTarget', {
      sessionId: 'SW1',
      // @ts-expect-error: Ignore partial targetInfo.
      targetInfo: {type: 'service_worker'},
    });
    await flushAllTimersAndMicrotasks();

    expect(connectionStub.sendCommand)
      .toHaveBeenNthCalledWith(1, 'Runtime.runIfWaitingForDebugger', 'SW1');
  });
});
