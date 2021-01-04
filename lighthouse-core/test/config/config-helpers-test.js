/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

const path = require('path');
const {deepClone, deepCloneConfigJson, requireAudits, resolveModule} =
  require('../../config/config-helpers.js');
const Gatherer = require('../../gather/gatherers/gatherer.js');
const UserTimingsAudit = require('../../audits/user-timings.js');

jest.mock('process', () => ({
  cwd: () => jest.fn(),
}));

describe('.deepClone', () => {
  it('should clone things deeply', () => {
    const input = {a: {b: {c: 1}}};
    const output = deepClone(input);
    expect(output).not.toBe(input);
    expect(output).toEqual(input);
    output.a.b.c = 2;
    expect(input.a.b.c).toEqual(1);
  });
});

describe('.deepCloneConfigJson', () => {
  it('should clone a config deeply', () => {
    const TimingGatherer = new Gatherer();
    const input = {
      artifacts: [{id: 'Timing', gatherer: TimingGatherer}],
      passes: [{passName: 'defaultPass', gatherers: []}],
      audits: [{path: 'user-timings'}],
      categories: {random: {auditRefs: [{id: 'user-timings'}]}},
    };

    const output = deepCloneConfigJson(input);
    expect(output).not.toBe(input);
    expect(output).toEqual(input);
    output.artifacts[0].id = 'NewName';
    output.passes[0].passName = 'newName';
    output.audits[0].path = 'new-audit';
    output.categories.random.auditRefs[0].id = 'new-audit';
    expect(input.artifacts[0].id).toEqual('Timing');
    expect(input.passes[0].passName).toEqual('defaultPass');
    expect(input.audits[0].path).toEqual('user-timings');
    expect(input.categories.random.auditRefs[0].id).toEqual('user-timings');
  });

  it('should preserve gatherer implementations in passes', () => {
    const TimingGatherer = new Gatherer();
    const input = {
      passes: [{passName: 'defaultPass', gatherers: [TimingGatherer]}],
    };

    const output = deepCloneConfigJson(input);
    expect(output.passes[0].gatherers[0]).toEqual(TimingGatherer);
  });

  it('should preserve gatherer implementations in artifacts', () => {
    const TimingGatherer = new Gatherer();
    const input = {
      artifacts: [{id: 'Timing', gatherer: TimingGatherer}],
    };

    const output = deepCloneConfigJson(input);
    expect(output.artifacts[0].gatherer).toEqual(TimingGatherer);
  });

  it('should preserve audit implementations', () => {
    const input = {
      audits: [{implementation: UserTimingsAudit}],
    };

    const output = deepCloneConfigJson(input);
    expect(output.audits[0].implementation).toEqual(UserTimingsAudit);
  });
});


describe('.requireAudits', () => {
  it('should expand audit short-hand', () => {
    const result = requireAudits(['user-timings']);

    expect(result).toEqual([{path: 'user-timings', options: {}, implementation: UserTimingsAudit}]);
  });

  it('should handle multiple audit definition styles', () => {
    const result = requireAudits(['user-timings', {implementation: UserTimingsAudit}]);

    expect(result).toMatchObject([{path: 'user-timings'}, {implementation: UserTimingsAudit}]);
  });

  it('should merge audit options', () => {
    const audits = [
      'user-timings',
      {path: 'is-on-https', options: {x: 1, y: 1}},
      {path: 'is-on-https', options: {x: 2}},
    ];
    const merged = requireAudits(audits);
    expect(merged).toMatchObject([
      {path: 'user-timings', options: {}},
      {path: 'is-on-https', options: {x: 2, y: 1}},
    ]);
  });

  it('throws for invalid auditDefns', () => {
    expect(() => requireAudits([new Gatherer()])).toThrow(/Invalid Audit type/);
  });
});

describe('resolveModule', () => {
  const configFixturePath = path.resolve(__dirname, '../fixtures/config');

  beforeEach(() => {
    process.cwd = jest.fn(() => configFixturePath);
  });

  it('lighthouse and plugins are installed in the same path', () => {
    const pluginName = 'chrome-launcher';
    const pathToPlugin = resolveModule(pluginName, null, 'plugin');
    expect(pathToPlugin).toEqual(require.resolve(pluginName));
  });

  describe('plugin paths to a file', () => {
    it('relative to the current working directory', () => {
      const pluginName = 'lighthouse-plugin-config-helper';
      const pathToPlugin = resolveModule(pluginName, null, 'plugin');
      expect(pathToPlugin).toEqual(require.resolve(path.resolve(configFixturePath, pluginName)));
    });

    it('relative to the config path', () => {
      process.cwd = jest.fn(() => path.resolve(configFixturePath, '../'));
      const pluginName = 'lighthouse-plugin-config-helper';
      const pathToPlugin = resolveModule(pluginName, configFixturePath, 'plugin');
      expect(pathToPlugin).toEqual(require.resolve(path.resolve(configFixturePath, pluginName)));
    });
  });

  describe('lighthouse and plugins are installed by npm', () => {
    const pluginsDirectory = path.resolve(__dirname, '../fixtures/config/');

    // working directory/
    //   |-- node_modules/
    //   |-- package.json
    it('in current working directory', () => {
      const pluginName = 'plugin-in-working-directory';
      const pluginDir = `${pluginsDirectory}/node_modules/plugin-in-working-directory`;
      process.cwd = jest.fn(() => pluginsDirectory);

      const pathToPlugin = resolveModule(pluginName, null, 'plugin');

      expect(pathToPlugin).toEqual(require.resolve(pluginName, {paths: [pluginDir]}));
    });

    // working directory/
    //   |-- config directory/
    //     |-- node_modules/
    //     |-- config.js
    //     |-- package.json
    it('relative to the config path', () => {
      const pluginName = 'plugin-in-config-directory';
      const configDirectory = `${pluginsDirectory}/config`;
      process.cwd = jest.fn(() => '/usr/bin/node');

      const pathToPlugin = resolveModule(pluginName, configDirectory, 'plugin');

      expect(pathToPlugin).toEqual(require.resolve(pluginName, {paths: [configDirectory]}));
    });
  });
});
