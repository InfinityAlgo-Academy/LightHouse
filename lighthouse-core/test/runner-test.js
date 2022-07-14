/**
 * @license Copyright 2022 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import jestMock from 'jest-mock';
import * as td from 'testdouble';

import * as assetSaver from '../lib/asset-saver.js';
import {makeMocksForGatherRunner} from './test-utils.js';

const suite = describe('Runner', () => {
  it('empty test', () => {});
});

suite.beforeAll(async () => {
  /** @type {jestMock.Mock} */
  let saveArtifactsSpy;
  /** @type {jestMock.Mock} */
  let saveLhrSpy;
  /** @type {jestMock.Mock} */
  let loadArtifactsSpy;
  /** @type {jestMock.Mock} */
  let gatherRunnerRunSpy;
  /** @type {jestMock.Mock} */
  let runAuditSpy;

  const lighthouseTestContext = {
    saveArtifactsSpy,
    saveLhrSpy,
    loadArtifactsSpy,
    gatherRunnerRunSpy,
    runAuditSpy,
  };

  makeMocksForGatherRunner();

  td.replaceEsm('../lib/asset-saver.js', {
    saveArtifacts: lighthouseTestContext.saveArtifactsSpy = jestMock.fn(assetSaver.saveArtifacts),
    saveLhr: lighthouseTestContext.saveLhrSpy = jestMock.fn(),
    loadArtifacts: lighthouseTestContext.loadArtifactsSpy = jestMock.fn(assetSaver.loadArtifacts),
  });

  td.replaceEsm('../gather/driver/service-workers.js', {
    getServiceWorkerVersions: jestMock.fn().mockResolvedValue({versions: []}),
    getServiceWorkerRegistrations: jestMock.fn().mockResolvedValue({registrations: []}),
  });

  global.lighthouseTestContext = lighthouseTestContext;

  const {GatherRunner} = await import('../gather/gather-runner.js');
  const {Runner} = await import('../runner.js');
  lighthouseTestContext.gatherRunnerRunSpy = jestMock.spyOn(GatherRunner, 'run');
  lighthouseTestContext.runAuditSpy = jestMock.spyOn(Runner, '_runAudit');

  afterEach(() => {
    lighthouseTestContext.saveArtifactsSpy.mockClear();
    lighthouseTestContext.saveLhrSpy.mockClear();
    lighthouseTestContext.loadArtifactsSpy.mockClear();
    lighthouseTestContext.gatherRunnerRunSpy.mockClear();
    lighthouseTestContext.runAuditSpy.mockClear();
  });

  after(() => {
    global.lighthouseTestContext = undefined;
    lighthouseTestContext.gatherRunnerRunSpy.mockRestore();
    lighthouseTestContext.runAuditSpy.mockRestore();
  });

  await import('./runner-test.impl.js');
});
