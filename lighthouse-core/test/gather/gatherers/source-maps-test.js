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
const {createMockSendCommandFn, createMockOnFn} = require('../mock-commands.js');

const mapJson = JSON.stringify({
  version: 3,
  file: 'out.js',
  sourceRoot: '',
  sources: ['foo.js', 'bar.js'],
  names: ['src', 'maps', 'are', 'fun'],
  mappings: 'AAgBC,SAAQ,CAAEA',
});

describe('SourceMaps gatherer', () => {
  /**
   * @param {Array<{event: LH.Crdp.Debugger.ScriptParsedEvent, map: string, fetchError: string}>} mapsAndEvents
   * @return {Promise<LH.Artifacts['SourceMaps']>}
   */
  async function runSourceMaps(mapsAndEvents) {
    const onMock = createMockOnFn();

    const sendCommandMock = createMockSendCommandFn()
      .mockResponse('Debugger.enable', {})
      .mockResponse('Debugger.disable', {});

    for (const {map, event, fetchError, resolvedSourceMapUrl} of mapsAndEvents) {
      onMock.mockEvent('protocolevent', {method: 'Debugger.scriptParsed', params: event});

      if (event.sourceMapURL.startsWith('data:')) {
        // Only the source maps that need to be fetched use the `evaluateAsync` code path.
        continue;
      }

      if (map && fetchError) {
        throw new Error('should only define map or fetchError, not both.');
      }

      const value = fetchError ? {errorMessage: fetchError} : map;
      sendCommandMock.mockResponse('Runtime.evaluate', {result: {value}}, undefined, ({expression}) => {
        // Check that the source map url was resolved correctly.
        // If the test did not define `resolvedSourceMapUrl` explicitly, then use `event.sourceMapURL`.
        const expectedResolvedSourceMapUrl = resolvedSourceMapUrl || event.sourceMapURL;
        if (!expression.includes(expectedResolvedSourceMapUrl)) {
          throw new Error(`did not request expected url: ${expectedResolvedSourceMapUrl}`);
        }
      });
    }
    const connectionStub = new Connection();
    connectionStub.sendCommand = sendCommandMock;
    connectionStub.on = onMock;

    const driver = new Driver(connectionStub);

    const sourceMaps = new SourceMaps();
    await sourceMaps.beforePass({driver});
    jest.advanceTimersByTime(1);
    return sourceMaps.afterPass({driver});
  }

  function makeJsonDataUrl(data) {
    return 'data:application/json;charset=utf-8;base64,' + Buffer.from(data).toString('base64');
  }

  it('ignores script with no source map url', async () => {
    const artifact = await runSourceMaps([
      {
        event: {
          url: 'http://www.example.com/script.js',
          sourceMapURL: '',
        },
        map: null,
      },
    ]);
    expect(artifact).toEqual([]);
  });

  it('fetches map for script with source map url', async () => {
    const mapsAndEvents = [
      {
        event: {
          url: 'http://www.example.com/bundle.js',
          sourceMapURL: 'http://www.example.com/bundle.js.map',
        },
        map: mapJson,
      },
    ];
    const artifact = await runSourceMaps(mapsAndEvents);
    expect(artifact).toEqual([
      {
        scriptUrl: mapsAndEvents[0].event.url,
        map: JSON.parse(mapsAndEvents[0].map),
      },
    ]);
  });

  it('fetches map for script with relative source map url', async () => {
    const mapsAndEvents = [
      {
        event: {
          url: 'http://www.example.com/path/bundle.js',
          sourceMapURL: 'bundle.js.map',
        },
        map: mapJson,
        resolvedSourceMapUrl: 'http://www.example.com/path/bundle.js.map',
      },
      {
        event: {
          url: 'http://www.example.com/path/bundle.js',
          sourceMapURL: '../bundle.js.map',
        },
        map: mapJson,
        resolvedSourceMapUrl: 'http://www.example.com/bundle.js.map',
      },
      {
        event: {
          url: 'http://www.example.com/path/bundle.js',
          sourceMapURL: 'http://www.example-2.com/path/bundle.js',
        },
        map: mapJson,
      },
    ];
    const artifacts = await runSourceMaps(mapsAndEvents);
    expect(artifacts).toEqual([
      {
        scriptUrl: mapsAndEvents[0].event.url,
        map: JSON.parse(mapsAndEvents[0].map),
      },
      {
        scriptUrl: mapsAndEvents[1].event.url,
        map: JSON.parse(mapsAndEvents[1].map),
      },
      {
        scriptUrl: mapsAndEvents[2].event.url,
        map: JSON.parse(mapsAndEvents[2].map),
      },
    ]);
  });

  it('fails to fetch map that generates an error message', async () => {
    const mapsAndEvents = [
      {
        event: {
          url: 'http://www.example.com/bundle.js',
          sourceMapURL: 'http://www.example.com/bundle.js.map',
        },
        fetchError: 'TypeError: Failed to fetch',
      },
    ];
    const artifact = await runSourceMaps(mapsAndEvents);
    expect(artifact).toEqual([
      {
        scriptUrl: mapsAndEvents[0].event.url,
        errorMessage: 'TypeError: Failed to fetch',
        map: undefined,
      },
    ]);
  });

  it('fails to parse map that generates an error message', async () => {
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
    const artifact = await runSourceMaps(mapsAndEvents);
    expect(artifact).toEqual([
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
