/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

import fs from 'fs';

import {jest} from '@jest/globals';

import {LH_ROOT} from '../../../root.js';

const mockRunLighthouse = jest.fn();

jest.unstable_mockModule('../../run.js', () => {
  return {runLighthouse: mockRunLighthouse};
});

const mockGetFlags = jest.fn();
jest.unstable_mockModule('../../cli-flags.js', () => {
  return {getFlags: mockGetFlags};
});

const mockAskPermission = jest.fn();
jest.unstable_mockModule('../../sentry-prompt.js', () => {
  return {askPermission: mockAskPermission};
});

const mockSentryInit = jest.fn();
jest.mock('../../../lighthouse-core/lib/sentry.js', () => {
  return {init: mockSentryInit};
});

const mockLoggerSetLevel = jest.fn();
jest.unstable_mockModule('lighthouse-logger', () => {
  return {default: {setLevel: mockLoggerSetLevel}};
});

const mockNotify = jest.fn();
jest.unstable_mockModule('update-notifier', () => {
  return {default: () => ({notify: mockNotify})};
});

/** @type {import('../../bin.js')} */
let bin;
beforeAll(async () => {
  bin = await import('../../bin.js');
});

/** @type {LH.CliFlags} */
let cliFlags;

beforeEach(async () => {
  mockAskPermission.mockReset();
  mockGetFlags.mockReset();
  mockLoggerSetLevel.mockReset();
  mockNotify.mockReset();
  mockRunLighthouse.mockReset();
  mockSentryInit.mockReset();
  mockRunLighthouse.mockResolvedValue({});
  cliFlags = {
    _: ['http://example.com'],
    output: ['html'],
    chromeIgnoreDefaultFlags: false,
    chromeFlags: '',
    outputPath: '',
    saveAssets: false,
    view: false,
    verbose: false,
    quiet: false,
    fraggleRock: false,
    port: 0,
    hostname: '',
    // Command modes
    listAllAudits: false,
    listLocales: false,
    listTraceCategories: false,
    printConfig: false,
  };
  mockGetFlags.mockImplementation(() => cliFlags);
});

describe('CLI bin', function() {
  /**
   * @return {any}
   */
  function getRunLighthouseArgs() {
    expect(mockRunLighthouse).toHaveBeenCalled();
    return mockRunLighthouse.mock.calls[0];
  }

  it('should run without failure', async () => {
    await bin.begin();
  });

  describe('config', () => {
    it('should load the config from the path (common js)', async () => {
      // TODO(esmodules): change this test when config file is esm.
      const configPath = `${LH_ROOT}/lighthouse-core/config/lr-desktop-config.js`;
      cliFlags = {...cliFlags, configPath: configPath};
      const actualConfig = (await import(configPath)).default;
      await bin.begin();

      expect(getRunLighthouseArgs()[2]).toEqual(actualConfig);
    });

    it('should load the config from the path (es modules)', async () => {
      const configPath =
        `${LH_ROOT}/lighthouse-cli/test/fixtures/esm-config.js`;
      cliFlags = {...cliFlags, configPath: configPath};
      const actualConfig = (await import(configPath)).default;
      await bin.begin();

      expect(getRunLighthouseArgs()[2]).toEqual(actualConfig);
    });

    it('should load the config from the preset', async () => {
      cliFlags = {...cliFlags, preset: 'experimental'};
      const actualConfig =
        (await import('../../../lighthouse-core/config/experimental-config.js')).default;
      await bin.begin();

      expect(getRunLighthouseArgs()[2]).toEqual(actualConfig);
    });
  });

  describe('budget', () => {
    it('should load the config from the path', async () => {
      const budgetPath = `${LH_ROOT}/lighthouse-core/test/fixtures/simple-budget.json`;
      cliFlags = {...cliFlags, budgetPath};
      const budgetFile = JSON.parse(fs.readFileSync(budgetPath, 'utf-8'));
      await bin.begin();

      expect(getRunLighthouseArgs()[1].budgets).toEqual(budgetFile);
    });
  });

  describe('logging', () => {
    it('should have info by default', async () => {
      await bin.begin();
      expect(mockLoggerSetLevel).toHaveBeenCalledWith('info');
    });

    it('should respect verbose', async () => {
      cliFlags = {...cliFlags, verbose: true};
      await bin.begin();
      expect(mockLoggerSetLevel).toHaveBeenCalledWith('verbose');
    });

    it('should respect quiet', async () => {
      cliFlags = {...cliFlags, quiet: true};
      await bin.begin();
      expect(mockLoggerSetLevel).toHaveBeenCalledWith('silent');
    });
  });

  describe('output', () => {
    it('should have no default output path', async () => {
      await bin.begin();

      expect(getRunLighthouseArgs()[1]).toHaveProperty('outputPath', '');
    });

    it('should use stdout when using json', async () => {
      cliFlags = {...cliFlags, output: ['json']};
      await bin.begin();

      expect(getRunLighthouseArgs()[1]).toHaveProperty('outputPath', 'stdout');
    });

    it('should have no default path when using csv', async () => {
      cliFlags = {...cliFlags, output: ['csv']};
      await bin.begin();

      expect(getRunLighthouseArgs()[1]).toHaveProperty('outputPath', '');
    });
  });

  describe('precomputedLanternData', () => {
    it('should read lantern data from file', async () => {
      const lanternDataFile = `${LH_ROOT}/lighthouse-cli/test/fixtures/lantern-data.json`;
      cliFlags = {...cliFlags, precomputedLanternDataPath: lanternDataFile};
      await bin.begin();

      expect(getRunLighthouseArgs()[1]).toMatchObject({
        precomputedLanternData: (await import(lanternDataFile)).default,
        precomputedLanternDataPath: lanternDataFile,
      });
    });

    it('should throw when invalid lantern data used', async () => {
      const headersFile = `${LH_ROOT}/lighthouse-cli/test/fixtures/extra-headers/valid.json`;
      cliFlags = {...cliFlags, precomputedLanternDataPath: headersFile};
      await expect(bin.begin()).rejects.toBeTruthy();
    });
  });

  describe('error reporting', () => {
    it('should request permission when no preference set', async () => {
      await bin.begin();

      expect(mockAskPermission).toHaveBeenCalled();
    });

    it('should not request permission when preference set', async () => {
      cliFlags = {...cliFlags, enableErrorReporting: false};
      await bin.begin();

      expect(mockAskPermission).not.toHaveBeenCalled();
    });

    it('should initialize sentry when enabled', async () => {
      cliFlags = {...cliFlags, enableErrorReporting: true};
      await bin.begin();

      expect(mockSentryInit).toHaveBeenCalled();
    });

    it('should not initialize sentry when disabled', async () => {
      cliFlags = {...cliFlags, enableErrorReporting: false};
      await bin.begin();

      expect(mockSentryInit).not.toHaveBeenCalled();
    });
  });
});
