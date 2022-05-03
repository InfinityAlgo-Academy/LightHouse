/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

import MainDocumentContent from '../../../gather/gatherers/main-document-content.js';

import NetworkRecorder from '../../../lib/network-recorder.js';
import {createMockContext} from '../../fraggle-rock/gather/mock-driver.js';
import {getURLArtifactFromDevtoolsLog} from '../../test-utils.js';
import devtoolsLog from '../../fixtures/traces/lcp-m78.devtools.log.json';

// @ts-expect-error
const URL = getURLArtifactFromDevtoolsLog(devtoolsLog);

describe('FR compat', () => {
  it('uses loadData in legacy mode', async () => {
    const gatherer = new MainDocumentContent();
    // @ts-expect-error
    const networkRecords = NetworkRecorder.recordsFromLogs(devtoolsLog);
    const mockContext = createMockContext();
    mockContext.baseArtifacts.URL = URL;
    mockContext.driver.defaultSession.sendCommand
      .mockResponse('Network.getResponseBody', {body: 'RESPONSE'});

    const artifact = await gatherer.afterPass(
      mockContext.asLegacyContext(),
      // @ts-expect-error
      {devtoolsLog, networkRecords}
    );

    expect(artifact).toEqual('RESPONSE');
  });

  it('uses dependencies for FR', async () => {
    const gatherer = new MainDocumentContent();
    const mockContext = createMockContext();
    mockContext.baseArtifacts.URL = URL;
    mockContext.driver.defaultSession.sendCommand
      .mockResponse('Network.getResponseBody', {body: 'RESPONSE'});

    /** @type {LH.Gatherer.FRTransitionalContext<'DevtoolsLog'>} */
    const context = {
      ...mockContext.asContext(),
      // @ts-expect-error
      dependencies: {DevtoolsLog: devtoolsLog},
    };

    const artifact = await gatherer.getArtifact(context);

    expect(artifact).toEqual('RESPONSE');
  });
});
