/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const {initializeConfig} = require('../../../fraggle-rock/config/config.js');

/* eslint-env jest */

describe('Fraggle Rock Config', () => {
  it('should throw if the config path is not absolute', () => {
    const configFn = () => initializeConfig(undefined, {configPath: '../relative/path'});
    expect(configFn).toThrow(/must be an absolute path/);
  });

  it('should not mutate the original input', () => {
    const configJson = {artifacts: [{id: 'ImageElements', gatherer: 'image-elements'}]};
    const {config} = initializeConfig(configJson, {});
    expect(configJson).toEqual({artifacts: [{id: 'ImageElements', gatherer: 'image-elements'}]});
    expect(config).not.toBe(configJson);
    expect(config).not.toEqual(configJson);
    expect(config.artifacts).toMatchObject([{gatherer: {path: 'image-elements'}}]);
  });

  it('should use default config when none passed in', () => {
    const {config} = initializeConfig(undefined, {});
    expect(config.settings).toMatchObject({formFactor: 'mobile'});
    if (!config.audits) throw new Error('Did not define audits');
    expect(config.audits.length).toBeGreaterThan(0);
  });

  it('should resolve settings with defaults', () => {
    const {config} = initializeConfig(
      {settings: {output: 'csv', maxWaitForFcp: 1234}},
      {settingsOverrides: {maxWaitForFcp: 12345}}
    );

    expect(config.settings).toMatchObject({
      formFactor: 'mobile', // inherit from default
      output: 'csv', // config-specific overrides
      maxWaitForFcp: 12345, // explicit overrides
    });
  });

  it('should resolve artifact definitions', () => {
    const configJson = {artifacts: [{id: 'ImageElements', gatherer: 'image-elements'}]};
    const {config} = initializeConfig(configJson, {});

    expect(config).toMatchObject({
      artifacts: [{id: 'ImageElements', gatherer: {path: 'image-elements'}}],
    });
  });

  it.todo('should support extension');
  it.todo('should support plugins');
  it.todo('should set default properties on navigations');
  it.todo('should adjust default pass options for throttling method');
  it.todo('should normalize gatherer inputs');
  it.todo('should require gatherers from their paths');
  it.todo('should filter configuration');
  it.todo('should validate audit/gatherer interdependencies');
});
