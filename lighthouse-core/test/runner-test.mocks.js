/**
 * @license Copyright 2022 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import jestMock from 'jest-mock';
import * as td from 'testdouble';

import {makeMocksForGatherRunner} from './test-utils.js';
import * as assetSaver from '../lib/asset-saver.js';

await makeMocksForGatherRunner();

/** @type {jestMock.Mock} */
let saveArtifactsSpy;
/** @type {jestMock.Mock} */
let saveLhrSpy;
/** @type {jestMock.Mock} */
let loadArtifactsSpy;

await td.replaceEsm('../lib/asset-saver.js', {
  saveArtifacts: saveArtifactsSpy = jestMock.fn(assetSaver.saveArtifacts),
  saveLhr: saveLhrSpy = jestMock.fn(),
  loadArtifacts: loadArtifactsSpy = jestMock.fn(assetSaver.loadArtifacts),
});

await td.replaceEsm('../gather/driver/service-workers.js', {
  getServiceWorkerVersions: jestMock.fn().mockResolvedValue({versions: []}),
  getServiceWorkerRegistrations: jestMock.fn().mockResolvedValue({registrations: []}),
});

/** @typedef {typeof testContext} TestContext */
const testContext = {
  saveArtifactsSpy,
  saveLhrSpy,
  loadArtifactsSpy,
};
export {testContext};
