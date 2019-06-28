/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

jest.useFakeTimers();

const Driver = require('../../../gather/driver.js');
const Connection = require('../../../gather/connections/connection.js');
const SourceMaps = require('../../../gather/gatherers/source-maps.js');
const path = require('path');
const fs = require('fs');
const pathToMap = path.join(__dirname,
  '../../../../lighthouse-cli/test/fixtures/source-maps/bundle.js.map');
const map = fs.readFileSync(pathToMap, 'utf-8');

// Copied ...
function createMockSendCommandFn() {
  const mockResponses = [];
  const mockFn = jest.fn().mockImplementation(command => {
    const indexOfResponse = mockResponses.findIndex(entry => entry.command === command);
    if (indexOfResponse === -1) throw new Error(`${command} unimplemented`);
    const {response, delay} = mockResponses[indexOfResponse];
    mockResponses.splice(indexOfResponse, 1);
    if (delay) return new Promise(resolve => setTimeout(() => resolve(response), delay));
    return Promise.resolve(response);
  });

  mockFn.mockResponse = (command, response, delay) => {
    mockResponses.push({command, response, delay});
    return mockFn;
  };

  mockFn.findInvocation = command => {
    expect(mockFn).toHaveBeenCalledWith(command, expect.anything());
    return mockFn.mock.calls.find(call => call[0] === command)[1];
  };

  return mockFn;
}

// new ...
function createMockOnFn() {
  const mockEvents = [];
  const mockFn = jest.fn().mockImplementation((eventName, listener) => {
    const events = mockEvents.filter(entry => entry.event === eventName);
    if (!events.length) return;
    for (const event of events) {
      const indexOfEvent = mockEvents.indexOf(event);
      mockEvents.splice(indexOfEvent, 1);
    }
    // Wait a tick because real events never fire immediately
    setTimeout(() => {
      for (const event of events) {
        listener(event.response);
      }
    }, 0);
  });

  mockFn.mockEvent = (event, response) => {
    mockEvents.push({event, response});
    return mockFn;
  };

  mockFn.findListener = event => {
    expect(mockFn).toHaveBeenCalledWith(event, expect.anything());
    return mockFn.mock.calls.find(call => call[0] === event)[1];
  };

  return mockFn;
}

// Copied ...
async function flushAllTimersAndMicrotasks() {
  for (let i = 0; i < 1000; i++) {
    jest.advanceTimersByTime(1);
    await Promise.resolve();
  }
}

describe('SourceMaps gatherer', () => {
  /**
   * @param {{event: LH.Crdp.Debugger.ScriptParsedEvent, map: string, fetchError: string}} mapsAndEvents
   * @return {Promise<LH.Artifacts['SourceMaps']>}
   */
  async function getResults(mapsAndEvents) {
    const onMock = createMockOnFn();
    for (const mapAndEvent of mapsAndEvents) {
      onMock.mockEvent('Debugger.scriptParsed', mapAndEvent.event);
    }

    const sendCommandMock = createMockSendCommandFn()
      .mockResponse('Debugger.enable', {})
      .mockResponse('Debugger.disable', {});

    // Only the source maps that need to be fetched use the `evaluateAsync` code path.
    // (not 'sourceMappingURL=data:application/json;...')
    const mapsAndEventsForFetching =
      mapsAndEvents.filter(data => !data.event.sourceMapURL.startsWith('data:'));
    for (const mapAndEvent of mapsAndEventsForFetching) {
      if (mapAndEvent.map && mapAndEvent.fetchError) {
        throw new Error('should only define map or fetchError, not both.');
      }
      const value = mapAndEvent.fetchError ?
        {errorMessage: mapAndEvent.fetchError} :
        mapAndEvent.map;
      sendCommandMock.mockResponse('Runtime.evaluate', {result: {value}});
    }
    const connectionStub = new Connection();
    connectionStub.sendCommand = sendCommandMock;

    const driver = new Driver(connectionStub);
    driver.on = onMock;

    const gatherer = new SourceMaps();
    await gatherer.beforePass({driver});
    await flushAllTimersAndMicrotasks();
    return gatherer.afterPass({driver});
  }

  function makeJsonDataUrl(data) {
    return 'data:application/json;charset=utf-8;base64,' + Buffer.from(data).toString('base64');
  }

  it('script with no source map url is ignored', async () => {
    const result = await getResults([
      {
        event: {
          url: 'http://www.example.com/script.js',
          sourceMapURL: '',
        },
        map: null,
      },
    ]);
    expect(result).toEqual([]);
  });

  it('map is fetched for script with source map url', async () => {
    const mapsAndEvents = [
      {
        event: {
          url: 'http://www.example.com/bundle.js',
          sourceMapURL: 'http://www.example.com/bundle.js.map',
        },
        map,
      },
    ];
    const result = await getResults(mapsAndEvents);
    expect(result).toEqual([
      {
        scriptUrl: mapsAndEvents[0].event.url,
        map: JSON.parse(mapsAndEvents[0].map),
      },
    ]);
  });

  it('map that fails to fetch generates an error message', async () => {
    const mapsAndEvents = [
      {
        event: {
          url: 'http://www.example.com/bundle.js',
          sourceMapURL: 'http://www.example.com/bundle.js.map',
        },
        fetchError: 'TypeError: Failed to fetch',
      },
    ];
    const result = await getResults(mapsAndEvents);
    expect(result).toEqual([
      {
        scriptUrl: mapsAndEvents[0].event.url,
        errorMessage: 'TypeError: Failed to fetch',
        map: undefined,
      },
    ]);
  });

  it('map that fails to parse generates an error message', async () => {
    const mapsAndEvents = [
      {
        event: {
          url: 'http://www.example.com/bundle.js',
          sourceMapURL: 'http://www.example.com/bundle.js.map',
        },
        map: '{{}',
      },
      {
        event: {
          url: 'http://www.example.com/bundle-2.js',
          sourceMapURL: makeJsonDataUrl('{};'),
        },
      },
    ];
    const result = await getResults(mapsAndEvents);
    expect(result).toEqual([
      {
        scriptUrl: mapsAndEvents[0].event.url,
        errorMessage: 'SyntaxError: Unexpected token { in JSON at position 1',
        map: undefined,
      },
      {
        scriptUrl: mapsAndEvents[1].event.url,
        errorMessage: 'SyntaxError: Unexpected token ; in JSON at position 2',
        map: undefined,
      },
    ]);
  });
});
