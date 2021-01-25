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

/**
 * @fileoverview Mock fraggle rock driver for testing.
 */

/** @typedef {import('../../../fraggle-rock/gather/driver.js')} Driver */
/** @typedef {import('../../../gather/driver/execution-context.js')} ExecutionContext */

function createMockSession() {
  return {
    sendCommand: createMockSendCommandFn({useSessionId: false}),
    once: createMockOnceFn(),
    on: createMockOnFn(),
    off: jest.fn(),
  };
}

function createMockPage() {
  return {
    goto: jest.fn(),
    target: () => ({createCDPSession: () => createMockSession()}),

    /** @return {import('puppeteer').Page} */
    asPage() {
      // @ts-expect-error - We'll rely on the tests passing to know this matches.
      return this;
    },
  };
}

function createMockExecutionContext() {
  const context = /** @type {ExecutionContext} */ ({});
  return {...context, evaluate: jest.fn(), evaluateAsync: jest.fn()};
}

function createMockDriver() {
  const session = createMockSession();
  const context = createMockExecutionContext();

  return {
    _page: createMockPage(),
    _executionContext: context,
    _session: session,
    defaultSession: session,
    connect: jest.fn(),
    evaluate: context.evaluate,
    evaluateAsync: context.evaluateAsync,

    /** @return {Driver} */
    asDriver() {
      // @ts-expect-error - We'll rely on the tests passing to know this matches.
      return this;
    },
  };
}

module.exports = {
  createMockDriver,
  createMockPage,
  createMockSession,
};
