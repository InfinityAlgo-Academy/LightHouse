/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const {EventEmitter} = require('events');
const ProtocolSession = require('../../../fraggle-rock/gather/session.js');

/* eslint-env jest */

describe('ProtocolSession', () => {
  /** @type {import('puppeteer').CDPSession} */
  let puppeteerSession;
  /** @type {ProtocolSession} */
  let session;

  beforeEach(() => {
    // @ts-expect-error - Individual mock functions are applied as necessary.
    puppeteerSession = {emit: jest.fn()};
    session = new ProtocolSession(puppeteerSession);
  });

  describe('ProtocolSession', () => {
    it('should emit a copy of events on "*"', () => {
      // @ts-expect-error - we want to use a more limited test of a real event emitter.
      puppeteerSession = new EventEmitter();
      session = new ProtocolSession(puppeteerSession);

      const regularListener = jest.fn();
      const allListener = jest.fn();

      puppeteerSession.on('Foo', regularListener);
      puppeteerSession.on('*', allListener);
      puppeteerSession.emit('Foo', 1, 2, 3);
      puppeteerSession.emit('Bar', 1, 2, 3);

      expect(regularListener).toHaveBeenCalledTimes(1);
      expect(allListener).toHaveBeenCalledTimes(2);
      expect(allListener).toHaveBeenCalledWith({method: 'Foo', params: [1, 2, 3]});
      expect(allListener).toHaveBeenCalledWith({method: 'Bar', params: [1, 2, 3]});
    });

    it('should not fire duplicate events', () => {
      // @ts-expect-error - we want to use a more limited test of a real event emitter.
      puppeteerSession = new EventEmitter();
      session = new ProtocolSession(puppeteerSession);
      session = new ProtocolSession(puppeteerSession);

      const regularListener = jest.fn();
      const allListener = jest.fn();

      puppeteerSession.on('Foo', regularListener);
      puppeteerSession.on('*', allListener);
      puppeteerSession.emit('Foo', 1, 2, 3);
      puppeteerSession.emit('Bar', 1, 2, 3);

      expect(regularListener).toHaveBeenCalledTimes(1);
      expect(allListener).toHaveBeenCalledTimes(2);
    });
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

  describe('.onAnyProtocolMessage', () => {
    it('should listen for any event', () => {
      // @ts-expect-error - we want to use a more limited test of a real event emitter.
      puppeteerSession = new EventEmitter();
      session = new ProtocolSession(puppeteerSession);

      const regularListener = jest.fn();
      const allListener = jest.fn();

      session.on('Page.frameNavigated', regularListener);
      session.onAnyProtocolMessage(allListener);

      puppeteerSession.emit('Page.frameNavigated');
      puppeteerSession.emit('Debugger.scriptParsed', {script: 'details'});

      expect(regularListener).toHaveBeenCalledTimes(1);
      expect(regularListener).toHaveBeenCalledWith();
      expect(allListener).toHaveBeenCalledTimes(2);
      expect(allListener).toHaveBeenCalledWith({method: 'Page.frameNavigated', params: []});
      expect(allListener).toHaveBeenCalledWith({
        method: 'Debugger.scriptParsed',
        params: [{script: 'details'}],
      });
    });
  });

  describe('.sendCommand', () => {
    it('delegates to puppeteer', async () => {
      const send = puppeteerSession.send = jest.fn().mockResolvedValue(123);

      const result = await session.sendCommand('Page.navigate', {url: 'foo'});
      expect(result).toEqual(123);
      expect(send).toHaveBeenCalledWith('Page.navigate', {url: 'foo'});
    });
  });
});
