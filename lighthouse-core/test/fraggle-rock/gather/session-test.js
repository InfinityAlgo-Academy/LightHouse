/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const ProtocolSession = require('../../../fraggle-rock/gather/session.js');

/* eslint-env jest */

describe('ProtocolSession', () => {
  /** @type {import('puppeteer').CDPSession} */
  let puppeteerSession;
  /** @type {ProtocolSession} */
  let session;

  beforeEach(() => {
    // @ts-expect-error - Individual mock functions are applied as necessary.
    puppeteerSession = {};
    session = new ProtocolSession(puppeteerSession);
  });

  /** @type {Array<'on'|'off'|'once'>} */
  const delegateMethods = ['on', 'once', 'off'];
  for (const method of delegateMethods) {
    describe(`.${method}`, () => {
      it('delegates to puppeteer', async () => {
        const puppeteerFn = puppeteerSession[method] = jest.fn();
        const callback = () => undefined;

        session[method]('Page.frameNavigated', callback);
        expect(puppeteerFn).toHaveBeenCalledWith('Page.frameNavigated', callback);
      });
    });
  }

  describe('.sendCommand', () => {
    it('delegates to puppeteer', async () => {
      const send = puppeteerSession.send = jest.fn().mockResolvedValue(123);

      const result = await session.sendCommand('Page.navigate', {url: 'foo'});
      expect(result).toEqual(123);
      expect(send).toHaveBeenCalledWith('Page.navigate', {url: 'foo'});
    });
  });
});
