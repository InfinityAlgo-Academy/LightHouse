/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

jest.useFakeTimers();

const Driver = require('../../../gather/driver.js');
const Connection = require('../../../gather/connections/connection.js');
const JsUsage = require('../../../gather/gatherers/js-usage.js');
const {createMockSendCommandFn, createMockOnFn} = require('../mock-commands.js');

describe('JsUsage gatherer', () => {
  /**
   * `scriptParsedEvents` mocks the `Debugger.scriptParsed` events.
   * `coverage` mocks the result of `Profiler.takePreciseCoverage`.
   * @param {{coverage: LH.Crdp.Profiler.ScriptCoverage[], scriptParsedEvents: LH.Crdp.Debugger.ScriptParsedEvent[]}} _
   * @return {Promise<LH.Artifacts['JsUsage']>}
   */
  async function runJsUsage({coverage, scriptParsedEvents = []}) {
    const onMock = createMockOnFn();
    const sendCommandMock = createMockSendCommandFn()
      .mockResponse('Profiler.enable', {})
      .mockResponse('Profiler.disable', {})
      .mockResponse('Debugger.enable', {})
      .mockResponse('Debugger.disable', {})
      .mockResponse('Profiler.startPreciseCoverage', {})
      .mockResponse('Profiler.takePreciseCoverage', {result: coverage})
      .mockResponse('Profiler.stopPreciseCoverage', {});

    for (const scriptParsedEvent of scriptParsedEvents) {
      onMock.mockEvent('protocolevent', {
        method: 'Debugger.scriptParsed',
        params: scriptParsedEvent,
      });
    }
    const connectionStub = new Connection();
    connectionStub.sendCommand = sendCommandMock;
    connectionStub.on = onMock;

    const driver = new Driver(connectionStub);

    const gatherer = new JsUsage();
    await gatherer.beforePass({driver});
    // Needed for protocol events to emit.
    jest.advanceTimersByTime(1);
    return gatherer.afterPass({driver});
  }

  it('combines coverage data by url', async () => {
    const coverage = [
      {scriptId: '1', url: 'https://www.example.com'},
      {scriptId: '2', url: 'https://www.example.com'},
    ];
    const artifact = await runJsUsage({coverage});
    expect(artifact).toMatchInlineSnapshot(`
      Object {
        "https://www.example.com": Array [
          Object {
            "scriptId": "1",
            "url": "https://www.example.com",
          },
          Object {
            "scriptId": "2",
            "url": "https://www.example.com",
          },
        ],
      }
    `);
  });

  it('ignore coverage data with empty url', async () => {
    const coverage = [{scriptId: '1', url: ''}];
    const artifact = await runJsUsage({coverage});
    expect(artifact).toMatchInlineSnapshot(`Object {}`);
  });

  it('uses ScriptParsedEvent embedderName over coverage data url', async () => {
    const coverage = [{scriptId: '1', url: 'LOL WHAT'}];
    const scriptParsedEvents = [{scriptId: '1', embedderName: 'https://www.example.com'}];
    const artifact = await runJsUsage({coverage, scriptParsedEvents});
    expect(artifact).toMatchInlineSnapshot(`
      Object {
        "https://www.example.com": Array [
          Object {
            "scriptId": "1",
            "url": "LOL WHAT",
          },
        ],
      }
    `);
  });
});
