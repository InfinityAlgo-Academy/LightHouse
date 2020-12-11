/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

const {resolveModule} = require('../../config/config-helpers.js');
const assert = require('assert').strict;
const path = require('path');

jest.mock('process', () => ({
  cwd: () => jest.fn(),
}));

describe('resolveModule', () => {
  const configFixturePath = path.resolve(__dirname, '../fixtures/config');

  beforeEach(() => {
    process.cwd = jest.fn(() => configFixturePath);
  });

  it('lighthouse and plugins are installed in the same path', () => {
    const pluginName = 'chrome-launcher';
    const pathToPlugin = resolveModule(pluginName, null, 'plugin');
    assert.equal(pathToPlugin, require.resolve(pluginName));
  });

  describe('plugin paths to a file', () => {
    it('relative to the current working directory', () => {
      const pluginName = 'lighthouse-plugin-config-helper';
      const pathToPlugin = resolveModule(pluginName, null, 'plugin');
      assert.equal(pathToPlugin, require.resolve(path.resolve(configFixturePath, pluginName)));
    });

    it('relative to the config path', () => {
      process.cwd = jest.fn(() => path.resolve(configFixturePath, '../'));
      const pluginName = 'lighthouse-plugin-config-helper';
      const pathToPlugin = resolveModule(pluginName, configFixturePath, 'plugin');
      assert.equal(pathToPlugin, require.resolve(path.resolve(configFixturePath, pluginName)));
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

      assert.equal(pathToPlugin, require.resolve(pluginName, {paths: [pluginDir]}));
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

      assert.equal(pathToPlugin, require.resolve(pluginName, {paths: [configDirectory]}));
    });
  });
});
