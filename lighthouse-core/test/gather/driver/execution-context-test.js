/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */


/* eslint-env jest */

import {jest} from '@jest/globals';

import ExecutionContext from '../../../gather/driver/execution-context.js';
import {
  mockCommands,
  makePromiseInspectable,
  flushAllTimersAndMicrotasks,
  fnAny,
} from '../../test-utils.js';

jest.useFakeTimers();

// This can be removed when FR becomes the default.
const createMockSendCommandFn =
  mockCommands.createMockSendCommandFn.bind(null, {useSessionId: false});

/** @return {LH.Gatherer.FRProtocolSession} */
function createMockSession() {
  /** @type {any} */
  const session = {};
  session.hasNextProtocolTimeout = fnAny().mockReturnValue(false);
  session.setNextProtocolTimeout = fnAny();
  return session;
}

/** @param {string} s */
function trimTrailingWhitespace(s) {
  return s.split('\n').map(line => line.trimEnd()).join('\n');
}

describe('ExecutionContext', () => {
  /** @type {LH.Gatherer.FRProtocolSession} */
  let sessionMock;
  /** @type {(executionContext: ExecutionContext, id: number) => Promise<void>} */
  let forceNewContextId;

  beforeEach(() => {
    sessionMock = createMockSession();

    forceNewContextId = async (executionContext, executionContextId) => {
      executionContext._session.sendCommand = createMockSendCommandFn()
        .mockResponse('Page.enable')
        .mockResponse('Runtime.enable')
        .mockResponse('Page.getResourceTree', {frameTree: {frame: {id: '1337'}}})
        .mockResponse('Page.createIsolatedWorld', {executionContextId})
        .mockResponse('Runtime.evaluate', {result: {value: 2}});

      await executionContext.evaluateAsync('1 + 1', {useIsolation: true});
    };
  });

  it('should clear context on frame navigations', async () => {
    const onMock = sessionMock.on = fnAny();

    const executionContext = new ExecutionContext(sessionMock);

    const frameListener = onMock.mock.calls.find(call => call[0] === 'Page.frameNavigated');
    expect(frameListener).toBeDefined();

    await forceNewContextId(executionContext, 42);
    expect(executionContext.getContextId()).toEqual(42);
    frameListener[1]();
    expect(executionContext.getContextId()).toEqual(undefined);
  });

  it('should clear context on execution context destroyed', async () => {
    const onMock = sessionMock.on = fnAny();

    const executionContext = new ExecutionContext(sessionMock);

    const executionDestroyed = onMock.mock.calls
      .find(call => call[0] === 'Runtime.executionContextDestroyed');
    expect(executionDestroyed).toBeDefined();

    await forceNewContextId(executionContext, 42);
    expect(executionContext.getContextId()).toEqual(42);
    executionDestroyed[1]({executionContextId: 51});
    expect(executionContext.getContextId()).toEqual(42);
    executionDestroyed[1]({executionContextId: 42});
    expect(executionContext.getContextId()).toEqual(undefined);
  });

  it.todo('should cache native objects in page');
});

describe('.evaluateAsync', () => {
  /** @type {LH.Gatherer.FRProtocolSession} */
  let sessionMock;
  /** @type {ExecutionContext} */
  let executionContext;

  beforeEach(() => {
    sessionMock = createMockSession();
    sessionMock.on = fnAny();
    executionContext = new ExecutionContext(sessionMock);
  });

  it('evaluates an expression', async () => {
    const sendCommand = (sessionMock.sendCommand = createMockSendCommandFn().mockResponse(
      'Runtime.evaluate',
      {result: {value: 2}}
    ));

    const value = await executionContext.evaluateAsync('1 + 1');
    expect(value).toEqual(2);
    sendCommand.findInvocation('Runtime.evaluate');
  });

  it('uses a high default timeout', async () => {
    const setNextProtocolTimeout = sessionMock.setNextProtocolTimeout = fnAny();
    sessionMock.hasNextProtocolTimeout = fnAny().mockReturnValue(false);
    sessionMock.sendCommand = createMockSendCommandFn().mockRejectedValue(new Error('Timeout'));

    const evaluatePromise = makePromiseInspectable(executionContext.evaluateAsync('1 + 1'));

    await flushAllTimersAndMicrotasks();
    expect(setNextProtocolTimeout).toHaveBeenCalledWith(60000);
    expect(evaluatePromise).toBeDone();
    await expect(evaluatePromise).rejects.toBeTruthy();
  });

  it('uses the specific timeout given', async () => {
    const expectedTimeout = 5000;
    const setNextProtocolTimeout = sessionMock.setNextProtocolTimeout = fnAny();
    sessionMock.hasNextProtocolTimeout = fnAny().mockReturnValue(true);
    sessionMock.getNextProtocolTimeout = fnAny().mockReturnValue(expectedTimeout);
    sessionMock.sendCommand = createMockSendCommandFn().mockRejectedValue(new Error('Timeout'));

    const evaluatePromise = makePromiseInspectable(executionContext.evaluateAsync('1 + 1'));

    await flushAllTimersAndMicrotasks();
    expect(setNextProtocolTimeout).toHaveBeenCalledWith(expectedTimeout);
    expect(evaluatePromise).toBeDone();
    await expect(evaluatePromise).rejects.toBeTruthy();
  });

  it('evaluates an expression in isolation', async () => {
    let sendCommand = (sessionMock.sendCommand = createMockSendCommandFn()
      .mockResponse('Page.enable')
      .mockResponse('Runtime.enable')
      .mockResponse('Page.getResourceTree', {frameTree: {frame: {id: '1337'}}})
      .mockResponse('Page.createIsolatedWorld', {executionContextId: 1})
      .mockResponse('Runtime.evaluate', {result: {value: 2}}));

    const value = await executionContext.evaluateAsync('1 + 1', {useIsolation: true});
    expect(value).toEqual(2);

    // Check that we used the correct frame when creating the isolated context
    const createWorldArgs = sendCommand.findInvocation('Page.createIsolatedWorld');
    expect(createWorldArgs).toMatchObject({frameId: '1337'});

    // Check that we used the isolated context when evaluating
    const evaluateArgs = sendCommand.findInvocation('Runtime.evaluate');
    expect(evaluateArgs).toMatchObject({contextId: 1});

    // Make sure we cached the isolated context from last time
    sendCommand = sessionMock.sendCommand = createMockSendCommandFn().mockResponse(
      'Runtime.evaluate',
      {result: {value: 2}}
    );
    await executionContext.evaluateAsync('1 + 1', {useIsolation: true});
    expect(sessionMock.sendCommand).not.toHaveBeenCalledWith(
      'Page.createIsolatedWorld',
      expect.anything()
    );
  });

  it('recovers from isolation failures', async () => {
    sessionMock.sendCommand = createMockSendCommandFn()
      .mockResponse('Page.enable')
      .mockResponse('Runtime.enable')
      .mockResponse('Page.getResourceTree', {frameTree: {frame: {id: '1337'}}})
      .mockResponse('Page.createIsolatedWorld', {executionContextId: 9001})
      .mockResponse('Runtime.evaluate', Promise.reject(new Error('Cannot find context')))
      .mockResponse('Page.enable')
      .mockResponse('Runtime.enable')
      .mockResponse('Page.getResourceTree', {frameTree: {frame: {id: '1337'}}})
      .mockResponse('Page.createIsolatedWorld', {executionContextId: 9002})
      .mockResponse('Runtime.evaluate', {result: {value: 'mocked value'}});

    const value = await executionContext.evaluateAsync('"magic"', {useIsolation: true});
    expect(value).toEqual('mocked value');
  });
});

describe('.evaluate', () => {
  /** @type {LH.Gatherer.FRProtocolSession} */
  let sessionMock;
  /** @type {ExecutionContext} */
  let executionContext;

  beforeEach(() => {
    sessionMock = createMockSession();
    sessionMock.on = fnAny();
    executionContext = new ExecutionContext(sessionMock);
  });

  it('transforms parameters into an expression given to Runtime.evaluate', async () => {
    const mockFn = sessionMock.sendCommand = createMockSendCommandFn()
      .mockResponse('Runtime.evaluate', {result: {value: 1}});

    /** @param {number} value */
    function main(value) {
      return value;
    }
    const value = await executionContext.evaluate(main, {args: [1]});
    expect(value).toEqual(1);

    const {expression} = mockFn.findInvocation('Runtime.evaluate');
    const expected = `
(function wrapInNativePromise() {
        const Promise = globalThis.__nativePromise || globalThis.Promise;
const URL = globalThis.__nativeURL || globalThis.URL;
const performance = globalThis.__nativePerformance || globalThis.performance;
const fetch = globalThis.__nativeFetch || globalThis.fetch;
        globalThis.__lighthouseExecutionContextId = undefined;
        return new Promise(function (resolve) {
          return Promise.resolve()
            .then(_ => (() => {

      return (function main(value) {
      return value;
    })(1);
    })())
            .catch(function wrapRuntimeEvalErrorInBrowser(err) {
  if (!err || typeof err === 'string') {
    err = new Error(err);
  }

  return {
    __failedInBrowser: true,
    name: err.name || 'Error',
    message: err.message || 'unknown error',
    stack: err.stack,
  };
})
            .then(resolve);
        });
      }())
      //# sourceURL=_lighthouse-eval.js`.trim();
    expect(trimTrailingWhitespace(expression)).toBe(trimTrailingWhitespace(expected));
    expect(await eval(expression)).toBe(1);
  });

  it('transforms parameters into an expression (basic)', async () => {
    // Mock so the argument can be intercepted, and the generated code
    // can be evaluated without the error catching code.
    const mockFn = executionContext._evaluateInContext = fnAny()
      .mockImplementation(() => Promise.resolve());

    /** @param {number} value */
    function mainFn(value) {
      return value;
    }
    /** @type {number} */
    const value = await executionContext.evaluate(mainFn, {args: [1]}); // eslint-disable-line no-unused-vars

    const code = mockFn.mock.calls[0][0];
    expect(trimTrailingWhitespace(code)).toBe(`(() => {

      return (function mainFn(value) {
      return value;
    })(1);
    })()`);
    expect(eval(code)).toEqual(1);
  });

  it('transforms parameters into an expression (arrows)', async () => {
    // Mock so the argument can be intercepted, and the generated code
    // can be evaluated without the error catching code.
    const mockFn = executionContext._evaluateInContext = fnAny()
      .mockImplementation(() => Promise.resolve());

    /** @param {number} value */
    const mainFn = (value) => {
      return value;
    };
    /** @type {number} */
    const value = await executionContext.evaluate(mainFn, {args: [1]}); // eslint-disable-line no-unused-vars

    const code = mockFn.mock.calls[0][0];
    expect(trimTrailingWhitespace(code)).toBe(`(() => {

      return ((value) => {
      return value;
    })(1);
    })()`);
    expect(eval(code)).toEqual(1);
  });

  it('transforms parameters into an expression (complex)', async () => {
    // Mock so the argument can be intercepted, and the generated code
    // can be evaluated without the error catching code.
    const mockFn = executionContext._evaluateInContext = fnAny()
      .mockImplementation(() => Promise.resolve());

    /**
     * @param {{a: number, b: number}} _
     * @param {any} passThru
     */
    function mainFn({a, b}, passThru) {
      return {a: abs(a), b: square(b), passThru};
    }
    /**
     * @param {number} val
     */
    function abs(val) {
      return Math.abs(val);
    }
    /**
     * @param {number} val
     */
    function square(val) {
      return val * val;
    }

    /** @type {{a: number, b: number, passThru: any}} */
    const value = await executionContext.evaluate(mainFn, { // eslint-disable-line no-unused-vars
      args: [{a: -5, b: 10}, 'hello'],
      deps: [abs, square],
    });

    const code = mockFn.mock.calls[0][0];
    expect(trimTrailingWhitespace(code)).toEqual(`(() => {
      function abs(val) {
      return Math.abs(val);
    }
function square(val) {
      return val * val;
    }
      return (function mainFn({a, b}, passThru) {
      return {a: abs(a), b: square(b), passThru};
    })({"a":-5,"b":10},"hello");
    })()`);
    expect(eval(code)).toEqual({a: 5, b: 100, passThru: 'hello'});
  });
});

describe('.serializeArguments', () => {
  it('should serialize a list of differently typed arguments', () => {
    const args = [undefined, 1, 'foo', null, {x: {y: {z: [2]}}}];
    expect(ExecutionContext.serializeArguments(args)).toEqual(
      `undefined,1,"foo",null,{"x":{"y":{"z":[2]}}}`
    );
  });
});
