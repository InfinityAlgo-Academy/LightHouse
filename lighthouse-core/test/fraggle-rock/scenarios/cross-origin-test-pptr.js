/**
 * @license Copyright 2022 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

import {jest} from '@jest/globals';

import * as lighthouse from '../../../fraggle-rock/api.js';
import {createTestState} from './pptr-test-utils.js';
import {LH_ROOT} from '../../../../root.js';

/* eslint-env jest */
/* eslint-env browser */

jest.setTimeout(90_000);

describe('Cross origin timespan', () => {
  const state = createTestState();

  state.installSetupAndTeardownHooks();

  beforeAll(() => {
    state.server.baseDir = state.secondaryServer.baseDir =
      `${LH_ROOT}/lighthouse-core/test/fixtures/fraggle-rock/css-change`;
  });

  it('should resolve all stylesheets', async () => {
    await state.page.goto(`${state.serverBaseUrl}/start.html`, {waitUntil: ['networkidle0']});

    const timespan = await lighthouse.startTimespan({page: state.page});
    await state.page.goto(`${state.secondaryServerBaseUrl}/end.html`);
    const result = await timespan.endTimespan();
    if (!result) throw new Error('Lighthouse did not return a result');

    // Ensure CSS usage didn't error.
    expect(result.artifacts.CSSUsage.stylesheets).toHaveLength(4);
    expect(result.lhr.audits['unused-css-rules'].score).not.toBeNull();
  });
});
