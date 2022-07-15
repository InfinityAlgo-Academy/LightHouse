/**
 * @license Copyright 2022 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import jestMock from 'jest-mock';
import * as td from 'testdouble';

import {mockRunnerModule} from './gather/mock-driver.js';
import {Runner} from '../../runner.js';

const snapshotModule = {snapshotGather: jestMock.fn()};
const navigationModule = {navigationGather: jestMock.fn()};
const timespanModule = {startTimespanGather: jestMock.fn()};

await td.replaceEsm('../../fraggle-rock/gather/snapshot-runner.js', snapshotModule);
await td.replaceEsm('../../fraggle-rock/gather/navigation-runner.js', navigationModule);
await td.replaceEsm('../../fraggle-rock/gather/timespan-runner.js', timespanModule);
const mockRunner = await mockRunnerModule();

/** @typedef {typeof testContext} testContext */
const testContext = {
  snapshotModule,
  navigationModule,
  timespanModule,
  mockRunner,
  actualRunner: Runner,
};
export {testContext};
