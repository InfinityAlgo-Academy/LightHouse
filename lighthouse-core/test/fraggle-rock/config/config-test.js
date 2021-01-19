/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const BaseGatherer = require('../../../fraggle-rock/gather/base-gatherer.js');
const {initializeConfig} = require('../../../fraggle-rock/config/config.js');

/* eslint-env jest */

describe('Fraggle Rock Config', () => {
  /** @type {LH.Gatherer.GatherMode} */
  let gatherMode = 'snapshot';

  beforeEach(() => {
    gatherMode = 'snapshot';
  });

  it('should throw if the config path is not absolute', () => {
    const configFn = () =>
      initializeConfig(undefined, {gatherMode, configPath: '../relative/path'});
    expect(configFn).toThrow(/must be an absolute path/);
  });

  it('should not mutate the original input', () => {
    const configJson = {artifacts: [{id: 'Accessibility', gatherer: 'accessibility'}]};
    const {config} = initializeConfig(configJson, {gatherMode});
    expect(configJson).toEqual({artifacts: [{id: 'Accessibility', gatherer: 'accessibility'}]});
    expect(config).not.toBe(configJson);
    expect(config).not.toEqual(configJson);
    expect(config.artifacts).toMatchObject([{gatherer: {path: 'accessibility'}}]);
  });

  it('should use default config when none passed in', () => {
    const {config} = initializeConfig(undefined, {gatherMode});
    expect(config.settings).toMatchObject({formFactor: 'mobile'});
    if (!config.audits) throw new Error('Did not define audits');
    expect(config.audits.length).toBeGreaterThan(0);
  });

  it('should resolve settings with defaults', () => {
    const {config} = initializeConfig(
      {settings: {output: 'csv', maxWaitForFcp: 1234}},
      {settingsOverrides: {maxWaitForFcp: 12345}, gatherMode}
    );

    expect(config.settings).toMatchObject({
      formFactor: 'mobile', // inherit from default
      output: 'csv', // config-specific overrides
      maxWaitForFcp: 12345, // explicit overrides
    });
  });

  it('should resolve artifact definitions', () => {
    const configJson = {artifacts: [{id: 'Accessibility', gatherer: 'accessibility'}]};
    const {config} = initializeConfig(configJson, {gatherMode});

    expect(config).toMatchObject({
      artifacts: [{id: 'Accessibility', gatherer: {path: 'accessibility'}}],
    });
  });

  it('should throw on invalid artifact definitions', () => {
    const configJson = {artifacts: [{id: 'ImageElements', gatherer: 'image-elements'}]};
    expect(() => initializeConfig(configJson, {gatherMode})).toThrow(/ImageElements gatherer/);
  });

  it('should resolve navigation definitions', () => {
    gatherMode = 'navigation';
    const configJson = {
      artifacts: [{id: 'Accessibility', gatherer: 'accessibility'}],
      navigations: [{id: 'default', artifacts: ['Accessibility']}],
    };
    const {config} = initializeConfig(configJson, {gatherMode});

    expect(config).toMatchObject({
      artifacts: [{id: 'Accessibility', gatherer: {path: 'accessibility'}}],
      navigations: [
        {id: 'default', artifacts: [{id: 'Accessibility', gatherer: {path: 'accessibility'}}]},
      ],
    });
  });

  it('should throw when navigations are defined without artifacts', () => {
    const configJson = {
      navigations: [{id: 'default', artifacts: ['Accessibility']}],
    };

    expect(() => initializeConfig(configJson, {gatherMode})).toThrow(/Cannot use navigations/);
  });

  it('should throw when navigations use unrecognized artifacts', () => {
    const configJson = {
      artifacts: [],
      navigations: [{id: 'default', artifacts: ['Accessibility']}],
    };

    expect(() => initializeConfig(configJson, {gatherMode})).toThrow(/Unrecognized artifact/);
  });

  it('should set default properties on navigations', () => {
    gatherMode = 'navigation';
    const configJson = {
      artifacts: [],
      navigations: [{id: 'default'}],
    };
    const {config} = initializeConfig(configJson, {gatherMode});

    expect(config).toMatchObject({
      navigations: [
        {
          id: 'default',
          blankPage: 'about:blank',
          artifacts: [],
          disableThrottling: false,
          networkQuietThresholdMs: 0,
          cpuQuietThresholdMs: 0,
        },
      ],
    });
  });

  it('should filter configuration by gatherMode', () => {
    const timespanGatherer = new BaseGatherer();
    timespanGatherer.meta = {supportedModes: ['timespan']};

    const configJson = {
      artifacts: [
        {id: 'Accessibility', gatherer: 'accessibility'},
        {id: 'Timespan', gatherer: {instance: timespanGatherer}},
      ],
    };

    const {config} = initializeConfig(configJson, {gatherMode: 'snapshot'});
    expect(config).toMatchObject({
      artifacts: [
        {id: 'Accessibility', gatherer: {path: 'accessibility'}},
      ],
    });
  });

  it.todo('should support extension');
  it.todo('should support plugins');
  it.todo('should adjust default pass options for throttling method');
  it.todo('should filter configuration by inclusive settings');
  it.todo('should filter configuration by exclusive settings');
  it.todo('should validate audit/gatherer interdependencies');
});
