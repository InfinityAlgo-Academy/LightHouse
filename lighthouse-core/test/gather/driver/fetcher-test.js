/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

/** @type {number} */
let browserMilestone;

jest.useFakeTimers();
jest.mock('../../../gather/driver/environment.js', () => ({
  getBrowserVersion: jest.fn().mockImplementation(() => {
    return Promise.resolve({milestone: browserMilestone});
  }),
}));

const {fetchResource, _readIOStream} = require('../../../gather/driver/fetcher.js');
const {createMockSession} = require('../../fraggle-rock/gather/mock-driver.js');
const {flushAllTimersAndMicrotasks} = require('../../test-utils.js');

let mockSession = createMockSession();

beforeEach(() => {
  mockSession = createMockSession();
  browserMilestone = 92;
});

describe('._readIOStream', () => {
  it('reads contents of stream', async () => {
    mockSession.sendCommand
      .mockResponse('IO.read', {data: 'Hello World!', eof: true, base64Encoded: false});

    const data = await _readIOStream(mockSession.asSession(), '1');
    expect(data).toEqual('Hello World!');
  });

  it('combines multiple reads', async () => {
    mockSession.sendCommand
      .mockResponse('IO.read', {data: 'Hello ', eof: false, base64Encoded: false})
      .mockResponse('IO.read', {data: 'World', eof: false, base64Encoded: false})
      .mockResponse('IO.read', {data: '!', eof: true, base64Encoded: false});

    const data = await _readIOStream(mockSession.asSession(), '1');
    expect(data).toEqual('Hello World!');
  });

  it('decodes if base64', async () => {
    const buffer = Buffer.from('Hello World!').toString('base64');
    mockSession.sendCommand
      .mockResponse('IO.read', {data: buffer, eof: true, base64Encoded: true});

    const data = await _readIOStream(mockSession.asSession(), '1');
    expect(data).toEqual('Hello World!');
  });

  it('decodes multiple base64 reads', async () => {
    const buffer1 = Buffer.from('Hello ').toString('base64');
    const buffer2 = Buffer.from('World!').toString('base64');
    mockSession.sendCommand
      .mockResponse('IO.read', {data: buffer1, eof: false, base64Encoded: true})
      .mockResponse('IO.read', {data: buffer2, eof: true, base64Encoded: true});

    const data = await _readIOStream(mockSession.asSession(), '1');
    expect(data).toEqual('Hello World!');
  });
});

describe('fetchResource', () => {
  it('fetches a file', async () => {
    const streamContents = 'STREAM CONTENTS';
    mockSession.sendCommand
      .mockResponse('Page.getFrameTree', {frameTree: {frame: {id: 'FRAME'}}})
      .mockResponse('Network.loadNetworkResource', {
        resource: {success: true, httpStatusCode: 200, stream: '1'},
      })
      .mockResponse('IO.read', {
        data: streamContents,
        eof: true,
        base64Encoded: false,
      });

    const data = await fetchResource(mockSession.asSession(), 'https://example.com', {timeout: 500});
    expect(data).toEqual({content: streamContents, status: 200});
  });

  it('returns null when resource could not be fetched', async () => {
    mockSession.sendCommand
      .mockResponse('Page.getFrameTree', {frameTree: {frame: {id: 'FRAME'}}})
      .mockResponse('Network.loadNetworkResource', {
        resource: {success: false, httpStatusCode: 404},
      });

    const data = await fetchResource(mockSession.asSession(), 'https://example.com', {timeout: 500});
    expect(data).toEqual({content: null, status: 404});
  });

  it('times out on Network.loadNetworkResource', async () => {
    mockSession.sendCommand
      .mockResponse('Page.getFrameTree', {frameTree: {frame: {id: 'FRAME'}}})
      .mockResponse('Network.loadNetworkResource', () => new Promise(() => {})); // Hang forever.

    const fetchPromise = fetchResource(mockSession.asSession(), 'https://example.com', {timeout: 50});

    await flushAllTimersAndMicrotasks(55); // Wait for timeout.

    await expect(fetchPromise).rejects.toThrowError(/Timed out fetching resource/);
  });

  it('times out on IO.read', async () => {
    mockSession.sendCommand
      .mockResponse('Page.getFrameTree', {frameTree: {frame: {id: 'FRAME'}}})
      .mockResponse('Network.loadNetworkResource', {
        resource: {success: true, httpStatusCode: 200, stream: '1'},
      }, 50)
      .mockResponse('IO.read', () => new Promise(() => {})); // Hang forever.

    const fetchPromise = fetchResource(mockSession.asSession(), 'https://example.com', {timeout: 100});

    await flushAllTimersAndMicrotasks(105); // Wait for timeout.

    expect(mockSession.sendCommand).toHaveBeenCalledWith('IO.read', {handle: '1'});
    await expect(fetchPromise).rejects.toThrow(/Timed out fetching resource/);
  });
});
