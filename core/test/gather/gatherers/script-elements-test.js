/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

const {
  createMockContext,
  mockDriverSubmodules,
} = require('../../fraggle-rock/gather/mock-driver.js');
const mocks = mockDriverSubmodules();
const ScriptElements = require('../../../gather/gatherers/script-elements.js');
const NetworkRequest = require('../../../lib/network-request.js');

/**
 * @param {Partial<LH.Artifacts.NetworkRequest>=} partial
 * @return {LH.Artifacts.NetworkRequest}
 */
function mockRecord(partial) {
  const request = new NetworkRequest();
  request.resourceType = NetworkRequest.TYPES.Script;
  return Object.assign(request, partial);
}

/**
 * @param {Partial<LH.Artifacts.ScriptElement>=} partial
 * @return {LH.Artifacts.ScriptElement}
 */
function mockElement(partial) {
  return {
    type: null,
    src: null,
    id: null,
    async: false,
    defer: false,
    source: 'head',
    content: null,
    requestId: null,
    node: null,
    ...partial,
  };
}

describe('_getArtifact', () => {
  let mockContext = createMockContext();
  /** @type {ScriptElements} */
  let gatherer;
  /** @type {LH.Artifacts.ScriptElement[]} */
  let scriptElements;
  /** @type {LH.Artifacts.NetworkRequest[]} */
  let networkRecords;
  /** @type {Record<string, string>} */
  let scriptRecordContents;
  /** @type {LH.Artifacts.NetworkRequest} */
  let mainDocument;

  beforeEach(() => {
    mocks.reset();
    mockContext = createMockContext();
    gatherer = new ScriptElements();
    scriptElements = [];
    mainDocument = mockRecord({resourceType: NetworkRequest.TYPES.Document, requestId: '0'});
    networkRecords = [mainDocument];
    scriptRecordContents = {};
    mockContext.driver._executionContext.evaluate.mockImplementation(() => scriptElements);
    mocks.networkMock.fetchResponseBodyFromCache
      .mockImplementation((_, id) => Promise.resolve(scriptRecordContents[id]));
  });

  it('collects script elements', async () => {
    networkRecords = [
      mainDocument,
      mockRecord({url: 'https://example.com/script.js', requestId: '1'}),
    ];
    scriptRecordContents = {
      '1': '// SOURCED',
    };
    scriptElements = [
      mockElement({src: 'https://example.com/script.js'}),
      mockElement({content: '// INLINE'}),
    ];

    const artifact = await gatherer._getArtifact(mockContext.asContext(), networkRecords, 'mobile');

    expect(artifact).toEqual([
      mockElement({src: 'https://example.com/script.js', requestId: '1', content: '// SOURCED'}),
      mockElement({content: '// INLINE', requestId: '0'}),
    ]);
  });

  it('ignore OOPIF records', async () => {
    networkRecords = [
      mainDocument,
      mockRecord({url: 'https://example.com/script.js', requestId: '1'}),
      mockRecord({url: 'https://oopif.com/script.js', requestId: '2', sessionId: 'OOPIF'}),
    ];
    scriptRecordContents = {
      '1': '// SOURCED',
      '2': '// OOPIF',
    };
    // OOPIF would not produce script element
    scriptElements = [
      mockElement({src: 'https://example.com/script.js'}),
      mockElement({content: '// INLINE'}),
    ];

    const artifact = await gatherer._getArtifact(mockContext.asContext(), networkRecords, 'mobile');

    expect(artifact).toEqual([
      mockElement({src: 'https://example.com/script.js', requestId: '1', content: '// SOURCED'}),
      mockElement({content: '// INLINE', requestId: '0'}),
    ]);
  });

  it('null content for sourced script with empty content', async () => {
    networkRecords = [
      mainDocument,
      mockRecord({url: 'https://example.com/empty.js', requestId: '1'}),
    ];
    scriptRecordContents = {
      '1': '',
    };
    scriptElements = [
      mockElement({src: 'https://example.com/empty.js'}),
    ];

    const artifact = await gatherer._getArtifact(mockContext.asContext(), networkRecords, 'mobile');

    expect(artifact).toEqual([
      mockElement({src: 'https://example.com/empty.js'}),
    ]);
  });

  it('handle erroneous network content', async () => {
    networkRecords = [
      mainDocument,
      mockRecord({url: 'https://example.com/script.js', requestId: '1'}),
    ];
    mocks.networkMock.fetchResponseBodyFromCache.mockRejectedValue('Error');
    scriptElements = [
      mockElement({src: 'https://example.com/script.js'}),
    ];

    const artifact = await gatherer._getArtifact(mockContext.asContext(), networkRecords, 'mobile');

    expect(artifact).toEqual([
      mockElement({src: 'https://example.com/script.js'}),
    ]);
  });

  it('create element if none found', async () => {
    networkRecords = [
      mainDocument,
      mockRecord({url: 'https://example.com/script.js', requestId: '1'}),
    ];
    scriptRecordContents = {
      '1': '// SOURCED',
    };

    const artifact = await gatherer._getArtifact(mockContext.asContext(), networkRecords, 'mobile');

    expect(artifact).toEqual([
      mockElement({src: 'https://example.com/script.js', requestId: '1', content: '// SOURCED', source: 'network'}),
    ]);
  });
});
