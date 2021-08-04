/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

const {
  getBaseArtifacts,
  finalizeArtifacts,
} = require('../../../fraggle-rock/gather/base-artifacts.js');
const {initializeConfig} = require('../../../fraggle-rock/config/config.js');
const {createMockDriver} = require('./mock-driver.js');
const LighthouseError = require('../../../lib/lh-error.js');

function getMockDriverForArtifacts() {
  const driverMock = createMockDriver();
  driverMock._executionContext.evaluate.mockResolvedValue(500);
  return driverMock;
}

describe('getBaseArtifacts', () => {
  let driverMock = getMockDriverForArtifacts();

  beforeEach(() => {
    driverMock = getMockDriverForArtifacts();
  });

  it('should fetch benchmark index', async () => {
    const {config} = initializeConfig(undefined, {gatherMode: 'navigation'});
    const artifacts = await getBaseArtifacts(config, driverMock.asDriver());
    expect(artifacts.BenchmarkIndex).toEqual(500);
  });

  it('should return settings', async () => {
    const {config} = initializeConfig(undefined, {gatherMode: 'navigation'});
    const artifacts = await getBaseArtifacts(config, driverMock.asDriver());
    expect(artifacts.settings).toEqual(config.settings);
  });
});

describe('finalizeArtifacts', () => {
  /** @type {LH.FRBaseArtifacts} */
  let baseArtifacts;
  /** @type {Partial<LH.Artifacts>} */
  let gathererArtifacts = {};

  beforeEach(async () => {
    const {config} = initializeConfig(undefined, {gatherMode: 'navigation'});
    const driver = getMockDriverForArtifacts().asDriver();
    baseArtifacts = await getBaseArtifacts(config, driver);
    baseArtifacts.URL = {requestedUrl: 'http://example.com', finalUrl: 'https://example.com'};
    gathererArtifacts = {};
  });

  it('should merge the two objects', () => {
    baseArtifacts.LighthouseRunWarnings = [{i18nId: '1', formattedDefault: 'Yes'}];
    gathererArtifacts.LighthouseRunWarnings = [{i18nId: '2', formattedDefault: 'No'}];
    gathererArtifacts.HostUserAgent = 'Desktop Chrome';

    const winningError = new LighthouseError(LighthouseError.errors.NO_LCP);
    baseArtifacts.PageLoadError = new LighthouseError(LighthouseError.errors.NO_FCP);
    gathererArtifacts.PageLoadError = winningError;

    gathererArtifacts.MainDocumentContent = '<html>';
    gathererArtifacts.RobotsTxt = {status: 404, content: null};

    const artifacts = finalizeArtifacts(baseArtifacts, gathererArtifacts);
    expect(artifacts).toMatchObject({
      PageLoadError: winningError,
      HostUserAgent: 'Desktop Chrome',
      BenchmarkIndex: 500,
      MainDocumentContent: '<html>',
      RobotsTxt: {status: 404, content: null},
      LighthouseRunWarnings: [
        {i18nId: '1', formattedDefault: 'Yes'},
        {i18nId: '2', formattedDefault: 'No'},
      ],
    });
  });

  it('should add timing entries', () => {
    const artifacts = finalizeArtifacts(baseArtifacts, gathererArtifacts);
    expect(artifacts.Timing.length).toBeGreaterThan(0);
  });

  it('should add environment warnings', () => {
    baseArtifacts.settings.channel = 'cli';
    baseArtifacts.settings.throttlingMethod = 'simulate';
    baseArtifacts.BenchmarkIndex = 200;
    const artifacts = finalizeArtifacts(baseArtifacts, gathererArtifacts);
    expect(artifacts.LighthouseRunWarnings).toHaveLength(1);
    expect(artifacts.LighthouseRunWarnings[0]).toBeDisplayString(/slower CPU/);
  });

  it('should dedupe warnings', () => {
    baseArtifacts.LighthouseRunWarnings = [
      {i18nId: '1', formattedDefault: 'Yes', values: {test: 1}},
      {i18nId: '1', formattedDefault: 'Yes', values: {test: 2}},
    ];
    gathererArtifacts.LighthouseRunWarnings = [
      {i18nId: '1', formattedDefault: 'Yes', values: {test: 1}},
      {i18nId: '1', formattedDefault: 'Yes', values: {test: 3}},
      {i18nId: '2', formattedDefault: 'No'},
    ];

    const artifacts = finalizeArtifacts(baseArtifacts, gathererArtifacts);
    expect(artifacts.LighthouseRunWarnings).toEqual([
      {i18nId: '1', formattedDefault: 'Yes', values: {test: 1}},
      {i18nId: '1', formattedDefault: 'Yes', values: {test: 2}},
      {i18nId: '1', formattedDefault: 'Yes', values: {test: 3}},
      {i18nId: '2', formattedDefault: 'No'},
    ]);
  });

  it('should throw if URL was not set', () => {
    const run = () => finalizeArtifacts(baseArtifacts, gathererArtifacts);

    baseArtifacts.URL = {requestedUrl: '', finalUrl: ''};
    expect(run).toThrowError(/requestedUrl/);

    baseArtifacts.URL = {requestedUrl: '', finalUrl: 'https://example.com'};
    expect(run).toThrowError(/requestedUrl/);

    baseArtifacts.URL = {requestedUrl: 'https://example.com', finalUrl: ''};
    expect(run).toThrowError(/finalUrl/);
  });
});
