/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const {createMockDriver} = require('./mock-driver.js');
const runner = require('../../../fraggle-rock/gather/navigation-runner.js');
const {initializeConfig} = require('../../../fraggle-rock/config/config.js');
const {defaultNavigationConfig} = require('../../../config/constants.js');

/* eslint-env jest */

/** @typedef {{meta: LH.Gatherer.GathererMeta<'Accessibility'>, getArtifact: jest.Mock<any, any>, startInstrumentation:jest.Mock<any, any>, stopInstrumentation: jest.Mock<any, any>, startSensitiveInstrumentation:jest.Mock<any, any>, stopSensitiveInstrumentation: jest.Mock<any, any>}} MockGatherer */

describe('NavigationRunner', () => {
  let requestedUrl = '';
  /** @type {ReturnType<typeof createMockDriver>} */
  let mockDriver;
  /** @type {import('../../../fraggle-rock/gather/driver.js')} */
  let driver;
  /** @type {LH.Config.FRConfig} */
  let config;
  /** @type {LH.Config.NavigationDefn} */
  let navigation;

  /** @return {LH.Config.FRGathererDefn} */
  function createGathererDefn() {
    return {
      instance: {
        name: 'Accessibility',
        meta: {supportedModes: []},
        startInstrumentation: jest.fn(),
        stopInstrumentation: jest.fn(),
        startSensitiveInstrumentation: jest.fn(),
        stopSensitiveInstrumentation: jest.fn(),
        getArtifact: jest.fn(),
      },
    };
  }

  /** @return {{navigation: LH.Config.NavigationDefn, gatherers: {timespan: MockGatherer, snapshot: MockGatherer, navigation: MockGatherer}}} */
  function createNavigation() {
    const timespanGatherer = createGathererDefn();
    timespanGatherer.instance.meta.supportedModes = ['timespan', 'navigation'];
    timespanGatherer.instance.getArtifact = jest.fn().mockResolvedValue({type: 'timespan'});
    const snapshotGatherer = createGathererDefn();
    snapshotGatherer.instance.meta.supportedModes = ['snapshot', 'navigation'];
    snapshotGatherer.instance.getArtifact = jest.fn().mockResolvedValue({type: 'snapshot'});
    const navigationGatherer = createGathererDefn();
    navigationGatherer.instance.meta.supportedModes = ['navigation'];
    navigationGatherer.instance.getArtifact = jest
      .fn()
      .mockResolvedValue({type: 'navigation'});

    const navigation = {
      ...defaultNavigationConfig,
      artifacts: [
        {id: 'Timespan', gatherer: timespanGatherer},
        {id: 'Snapshot', gatherer: snapshotGatherer},
        {id: 'Navigation', gatherer: navigationGatherer},
      ],
    };

    return {
      navigation,
      gatherers: {
        timespan: /** @type {any} */ (timespanGatherer.instance),
        snapshot: /** @type {any} */ (snapshotGatherer.instance),
        navigation: /** @type {any} */ (navigationGatherer.instance),
      },
    };
  }

  beforeEach(() => {
    requestedUrl = 'http://example.com';
    config = initializeConfig(undefined, {gatherMode: 'navigation'}).config;
    navigation = createNavigation().navigation;

    mockDriver = createMockDriver();
    driver = mockDriver.asDriver();
  });

  describe('_setup', () => {
    beforeEach(() => {
      mockDriver._session.sendCommand.mockResponse('Browser.getVersion', {
        product: 'Chrome/88.0',
        userAgent: 'Chrome',
      });
    });

    it('should connect the driver', async () => {
      await runner._setup({driver, config, requestedUrl});
      expect(mockDriver.connect).toHaveBeenCalled();
    });

    it('should navigate to the blank page', async () => {
      await runner._setup({driver, config, requestedUrl});
      expect(mockDriver._page.goto).toHaveBeenCalledWith('about:blank');
    });

    it.todo('should throw if service worker is currently controlling the page');
    it.todo('should enable emulation');
    it.todo('should enable important CDP domains');
    it.todo('should register the performance observer for navigation conditions');
    it.todo('should shim requestIdleCallback');
    it.todo('should reset storage');
    it.todo('should not reset storage when skipped');
  });

  describe('_navigations', () => {
    it('should throw if no navigations available', async () => {
      config = {...config, navigations: null};
      await expect(runner._navigations({driver, requestedUrl, config})).rejects.toBeTruthy();
    });

    it('should navigate as many times as there are navigations', async () => {
      config = initializeConfig(
        {
          ...config,
          navigations: [{id: 'default'}, {id: 'second'}, {id: 'third'}, {id: 'fourth'}],
        },
        {gatherMode: 'navigation'}
      ).config;

      await runner._navigations({driver, config, requestedUrl});
      const navigations = mockDriver._page.goto.mock.calls;
      const pageNavigations = navigations.filter(call => call[0] === requestedUrl);
      expect(pageNavigations).toHaveLength(4);
    });

    it('should merge artifacts between navigations', async () => {
      config = initializeConfig(
        {
          ...config,
          navigations: [
            {id: 'default', artifacts: ['FontSize']},
            {id: 'second', artifacts: ['ConsoleMessages']},
          ],
        },
        {gatherMode: 'navigation'}
      ).config;

      // Both gatherers will error in these test conditions, but artifact errors
      // will be merged into single `artifacts` object.
      const {artifacts} = await runner._navigations({driver, config, requestedUrl});
      const artifactIds = Object.keys(artifacts);
      expect(artifactIds).toContain('FontSize');
      expect(artifactIds).toContain('ConsoleMessages');
    });
  });

  describe('_navigation', () => {
    it('completes an end-to-end navigation', async () => {
      const {artifacts} = await runner._navigation({driver, navigation, requestedUrl});
      const artifactIds = Object.keys(artifacts);
      expect(artifactIds).toContain('Timespan');
      expect(artifactIds).toContain('Snapshot');

      expect(mockDriver._page.goto).toHaveBeenCalled();
    });

    it('collects timespan, snapshot, and navigation artifacts', async () => {
      const {artifacts} = await runner._navigation({driver, navigation, requestedUrl});
      expect(artifacts).toEqual({
        Navigation: {type: 'navigation'},
        Timespan: {type: 'timespan'},
        Snapshot: {type: 'snapshot'},
      });
    });

    it('supports dependencies between phases', async () => {
      const {navigation, gatherers} = createNavigation();
      navigation.artifacts[1].dependencies = {Accessibility: {id: 'Timespan'}};
      navigation.artifacts[2].dependencies = {Accessibility: {id: 'Timespan'}};

      const {artifacts} = await runner._navigation({driver, navigation, requestedUrl});
      expect(artifacts).toEqual({
        Navigation: {type: 'navigation'},
        Timespan: {type: 'timespan'},
        Snapshot: {type: 'snapshot'},
      });

      expect(gatherers.navigation.getArtifact).toHaveBeenCalled();
      const navigationArgs = gatherers.navigation.getArtifact.mock.calls[0];
      expect(navigationArgs[0].dependencies).toEqual({Accessibility: {type: 'timespan'}});

      expect(gatherers.snapshot.getArtifact).toHaveBeenCalled();
      const snapshotArgs = gatherers.snapshot.getArtifact.mock.calls[0];
      expect(snapshotArgs[0].dependencies).toEqual({Accessibility: {type: 'timespan'}});
    });

    it('passes through an error in dependencies', async () => {
      const {navigation} = createNavigation();
      const err = new Error('Error in dependency chain');
      navigation.artifacts[0].gatherer.instance.startInstrumentation = jest
        .fn()
        .mockRejectedValue(err);
      navigation.artifacts[1].dependencies = {Accessibility: {id: 'Timespan'}};
      navigation.artifacts[2].dependencies = {Accessibility: {id: 'Timespan'}};

      const {artifacts} = await runner._navigation({driver, navigation, requestedUrl});

      expect(artifacts).toEqual({
        Navigation: expect.any(Error),
        Timespan: err,
        Snapshot: expect.any(Error),
      });
    });

    it('passes through an error in startSensitiveInstrumentation', async () => {
      const {navigation, gatherers} = createNavigation();
      const err = new Error('Error in startSensitiveInstrumentation');
      gatherers.navigation.startSensitiveInstrumentation.mockRejectedValue(err);

      const {artifacts} = await runner._navigation({driver, navigation, requestedUrl});

      expect(artifacts).toEqual({
        Navigation: err,
        Timespan: {type: 'timespan'},
        Snapshot: {type: 'snapshot'},
      });
    });

    it('passes through an error in startInstrumentation', async () => {
      const {navigation, gatherers} = createNavigation();
      const err = new Error('Error in startInstrumentation');
      gatherers.timespan.startInstrumentation.mockRejectedValue(err);

      const {artifacts} = await runner._navigation({driver, navigation, requestedUrl});

      expect(artifacts).toEqual({
        Navigation: {type: 'navigation'},
        Timespan: err,
        Snapshot: {type: 'snapshot'},
      });
    });
  });

  describe('_setupNavigation', () => {
    it('should setup the page on the blankPage', async () => {
      navigation.blankPage = 'data:text/html;...';
      await runner._setupNavigation({driver, navigation, requestedUrl});
      expect(mockDriver._page.goto).toHaveBeenCalledWith('data:text/html;...');
    });

    it.todo('should setup throttling');
    it.todo('should clear cache');
    it.todo('should skip clear cache when requested');
  });

  describe('_navigate', () => {
    it('should navigate the page', async () => {
      await runner._navigate({driver, navigation, requestedUrl});
      expect(mockDriver._page.goto).toHaveBeenCalledWith(requestedUrl, expect.anything());
    });

    it.todo('should wait for page conditions');
    it.todo('should disable throttling when finished');
    it.todo('should capture page load errors');
  });
});
