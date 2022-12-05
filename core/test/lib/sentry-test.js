/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import jestMock from 'jest-mock';
import * as td from 'testdouble';

import {Sentry} from '../../lib/sentry.js';

describe('Sentry', () => {
  let sentryNodeMock;
  let configPayload;
  let originalSentry;

  beforeEach(async () => {
    await td.replaceEsm('@sentry/node', (sentryNodeMock = {
      init: jestMock.fn().mockReturnValue({install: jestMock.fn()}),
      setExtras: jestMock.fn(),
      captureException: jestMock.fn(),
      withScope: (fn) => fn({
        setLevel: () => {},
        setTags: () => {},
        setExtras: () => {},
      }),
    }));

    configPayload = {
      url: 'http://example.com',
      flags: {enableErrorReporting: true},
      environmentData: {},
    };

    // We need to save the Sentry delegate object because every call to `.init` mutates the methods.
    // We want to have a fresh state for every test.
    originalSentry = {...Sentry};

    Sentry._shouldSample = jestMock.fn().mockReturnValue(true);
  });

  afterEach(() => {
    // Reset the methods on the Sentry object, see note above.
    Object.assign(Sentry, originalSentry);
  });

  describe('.init', () => {
    it('should noop when !enableErrorReporting', async () => {
      await Sentry.init({url: 'http://example.com', flags: {}});
      expect(sentryNodeMock.init).not.toHaveBeenCalled();
      await Sentry.init({url: 'http://example.com', flags: {enableErrorReporting: false}});
      expect(sentryNodeMock.init).not.toHaveBeenCalled();
    });

    it('should noop when not picked for sampling', async () => {
      Sentry._shouldSample.mockReturnValue(false);
      await Sentry.init({url: 'http://example.com', flags: {enableErrorReporting: true}});
      expect(sentryNodeMock.init).not.toHaveBeenCalled();
    });

    it('should initialize the Sentry client when enableErrorReporting', async () => {
      await Sentry.init({
        url: 'http://example.com',
        flags: {
          enableErrorReporting: true,
          formFactor: 'desktop',
          throttlingMethod: 'devtools',
        },
        environmentData: {},
      });

      expect(sentryNodeMock.init).toHaveBeenCalled();
      expect(sentryNodeMock.setExtras).toHaveBeenCalled();
      expect(sentryNodeMock.setExtras.mock.calls[0][0]).toEqual({
        channel: 'cli',
        url: 'http://example.com',
        formFactor: 'desktop',
        throttlingMethod: 'devtools',
      });
    });
  });

  describe('.captureException', () => {
    it('should forward exceptions to Sentry client', async () => {
      await Sentry.init(configPayload);
      const error = new Error('oops');
      await Sentry.captureException(error);

      expect(sentryNodeMock.captureException).toHaveBeenCalled();
      expect(sentryNodeMock.captureException.mock.calls[0][0]).toBe(error);
    });

    it('should skip expected errors', async () => {
      await Sentry.init(configPayload);
      const error = new Error('oops');
      error.expected = true;
      await Sentry.captureException(error);

      expect(sentryNodeMock.captureException).not.toHaveBeenCalled();
    });

    it('should skip duplicate audit errors', async () => {
      await Sentry.init(configPayload);
      const error = new Error('A');
      await Sentry.captureException(error, {tags: {audit: 'my-audit'}});
      await Sentry.captureException(error, {tags: {audit: 'my-audit'}});

      expect(sentryNodeMock.captureException).toHaveBeenCalledTimes(1);
    });

    it('should still allow different audit errors', async () => {
      await Sentry.init(configPayload);
      const errorA = new Error('A');
      const errorB = new Error('B');
      await Sentry.captureException(errorA, {tags: {audit: 'my-audit'}});
      await Sentry.captureException(errorB, {tags: {audit: 'my-audit'}});

      expect(sentryNodeMock.captureException).toHaveBeenCalledTimes(2);
    });

    it('should skip duplicate gatherer errors', async () => {
      await Sentry.init(configPayload);
      const error = new Error('A');
      await Sentry.captureException(error, {tags: {gatherer: 'my-gatherer'}});
      await Sentry.captureException(error, {tags: {gatherer: 'my-gatherer'}});

      expect(sentryNodeMock.captureException).toHaveBeenCalledTimes(1);
    });
  });
});
