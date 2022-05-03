/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

import {jest} from '@jest/globals';
import Connection from '../../gather/connections/connection.js';
import {fnAny, mockCommands} from '../test-utils.js';

const {createMockSendCommandFn} = mockCommands;

// Some imports needs to be done dynamically, so that their dependencies will be mocked.
// See: https://jestjs.io/docs/ecmascript-modules#differences-between-esm-and-commonjs
//      https://github.com/facebook/jest/issues/10025
/** @typedef {import('../../gather/driver.js')} Driver */
/** @type {typeof import('../../gather/driver.js')} */
let Driver;
/** @typedef {import('../../gather/fetcher.js')} Fetcher */
/** @type {typeof import('../../gather/fetcher.js')} */
let Fetcher;

beforeAll(async () => {
  Driver = (await import('../../gather/driver.js')).default;
  Fetcher = (await import('../../gather/fetcher.js')).default;
});

/** @type {number} */
let browserMilestone;
jest.mock('../../gather/driver/environment.js', () => ({
  getBrowserVersion: fnAny().mockImplementation(() => {
    return Promise.resolve({milestone: browserMilestone});
  }),
}));

/** @type {Connection} */
let connectionStub;
/** @type {Driver} */
let driver;
/** @type {Fetcher} */
let fetcher;

beforeEach(() => {
  connectionStub = new Connection();
  driver = new Driver(connectionStub);
  fetcher = new Fetcher(driver.defaultSession, driver.executionContext);
  browserMilestone = 92;
});

describe('.fetchResource', () => {
  beforeEach(() => {
    fetcher._enabled = true;
    fetcher._fetchResourceOverProtocol = fnAny().mockReturnValue(Promise.resolve('PROTOCOL'));
    fetcher._fetchResourceIframe = fnAny().mockReturnValue(Promise.resolve('IFRAME'));
  });

  it('throws if fetcher not enabled', async () => {
    fetcher._enabled = false;
    const resultPromise = fetcher.fetchResource('https://example.com');
    await expect(resultPromise).rejects.toThrow(/Must call `enable`/);
  });

  it('calls fetchResourceOverProtocol in newer chrome', async () => {
    const result = await fetcher.fetchResource('https://example.com');
    expect(result).toEqual('PROTOCOL');
    expect(fetcher._fetchResourceOverProtocol).toHaveBeenCalled();
    expect(fetcher._fetchResourceIframe).not.toHaveBeenCalled();
  });

  it('calls fetchResourceIframe in chrome before M92', async () => {
    browserMilestone = 91;
    const result = await fetcher.fetchResource('https://example.com');
    expect(result).toEqual('IFRAME');
    expect(fetcher._fetchResourceOverProtocol).not.toHaveBeenCalled();
    expect(fetcher._fetchResourceIframe).toHaveBeenCalled();
  });
});

describe('._readIOStream', () => {
  it('reads contents of stream', async () => {
    connectionStub.sendCommand = createMockSendCommandFn()
      .mockResponse('IO.read', {data: 'Hello World!', eof: true, base64Encoded: false});

    const data = await fetcher._readIOStream('1');
    expect(data).toEqual('Hello World!');
  });

  it('combines multiple reads', async () => {
    connectionStub.sendCommand = createMockSendCommandFn()
      .mockResponse('IO.read', {data: 'Hello ', eof: false, base64Encoded: false})
      .mockResponse('IO.read', {data: 'World', eof: false, base64Encoded: false})
      .mockResponse('IO.read', {data: '!', eof: true, base64Encoded: false});

    const data = await fetcher._readIOStream('1');
    expect(data).toEqual('Hello World!');
  });

  it('decodes if base64', async () => {
    const buffer = Buffer.from('Hello World!').toString('base64');
    connectionStub.sendCommand = createMockSendCommandFn()
      .mockResponse('IO.read', {data: buffer, eof: true, base64Encoded: true});

    const data = await fetcher._readIOStream('1');
    expect(data).toEqual('Hello World!');
  });

  it('decodes multiple base64 reads', async () => {
    const buffer1 = Buffer.from('Hello ').toString('base64');
    const buffer2 = Buffer.from('World!').toString('base64');
    connectionStub.sendCommand = createMockSendCommandFn()
      .mockResponse('IO.read', {data: buffer1, eof: false, base64Encoded: true})
      .mockResponse('IO.read', {data: buffer2, eof: true, base64Encoded: true});

    const data = await fetcher._readIOStream('1');
    expect(data).toEqual('Hello World!');
  });

  it('throws on timeout', async () => {
    connectionStub.sendCommand = fnAny()
      .mockReturnValue(Promise.resolve({data: 'No stop', eof: false, base64Encoded: false}));

    const dataPromise = fetcher._readIOStream('1', {timeout: 50});
    await expect(dataPromise).rejects.toThrowError(/Waiting for the end of the IO stream/);
  });
});

describe('._fetchResourceOverProtocol', () => {
  /** @type {string} */
  let streamContents;

  beforeEach(() => {
    streamContents = 'STREAM CONTENTS';
    fetcher._readIOStream = fnAny().mockImplementation(() => {
      return Promise.resolve(streamContents);
    });
  });

  it('fetches a file', async () => {
    connectionStub.sendCommand = createMockSendCommandFn()
      .mockResponse('Page.getFrameTree', {frameTree: {frame: {id: 'FRAME'}}})
      .mockResponse('Network.loadNetworkResource', {
        resource: {success: true, httpStatusCode: 200, stream: '1'},
      });

    const data = await fetcher._fetchResourceOverProtocol('https://example.com', {timeout: 500});
    expect(data).toEqual({content: streamContents, status: 200});
  });

  it('returns null when resource could not be fetched', async () => {
    connectionStub.sendCommand = createMockSendCommandFn()
      .mockResponse('Page.getFrameTree', {frameTree: {frame: {id: 'FRAME'}}})
      .mockResponse('Network.loadNetworkResource', {
        resource: {success: false, httpStatusCode: 404},
      });

    const data = await fetcher._fetchResourceOverProtocol('https://example.com', {timeout: 500});
    expect(data).toEqual({content: null, status: 404});
  });

  it('throws on timeout', async () => {
    connectionStub.sendCommand = createMockSendCommandFn()
      .mockResponse('Page.getFrameTree', {frameTree: {frame: {id: 'FRAME'}}})
      .mockResponse('Network.loadNetworkResource', {
        resource: {success: false, httpStatusCode: 404},
      }, 100);

    const dataPromise = fetcher._fetchResourceOverProtocol('https://example.com', {timeout: 50});
    await expect(dataPromise).rejects.toThrowError(/Timed out fetching resource/);
  });

  it('uses remaining time on _readIOStream', async () => {
    connectionStub.sendCommand = createMockSendCommandFn()
      .mockResponse('Page.getFrameTree', {frameTree: {frame: {id: 'FRAME'}}})
      .mockResponse('Network.loadNetworkResource', {
        resource: {success: true, httpStatusCode: 200, stream: '1'},
      }, 500);

    let timeout;
    fetcher._readIOStream = fnAny().mockImplementation((_, options) => {
      timeout = options.timeout;
    });

    await fetcher._fetchResourceOverProtocol('https://example.com', {timeout: 1000});
    expect(timeout).toBeCloseTo(500, -2);
  });
});
