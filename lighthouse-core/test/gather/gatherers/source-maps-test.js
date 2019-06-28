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
const {createMockSendCommandFn, createMockOnFn,
  flushAllTimersAndMicrotasks} = require('../mock-driver.js');
const path = require('path');
const fs = require('fs');
const pathToMap = path.join(__dirname,
  '../../../../lighthouse-cli/test/fixtures/source-maps/bundle.js.map');
const map = fs.readFileSync(pathToMap, 'utf-8');

describe('SourceMaps gatherer', () => {
  /**
   * @param {{event: LH.Crdp.Debugger.ScriptParsedEvent, map: string, fetchError: string}} mapsAndEvents
   * @return {Promise<LH.Artifacts['SourceMaps']>}
   */
  async function getResults(mapsAndEvents) {
    const onMock = createMockOnFn();
    for (const {event} of mapsAndEvents) {
      onMock.mockEvent('Debugger.scriptParsed', event);
    }

    const sendCommandMock = createMockSendCommandFn()
      .mockResponse('Debugger.enable', {})
      .mockResponse('Debugger.disable', {});

    for (const {map, event, fetchError} of mapsAndEvents) {
      if (event.sourceMapURL.startsWith('data:')) {
        // Only the source maps that need to be fetched use the `evaluateAsync` code path.
        continue;
      }

      if (map && fetchError) {
        throw new Error('should only define map or fetchError, not both.');
      }

      const value = fetchError ? {errorMessage: fetchError} : map;
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
