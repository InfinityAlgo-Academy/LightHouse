/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const ExecutionContext = require('../../../gather/driver/execution-context.js');
const {
  createMockSendCommandFn: createMockSendCommandFn_,
  makePromiseInspectable,
  flushAllTimersAndMicrotasks,
} = require('../../test-utils.js');

/* eslint-env jest */

jest.useFakeTimers();

// This can be removed when FR becomes the default.
const createMockSendCommandFn = createMockSendCommandFn_.bind(null, {useSessionId: false});

/** @return {LH.Gatherer.FRProtocolSession} */
function createMockSession() {
  const session = /** @type {*} */ ({});
  session.hasNextProtocolTimeout = jest.fn().mockReturnValue(false);
  session.setNextProtocolTimeout = jest.fn();
  return session;
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
        .mockResponse('Page.getResourceTree', {frameTree: {frame: {id: '1337'}}})
        .mockResponse('Page.createIsolatedWorld', {executionContextId})
        .mockResponse('Runtime.evaluate', {result: {value: 2}});

      await executionContext.evaluateAsync('1 + 1', {useIsolation: true});
    };
  });

  it('should clear context on frame navigations', async () => {
    const onMock = sessionMock.on = jest.fn();

    const executionContext = new ExecutionContext(sessionMock);

    const frameListener = onMock.mock.calls.find(call => call[0] === 'Page.frameNavigated');
    expect(frameListener).toBeDefined();

    await forceNewContextId(executionContext, 42);
    expect(executionContext.getContextId()).toEqual(42);
    frameListener[1]();
    expect(executionContext.getContextId()).toEqual(undefined);
  });

  it('should clear context on execution context destroyed', async () => {
    const onMock = sessionMock.on = jest.fn();

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
});

describe('.evaluateAsync', () => {
  /** @type {LH.Gatherer.FRProtocolSession} */
  let sessionMock;
  /** @type {ExecutionContext} */
  let executionContext;

  beforeEach(() => {
    sessionMock = createMockSession();
    sessionMock.on = jest.fn();
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
    const setNextProtocolTimeout = sessionMock.setNextProtocolTimeout = jest.fn();
    sessionMock.hasNextProtocolTimeout = jest.fn().mockReturnValue(false);
    sessionMock.sendCommand = createMockSendCommandFn().mockRejectedValue(new Error('Timeout'));

    const evaluatePromise = makePromiseInspectable(executionContext.evaluateAsync('1 + 1'));

    await flushAllTimersAndMicrotasks();
    expect(setNextProtocolTimeout).toHaveBeenCalledWith(60000);
    expect(evaluatePromise).toBeDone();
    await expect(evaluatePromise).rejects.toBeTruthy();
  });

  it('uses the specific timeout given', async () => {
    const expectedTimeout = 5000;
    const setNextProtocolTimeout = sessionMock.setNextProtocolTimeout = jest.fn();
    sessionMock.hasNextProtocolTimeout = jest.fn().mockReturnValue(true);
    sessionMock.getNextProtocolTimeout = jest.fn().mockReturnValue(expectedTimeout);
    sessionMock.sendCommand = createMockSendCommandFn().mockRejectedValue(new Error('Timeout'));

    const evaluatePromise = makePromiseInspectable(executionContext.evaluateAsync('1 + 1'));

    await flushAllTimersAndMicrotasks();
    expect(setNextProtocolTimeout).toHaveBeenCalledWith(expectedTimeout);
    expect(evaluatePromise).toBeDone();
    await expect(evaluatePromise).rejects.toBeTruthy();
  });

  it('evaluates an expression in isolation', async () => {
    let sendCommand = (sessionMock.sendCommand = createMockSendCommandFn()
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
      .mockResponse('Page.getResourceTree', {frameTree: {frame: {id: '1337'}}})
      .mockResponse('Page.createIsolatedWorld', {executionContextId: 9001})
      .mockResponse('Runtime.evaluate', Promise.reject(new Error('Cannot find context')))
      .mockResponse('Page.getResourceTree', {frameTree: {frame: {id: '1337'}}})
      .mockResponse('Page.createIsolatedWorld', {executionContextId: 9002})
      .mockResponse('Runtime.evaluate', {result: {value: 'mocked value'}});

    const value = await executionContext.evaluateAsync('"magic"', {useIsolation: true});
    expect(value).toEqual('mocked value');
  });
});
