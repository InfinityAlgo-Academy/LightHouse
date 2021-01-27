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

/** @typedef {{snapshot: jest.Mock<any, any>, beforeTimespan:jest.Mock<any, any>, afterTimespan: jest.Mock<any, any>}} MockGatherer */

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
        beforeTimespan: jest.fn(),
        afterTimespan: jest.fn(),
        snapshot: jest.fn(),
      },
    };
  }

  /** @return {{navigation: LH.Config.NavigationDefn, gatherers: {timespan: MockGatherer, snapshot: MockGatherer}}} */
  function createNavigation() {
    const timespanGatherer = createGathererDefn();
    timespanGatherer.instance.meta.supportedModes = ['timespan', 'navigation'];
    timespanGatherer.instance.afterTimespan = jest.fn().mockResolvedValue({type: 'timespan'});
    const snapshotGatherer = createGathererDefn();
    snapshotGatherer.instance.meta.supportedModes = ['snapshot', 'navigation'];
    snapshotGatherer.instance.snapshot = jest.fn().mockResolvedValue({type: 'snapshot'});

    const navigation = {
      ...defaultNavigationConfig,
      artifacts: [
        {id: 'Timespan', gatherer: timespanGatherer},
        {id: 'Snapshot', gatherer: snapshotGatherer},
      ],
    };

    return {
      navigation,
      gatherers: {
        timespan: /** @type {any} */ (timespanGatherer.instance),
        snapshot: /** @type {any} */ (snapshotGatherer.instance),
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
            {id: 'default', artifacts: ['Accessibility']},
            {id: 'second', artifacts: ['ConsoleMessages']},
          ],
        },
        {gatherMode: 'navigation'}
      ).config;

      const {artifacts} = await runner._navigations({driver, config, requestedUrl});
      const artifactIds = Object.keys(artifacts);
      expect(artifactIds).toContain('Accessibility');
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

    it('collects both timespan and snapshot artifacts', async () => {
      const {artifacts} = await runner._navigation({driver, navigation, requestedUrl});
      expect(artifacts).toEqual({
        Timespan: {type: 'timespan'},
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

  describe('_beforeTimespanPhase', () => {
    /** @type {Record<string, Promise<any>>} */
    let artifacts;

    beforeEach(() => {
      artifacts = {};
    });

    it('should run the beforeTimespan phase of timespan gatherers', async () => {
      const {navigation, gatherers} = createNavigation();
      await runner._beforeTimespanPhase({driver, navigation, requestedUrl}, artifacts);
      expect(artifacts).toEqual({Timespan: expect.any(Promise)});
      expect(gatherers.timespan.beforeTimespan).toHaveBeenCalled();
      expect(gatherers.snapshot.beforeTimespan).not.toHaveBeenCalled();
    });
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

  describe('_afterTimespanPhase', () => {
    /** @type {Record<string, Promise<any>>} */
    let artifacts;

    beforeEach(() => {
      artifacts = {};
    });

    it('should run the afterTimespan phase of timespan gatherers', async () => {
      const {navigation, gatherers} = createNavigation();
      await runner._afterTimespanPhase({driver, navigation, requestedUrl}, artifacts);
      expect(artifacts).toEqual({Timespan: expect.any(Promise)});
      expect(await artifacts.Timespan).toEqual({type: 'timespan'});
      expect(gatherers.timespan.afterTimespan).toHaveBeenCalled();
      expect(gatherers.snapshot.afterTimespan).not.toHaveBeenCalled();
    });

    it('should combine the previous promises', async () => {
      artifacts = {Timespan: Promise.reject(new Error('beforeTimespan rejection'))};

      const {navigation, gatherers} = createNavigation();
      await runner._afterTimespanPhase({driver, navigation, requestedUrl}, artifacts);
      expect(artifacts).toEqual({Timespan: expect.any(Promise)});
      await expect(artifacts.Timespan).rejects.toMatchObject({message: 'beforeTimespan rejection'});
      expect(gatherers.timespan.afterTimespan).not.toHaveBeenCalled();
      expect(gatherers.snapshot.afterTimespan).not.toHaveBeenCalled();
    });
  });

  describe('_snapshotPhase', () => {
    /** @type {Record<string, Promise<any>>} */
    let artifacts;

    beforeEach(() => {
      artifacts = {};
    });

    it('should run the snapshot phase of snapshot gatherers', async () => {
      const {navigation, gatherers} = createNavigation();
      await runner._snapshotPhase({driver, navigation, requestedUrl}, artifacts);
      expect(artifacts).toEqual({Snapshot: expect.any(Promise)});
      expect(await artifacts.Snapshot).toEqual({type: 'snapshot'});
      expect(gatherers.timespan.snapshot).not.toHaveBeenCalled();
      expect(gatherers.snapshot.snapshot).toHaveBeenCalled();
    });
  });
});

