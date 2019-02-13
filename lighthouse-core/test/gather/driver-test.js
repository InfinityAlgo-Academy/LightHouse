/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Driver = require('../../gather/driver.js');
const Connection = require('../../gather/connections/connection.js');
const Element = require('../../lib/element.js');
const assert = require('assert');
const EventEmitter = require('events').EventEmitter;
const {protocolGetVersionResponse} = require('./fake-driver');

const redirectDevtoolsLog = require('../fixtures/wikipedia-redirect.devtoolslog.json');
const MAX_WAIT_FOR_PROTOCOL = 20;

function createOnceStub(events) {
  return (eventName, cb) => {
    if (events[eventName]) {
      // wait a tick b/c real events never fire immediately
      setTimeout(_ => cb(events[eventName]), 0);
      return;
    }

    throw Error(`Stub not implemented: ${eventName}`);
  };
}

/**
 * Creates a jest mock function whose implementation consumes mocked protocol responses matching the
 * requested command in the order they were mocked.
 *
 * It is decorated with two methods:
 *    - `mockResponse` which pushes protocol message responses for consumption
 *    - `findInvocation` which asserts that `sendCommand` was invoked with the given command and
 *      returns the protocol message argument.
 */
function createMockSendCommandFn() {
  const mockResponses = [];
  const mockFn = jest.fn().mockImplementation(command => {
    const indexOfResponse = mockResponses.findIndex(entry => entry.command === command);
    if (indexOfResponse === -1) throw new Error(`${command} unimplemented`);
    const {response} = mockResponses[indexOfResponse];
    mockResponses.splice(indexOfResponse, 1);
    return Promise.resolve(response);
  });

  mockFn.mockResponse = (command, response) => {
    mockResponses.push({command, response});
    return mockFn;
  };

  mockFn.findInvocation = command => {
    expect(mockFn).toHaveBeenCalledWith(command, expect.anything());
    return mockFn.mock.calls.find(call => call[0] === command)[1];
  };

  return mockFn;
}

function sendCommandOldStub(command, params) {
  switch (command) {
    case 'Browser.getVersion':
      return Promise.resolve(protocolGetVersionResponse);
    case 'DOM.getDocument':
      return Promise.resolve({root: {nodeId: 249}});
    case 'DOM.querySelector':
      return Promise.resolve({
        nodeId: params.selector === 'invalid' ? 0 : 231,
      });
    case 'DOM.querySelectorAll':
      return Promise.resolve({
        nodeIds: params.selector === 'invalid' ? [] : [231],
      });
    case 'Runtime.evaluate':
      return Promise.resolve({result: {value: 123}});
    case 'Runtime.getProperties':
      return Promise.resolve({
        result: params.objectId === 'invalid' ? [] : [{
          name: 'test',
          value: {
            value: '123',
          },
        },
          {
            name: 'novalue',
          },
        ],
      });
    case 'Page.getResourceTree':
      return Promise.resolve({frameTree: {frame: {id: 1}}});
    case 'Page.createIsolatedWorld':
      return Promise.resolve({executionContextId: 1});
    case 'Network.getResponseBody':
      return new Promise(res => setTimeout(res, MAX_WAIT_FOR_PROTOCOL + 20));
    case 'Page.enable':
    case 'Page.navigate':
    case 'Page.setLifecycleEventsEnabled':
    case 'Network.enable':
    case 'Tracing.start':
    case 'ServiceWorker.enable':
    case 'ServiceWorker.disable':
    case 'Security.enable':
    case 'Security.disable':
    case 'Network.setExtraHTTPHeaders':
    case 'Network.emulateNetworkConditions':
    case 'Emulation.setCPUThrottlingRate':
    case 'Emulation.setScriptExecutionDisabled':
      return Promise.resolve({});
    case 'Tracing.end':
      return Promise.reject(new Error('tracing not started'));
    default:
      throw Error(`Stub not implemented: ${command}`);
  }
}

/* eslint-env jest */

let driver;
let connectionStub;

beforeEach(() => {
  connectionStub = new Connection();
  connectionStub.sendCommand = sendCommandOldStub;
  driver = new Driver(connectionStub);
});

describe('.querySelector(All)', () => {
  it('returns null when DOM.querySelector finds no node', () => {
    return driver.querySelector('invalid').then(value => {
      assert.equal(value, null);
    });
  });

  it('returns element when DOM.querySelector finds node', () => {
    return driver.querySelector('meta head').then(value => {
      assert.equal(value instanceof Element, true);
    });
  });

  it('returns [] when DOM.querySelectorAll finds no node', () => {
    return driver.querySelectorAll('invalid').then(value => {
      assert.deepEqual(value, []);
    });
  });

  it('returns element when DOM.querySelectorAll finds node', () => {
    return driver.querySelectorAll('a').then(value => {
      assert.equal(value.length, 1);
      assert.equal(value[0] instanceof Element, true);
    });
  });
});

describe('.getObjectProperty', () => {
  it('returns value when getObjectProperty finds property name', () => {
    return driver.getObjectProperty('test', 'test').then(value => {
      assert.deepEqual(value, 123);
    });
  });

  it('returns null when getObjectProperty finds no property name', () => {
    return driver.getObjectProperty('invalid', 'invalid').then(value => {
      assert.deepEqual(value, null);
    });
  });

  it('returns null when getObjectProperty finds property name with no value', () => {
    return driver.getObjectProperty('test', 'novalue').then(value => {
      assert.deepEqual(value, null);
    });
  });
});

describe('.getRequestContent', () => {
  it('throws if getRequestContent takes too long', () => {
    return driver.getRequestContent('', MAX_WAIT_FOR_PROTOCOL).then(
      _ => {
        assert.ok(false, 'long-running getRequestContent supposed to reject');
      },
      e => {
        assert.equal(e.code, 'PROTOCOL_TIMEOUT');
        expect(e.friendlyMessage).toBeDisplayString(
          /^Waiting for DevTools.*Method: Network.getResponseBody/
        );
      }
    );
  });
});

describe('.evaluateAsync', () => {
  it('evaluates an expression', async () => {
    connectionStub.sendCommand = createMockSendCommandFn()
      .mockResponse('Runtime.evaluate', {result: {value: 2}});

    const value = await driver.evaluateAsync('1 + 1');
    expect(value).toEqual(2);
    connectionStub.sendCommand.findInvocation('Runtime.evaluate');
  });

  it('evaluates an expression in isolation', async () => {
    connectionStub.sendCommand = createMockSendCommandFn()
      .mockResponse('Page.getResourceTree', {frameTree: {frame: {id: 1337}}})
      .mockResponse('Page.createIsolatedWorld', {executionContextId: 1})
      .mockResponse('Runtime.evaluate', {result: {value: 2}});

    const value = await driver.evaluateAsync('1 + 1', {useIsolation: true});
    expect(value).toEqual(2);

    // Check that we used the correct frame when creating the isolated context
    const createWorldArgs = connectionStub.sendCommand.findInvocation('Page.createIsolatedWorld');
    expect(createWorldArgs).toMatchObject({frameId: 1337});

    // Check that we used the isolated context when evaluating
    const evaluateArgs = connectionStub.sendCommand.findInvocation('Runtime.evaluate');
    expect(evaluateArgs).toMatchObject({contextId: 1});

    // Make sure we cached the isolated context from last time
    connectionStub.sendCommand = createMockSendCommandFn().mockResponse(
      'Runtime.evaluate',
      {result: {value: 2}}
    );
    await driver.evaluateAsync('1 + 1', {useIsolation: true});
    expect(connectionStub.sendCommand).not.toHaveBeenCalledWith(
      'Page.createIsolatedWorld',
      expect.anything()
    );
  });
});

describe('.sendCommand', () => {
  it('.sendCommand timesout when commands take too long', async () => {
    class SlowConnection extends EventEmitter {
      connect() {
        return Promise.resolve();
      }
      disconnect() {
        return Promise.resolve();
      }
      sendCommand() {
        return new Promise(resolve => setTimeout(resolve, 15));
      }
    }
    const slowConnection = new SlowConnection();
    const driver = new Driver(slowConnection);
    driver.setNextProtocolTimeout(25);
    await driver.sendCommand('Page.enable');

    driver.setNextProtocolTimeout(5);
    try {
      await driver.sendCommand('Page.disable');
      assert.fail('expected driver.sendCommand to timeout');
    } catch (err) {
      assert.equal(err.code, 'PROTOCOL_TIMEOUT');
    }
  });
});

describe('.beginTrace', () => {
  beforeEach(() => {
    connectionStub.sendCommand = createMockSendCommandFn()
      .mockResponse('Browser.getVersion', protocolGetVersionResponse)
      .mockResponse('Page.enable', {})
      .mockResponse('Tracing.start', {});
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
      .mockResponse('Page.enable', {})
      .mockResponse('Tracing.start', {});

    await driver.beginTrace();

    const tracingStartArgs = connectionStub.sendCommand.findInvocation('Tracing.start');
    // m70 doesn't have disabled-by-default-lighthouse, so 'toplevel' is used instead.
    expect(tracingStartArgs.categories).toContain('toplevel');
    expect(tracingStartArgs.categories).not.toContain('disabled-by-default-lighthouse');
  });
});

describe('.setExtraHTTPHeaders', () => {
  it('should Network.setExtraHTTPHeaders when there are extra-headers', async () => {
    connectionStub.sendCommand = createMockSendCommandFn().mockResponse(
      'Network.setExtraHTTPHeaders',
      {}
    );

    await driver.setExtraHTTPHeaders({
      'Cookie': 'monster',
      'x-men': 'wolverine',
    });

    expect(connectionStub.sendCommand).toHaveBeenCalledWith(
      'Network.setExtraHTTPHeaders',
      expect.anything()
    );
  });

  it('should Network.setExtraHTTPHeaders when there are extra-headers', async () => {
    connectionStub.sendCommand = createMockSendCommandFn();
    await driver.setExtraHTTPHeaders();

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
      .mockResponse('Network.enable', {})
      .mockResponse('Network.emulateNetworkConditions', {});

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
  it('will track redirects through gotoURL load', () => {
    const delay = _ => new Promise(resolve => setTimeout(resolve));

    class ReplayConnection extends EventEmitter {
      connect() {
        return Promise.resolve();
      }
      disconnect() {
        return Promise.resolve();
      }
      replayLog() {
        redirectDevtoolsLog.forEach(msg => this.emit('protocolevent', msg));
      }
      sendCommand(method) {
        const resolve = Promise.resolve();

        // If navigating, wait, then replay devtools log in parallel to resolve.
        if (method === 'Page.navigate') {
          resolve.then(delay).then(_ => this.replayLog());
        }

        return resolve;
      }
    }
    const replayConnection = new ReplayConnection();
    const driver = new Driver(replayConnection);

    // Redirect in log will go through
    const startUrl = 'http://en.wikipedia.org/';
    // then https://en.wikipedia.org/
    // then https://en.wikipedia.org/wiki/Main_Page
    const finalUrl = 'https://en.m.wikipedia.org/wiki/Main_Page';

    const loadOptions = {
      waitForLoad: true,
      passContext: {
        passConfig: {
          networkQuietThresholdMs: 1,
        },
      },
    };

    return driver.gotoURL(startUrl, loadOptions).then(loadedUrl => {
      assert.equal(loadedUrl, finalUrl);
    });
  });

  describe('when waitForNavigated', () => {});

  describe('when waitForLoad', () => {
    it('does not reject when page is secure', async () => {
      const secureSecurityState = {
        explanations: [],
        securityState: 'secure',
      };
      driver.on = driver.once = createOnceStub({
        'Security.securityStateChanged': secureSecurityState,
        'Page.loadEventFired': {},
        'Page.domContentEventFired': {},
      });

      const startUrl = 'https://www.example.com';
      const loadOptions = {
        waitForLoad: true,
        passContext: {
          passConfig: {
            networkQuietThresholdMs: 1,
          },
          settings: {
            maxWaitForLoad: 1,
          },
        },
      };
      await driver.gotoURL(startUrl, loadOptions);
    });

    it('rejects when page is insecure', async () => {
      const insecureSecurityState = {
        explanations: [
          {
            description: 'reason 1.',
            securityState: 'insecure',
          },
          {
            description: 'blah.',
            securityState: 'info',
          },
          {
            description: 'reason 2.',
            securityState: 'insecure',
          },
        ],
        securityState: 'insecure',
      };
      driver.on = createOnceStub({
        'Security.securityStateChanged': insecureSecurityState,
      });

      const startUrl = 'https://www.example.com';
      const loadOptions = {
        waitForLoad: true,
        passContext: {
          passConfig: {
            networkQuietThresholdMs: 1,
          },
        },
      };

      try {
        await driver.gotoURL(startUrl, loadOptions);
        assert.fail('security check should have rejected');
      } catch (err) {
        assert.equal(err.message, 'INSECURE_DOCUMENT_REQUEST');
        assert.equal(err.code, 'INSECURE_DOCUMENT_REQUEST');
        /* eslint-disable-next-line max-len */
        expect(err.friendlyMessage).toBeDisplayString(
          'The URL you have provided does not have valid security credentials. reason 1. reason 2.'
        );
      }
    });
  });
});

describe('.assertNoSameOriginServiceWorkerClients', () => {
  function createSWRegistration(id, url, isDeleted) {
    return {
      isDeleted: !!isDeleted,
      registrationId: id,
      scopeURL: url,
    };
  }

  function createActiveWorker(id, url, controlledClients, status = 'activated') {
    return {
      registrationId: id,
      scriptURL: url,
      controlledClients,
      status,
    };
  }

  it('will pass if there are no current service workers', () => {
    const pageUrl = 'https://example.com/';
    driver.once = createOnceStub({
      'ServiceWorker.workerRegistrationUpdated': {
        registrations: [],
      },
    });

    driver.on = createOnceStub({
      'ServiceWorker.workerVersionUpdated': {
        versions: [],
      },
    });

    return driver.assertNoSameOriginServiceWorkerClients(pageUrl);
  });

  it('will pass if there is an active service worker for a different origin', () => {
    const pageUrl = 'https://example.com/';
    const secondUrl = 'https://example.edu';
    const swUrl = `${secondUrl}sw.js`;

    const registrations = [createSWRegistration(1, secondUrl)];
    const versions = [createActiveWorker(1, swUrl, ['uniqueId'])];

    driver.once = createOnceStub({
      'ServiceWorker.workerRegistrationUpdated': {
        registrations,
      },
    });

    driver.on = createOnceStub({
      'ServiceWorker.workerVersionUpdated': {
        versions,
      },
    });

    return driver.assertNoSameOriginServiceWorkerClients(pageUrl);
  });

  it('will fail if a service worker with a matching origin has a controlled client', () => {
    const pageUrl = 'https://example.com/';
    const swUrl = `${pageUrl}sw.js`;
    const registrations = [createSWRegistration(1, pageUrl)];
    const versions = [createActiveWorker(1, swUrl, ['uniqueId'])];

    driver.once = createOnceStub({
      'ServiceWorker.workerRegistrationUpdated': {
        registrations,
      },
    });

    driver.on = createOnceStub({
      'ServiceWorker.workerVersionUpdated': {
        versions,
      },
    });

    return driver.assertNoSameOriginServiceWorkerClients(pageUrl).then(
      _ => assert.ok(false),
      err => {
        assert.ok(err.message.toLowerCase().includes('multiple tabs'));
      }
    );
  });

  it('will succeed if a service worker with a matching origin has no controlled clients', () => {
    const pageUrl = 'https://example.com/';
    const swUrl = `${pageUrl}sw.js`;
    const registrations = [createSWRegistration(1, pageUrl)];
    const versions = [createActiveWorker(1, swUrl, [])];

    driver.once = createOnceStub({
      'ServiceWorker.workerRegistrationUpdated': {
        registrations,
      },
    });

    driver.on = createOnceStub({
      'ServiceWorker.workerVersionUpdated': {
        versions,
      },
    });

    return driver.assertNoSameOriginServiceWorkerClients(pageUrl);
  });

  it('will wait for serviceworker to be activated', () => {
    const pageUrl = 'https://example.com/';
    const swUrl = `${pageUrl}sw.js`;
    const registrations = [createSWRegistration(1, pageUrl)];
    const versions = [createActiveWorker(1, swUrl, [], 'installing')];

    driver.once = createOnceStub({
      'ServiceWorker.workerRegistrationUpdated': {
        registrations,
      },
    });

    driver.on = (eventName, cb) => {
      if (eventName === 'ServiceWorker.workerVersionUpdated') {
        cb({versions});

        setTimeout(() => {
          cb({
            versions: [createActiveWorker(1, swUrl, [], 'activated')],
          });
        }, 1000);

        return;
      }

      throw Error(`Stub not implemented: ${eventName}`);
    };

    return driver.assertNoSameOriginServiceWorkerClients(pageUrl);
  });
});

describe('.goOnline', () => {
  beforeEach(() => {
    connectionStub.sendCommand = createMockSendCommandFn()
      .mockResponse('Network.enable', {})
      .mockResponse('Emulation.setCPUThrottlingRate', {})
      .mockResponse('Network.emulateNetworkConditions', {});
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
