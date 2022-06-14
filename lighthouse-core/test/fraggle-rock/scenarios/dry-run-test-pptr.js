/**
 * @license Copyright 2022 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import {jest} from '@jest/globals';

import * as api from '../../../fraggle-rock/api.js';
import {createTestState} from './pptr-test-utils.js';
import {LH_ROOT} from '../../../../root.js';

/* eslint-env jest */
/* eslint-env browser */

jest.setTimeout(90_000);

describe('Dry Run', () => {
  const state = createTestState();

  state.installSetupAndTeardownHooks();

  beforeAll(() => {
    state.server.baseDir = `${LH_ROOT}/lighthouse-core/test/fixtures/fraggle-rock/snapshot-basic`;
  });

  it('should setup environment and perform flow actions', async () => {
    const pageUrl = `${state.serverBaseUrl}/onclick.html`;

    const flow = await api.startFlow(state.page, {dryRun: true});
    await flow.navigate(pageUrl);

    await flow.startTimespan();
    await state.page.click('button');
    await flow.endTimespan();

    await flow.snapshot();

    // Ensure page navigated occurred and button was clicked.
    const finalUrl = await state.page.url();
    expect(finalUrl).toEqual(`${pageUrl}#done`);

    // Ensure Lighthouse emulated a mobile device.
    const deviceMetrics = await state.page.evaluate(() => ({
      width: document.documentElement.clientWidth,
      height: document.documentElement.clientHeight,
    }));
    expect(deviceMetrics).toEqual({
      height: 640,
      width: 360,
    });

    expect(flow.createArtifactsJson()).toEqual({
      gatherSteps: [],
    });
    expect(await flow.createFlowResult()).toEqual({
      name: 'Dry run',
      steps: [],
    });
    expect(await flow.generateReport()).toEqual(
      '<h1>Cannot generate a flow report from a dry run</h1>'
    );
  });
});
