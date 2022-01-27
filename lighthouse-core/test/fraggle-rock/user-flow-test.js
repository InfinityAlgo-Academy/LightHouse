/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

const snapshotModule = {snapshot: jest.fn()};
jest.mock('../../fraggle-rock/gather/snapshot-runner.js', () => snapshotModule);
const navigationModule = {navigation: jest.fn()};
jest.mock('../../fraggle-rock/gather/navigation-runner.js', () => navigationModule);
const timespanModule = {startTimespan: jest.fn()};
jest.mock('../../fraggle-rock/gather/timespan-runner.js', () => timespanModule);

const {createMockPage} = require('./gather/mock-driver.js');
const UserFlow = require('../../fraggle-rock/user-flow.js');

describe('UserFlow', () => {
  let mockPage = createMockPage();

  beforeEach(() => {
    mockPage = createMockPage();
    const lhr = {finalUrl: 'https://www.example.com'};

    snapshotModule.snapshot.mockReset();
    snapshotModule.snapshot.mockResolvedValue({lhr: {...lhr, gatherMode: 'snapshot'}});

    navigationModule.navigation.mockReset();
    navigationModule.navigation.mockResolvedValue({lhr: {...lhr, gatherMode: 'navigation'}});

    const timespanLhr = {...lhr, gatherMode: 'timespan'};
    const timespan = {endTimespan: jest.fn().mockResolvedValue({lhr: timespanLhr})};
    timespanModule.startTimespan.mockReset();
    timespanModule.startTimespan.mockResolvedValue(timespan);
  });

  describe('.navigate()', () => {
    it('should throw if a timespan is active', async () => {
      const flow = new UserFlow(mockPage.asPage());
      await flow.startTimespan();
      await expect(flow.navigate('https://example.com')).rejects.toBeTruthy();
    });

    it('should invoke navigation runner', async () => {
      const flow = new UserFlow(mockPage.asPage());

      await flow.navigate('https://example.com/1', {stepName: 'My Step'});

      const configContext = {settingsOverrides: {maxWaitForLoad: 1000}};
      await flow.navigate('https://example.com/2', {configContext});

      await flow.navigate('https://example.com/3');

      expect(navigationModule.navigation).toHaveBeenCalledTimes(3);
      expect(flow.steps).toMatchObject([
        {name: 'My Step', lhr: {finalUrl: 'https://www.example.com'}},
        {name: 'Navigation report (www.example.com/)', lhr: {finalUrl: 'https://www.example.com'}},
        {name: 'Navigation report (www.example.com/)', lhr: {finalUrl: 'https://www.example.com'}},
      ]);
    });

    it('should disable storage reset on subsequent navigations', async () => {
      const flow = new UserFlow(mockPage.asPage());
      await flow.navigate('https://example.com/1');

      // Try once when we have some other settings.
      const configContext = {settingsOverrides: {maxWaitForLoad: 1000}};
      await flow.navigate('https://example.com/2', {configContext});

      // Try once when we don't have any other settings.
      await flow.navigate('https://example.com/3');

      // Try once when we explicitly set it.
      const configContextExplicit = {settingsOverrides: {disableStorageReset: false}};
      await flow.navigate('https://example.com/4', {configContext: configContextExplicit});

      // Check that we have the property set.
      expect(navigationModule.navigation).toHaveBeenCalledTimes(4);
      const [[call1], [call2], [call3], [call4]] = navigationModule.navigation.mock.calls;
      expect(call1).not.toHaveProperty('configContext.settingsOverrides.disableStorageReset');
      expect(call2).toHaveProperty('configContext.settingsOverrides.disableStorageReset');
      expect(call3).toHaveProperty('configContext.settingsOverrides.disableStorageReset');
      expect(call4).toHaveProperty('configContext.settingsOverrides.disableStorageReset');
      expect(call2.configContext.settingsOverrides.disableStorageReset).toBe(true);
      expect(call3.configContext.settingsOverrides.disableStorageReset).toBe(true);
      expect(call4.configContext.settingsOverrides.disableStorageReset).toBe(false);

      // Check that we didn't mutate the original objects.
      expect(configContext).toEqual({settingsOverrides: {maxWaitForLoad: 1000}});
      expect(configContextExplicit).toEqual({settingsOverrides: {disableStorageReset: false}});
    });

    it('should disable about:blank jumps by default', async () => {
      const flow = new UserFlow(mockPage.asPage());
      await flow.navigate('https://example.com/1');

      // Try once when we have some other settings.
      const configContext = {settingsOverrides: {maxWaitForLoad: 1000}};
      await flow.navigate('https://example.com/2', {configContext});

      // Try once when we explicitly set it.
      const configContextExplicit = {skipAboutBlank: false};
      await flow.navigate('https://example.com/3', {configContext: configContextExplicit});

      // Check that we have the property set.
      expect(navigationModule.navigation).toHaveBeenCalledTimes(3);
      const [[call1], [call2], [call3]] = navigationModule.navigation.mock.calls;
      expect(call1).toHaveProperty('configContext.skipAboutBlank');
      expect(call2).toHaveProperty('configContext.skipAboutBlank');
      expect(call3).toHaveProperty('configContext.skipAboutBlank');
      expect(call1.configContext.skipAboutBlank).toBe(true);
      expect(call2.configContext.skipAboutBlank).toBe(true);
      expect(call3.configContext.skipAboutBlank).toBe(false);

      // Check that we didn't mutate the original objects.
      expect(configContext).toEqual({settingsOverrides: {maxWaitForLoad: 1000}});
      expect(configContextExplicit).toEqual({skipAboutBlank: false});
    });
  });

  describe('.startTimespan()', () => {
    it('should throw if a timespan is active', async () => {
      const flow = new UserFlow(mockPage.asPage());
      await flow.startTimespan();
      await expect(flow.startTimespan()).rejects.toBeTruthy();
    });

    it('should invoke timespan runner', async () => {
      const flow = new UserFlow(mockPage.asPage());

      await flow.startTimespan({stepName: 'My Timespan'});
      await flow.endTimespan();

      await flow.startTimespan();
      await flow.endTimespan();

      expect(timespanModule.startTimespan).toHaveBeenCalledTimes(2);
      expect(flow.steps).toMatchObject([
        {name: 'My Timespan', lhr: {finalUrl: 'https://www.example.com'}},
        {name: 'Timespan report (www.example.com/)', lhr: {finalUrl: 'https://www.example.com'}},
      ]);
    });
  });

  describe('.endTimespan()', () => {
    it('should throw if a timespan has not started', async () => {
      const flow = new UserFlow(mockPage.asPage());
      await expect(flow.endTimespan()).rejects.toBeTruthy();
    });
  });

  describe('.snapshot()', () => {
    it('should throw if a timespan is active', async () => {
      const flow = new UserFlow(mockPage.asPage());
      await flow.startTimespan();
      await expect(flow.snapshot()).rejects.toBeTruthy();
    });

    it('should invoke snapshot runner', async () => {
      const flow = new UserFlow(mockPage.asPage());

      await flow.snapshot({stepName: 'My Snapshot'});
      await flow.snapshot();

      expect(snapshotModule.snapshot).toHaveBeenCalledTimes(2);
      expect(flow.steps).toMatchObject([
        {name: 'My Snapshot', lhr: {finalUrl: 'https://www.example.com'}},
        {name: 'Snapshot report (www.example.com/)', lhr: {finalUrl: 'https://www.example.com'}},
      ]);
    });
  });
});
