/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Driver = require('../../../fraggle-rock/gather/driver.js');

/* eslint-env jest */

/** @type {Array<keyof LH.Gatherer.FRProtocolSession>} */
const DELEGATED_FUNCTIONS = [
  'hasNextProtocolTimeout',
  'getNextProtocolTimeout',
  'setNextProtocolTimeout',
  'on',
  'off',
  'sendCommand',
];

/** @type {import('puppeteer').Page} */
let page;
/** @type {import('puppeteer').Target} */
let pageTarget;
/** @type {import('puppeteer').CDPSession} */
let puppeteerSession;
/** @type {Driver} */
let driver;

beforeEach(() => {
  // @ts-expect-error - Individual mock functions are applied as necessary.
  page = {target: () => pageTarget};
  // @ts-expect-error - Individual mock functions are applied as necessary.
  pageTarget = {createCDPSession: () => puppeteerSession};
  // @ts-expect-error - Individual mock functions are applied as necessary.
  puppeteerSession = {on: jest.fn(), off: jest.fn(), send: jest.fn()};
  driver = new Driver(page);
});

for (const fnName of DELEGATED_FUNCTIONS) {
  describe(fnName, () => {
    it('should fail if called before connect', () => {
      expect(driver.defaultSession[fnName]).toThrow(/not connected/);
    });

    it('should use connected session for default', async () => {
      await driver.connect();
      if (!driver._session) throw new Error('Driver did not connect');

      /** @type {any} */
      const args = [1, {arg: 2}];
      const returnValue = {foo: 'bar'};
      driver._session[fnName] = jest.fn().mockReturnValue(returnValue);
      // @ts-expect-error - typescript can't handle this union type.
      const actualResult = driver.defaultSession[fnName](...args);
      expect(driver._session[fnName]).toHaveBeenCalledWith(...args);
      expect(actualResult).toEqual(returnValue);
    });
  });
}

describe('.evaluateAsync', () => {
  it('should fail if called before connect', async () => {
    await expect(driver.evaluateAsync('1 + 1')).rejects.toBeTruthy();
  });

  it('should delegate to execution context', async () => {
    await driver.connect();
    if (!driver._executionContext) throw new Error('Runtime did not connect');

    const returnValue = 2;
    const evaluateAsyncMock = driver._executionContext.evaluateAsync =
      jest.fn().mockReturnValue(returnValue);

    const actualResult = await driver.evaluateAsync('1 + 1', {useIsolation: true});
    expect(evaluateAsyncMock).toHaveBeenCalledWith('1 + 1', {useIsolation: true});
    expect(actualResult).toEqual(returnValue);
  });
});
