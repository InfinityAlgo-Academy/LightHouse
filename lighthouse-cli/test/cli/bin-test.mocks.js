/**
 * @license Copyright 2022 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import * as td from 'testdouble';
import jestMock from 'jest-mock';

const mockRunLighthouse = jestMock.fn();
const mockGetFlags = jestMock.fn();
const mockAskPermission = jestMock.fn();
const mockSentryInit = jestMock.fn();
const mockLoggerSetLevel = jestMock.fn();

await td.replaceEsm('../../run.js', {
  runLighthouse: mockRunLighthouse,
});
await td.replaceEsm('../../cli-flags.js', {
  getFlags: mockGetFlags,
});
await td.replaceEsm('../../sentry-prompt.js', {
  askPermission: mockAskPermission,
});
await td.replaceEsm('../../../lighthouse-core/lib/sentry.js', {
  Sentry: {
    init: mockSentryInit,
  },
});
await td.replaceEsm('lighthouse-logger', undefined, {setLevel: mockLoggerSetLevel});

/** @typedef {typeof testContext} TestContext */
const testContext = {
  mockRunLighthouse,
  mockGetFlags,
  mockAskPermission,
  mockSentryInit,
  mockLoggerSetLevel,
};
export {testContext};
