/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const emulation = require('../../lib/emulation.js');
const Driver = require('../../gather/driver.js');
const constants = require('../../config/constants.js');
const Connection = require('../../gather/connections/connection.js');
const {createMockSendCommandFn} = require('../gather/mock-commands.js');

/* eslint-env jest */

describe('emulation', () => {
  describe('emulate', () => {
    let driver;
    let connectionStub;

    beforeEach(() => {
      connectionStub = new Connection();
      connectionStub.sendCommand = cmd => {
        throw new Error(`${cmd} not implemented`);
      };
      driver = new Driver(connectionStub);

      connectionStub.sendCommand = createMockSendCommandFn()
        .mockResponse('Network.enable')
        .mockResponse('Network.setUserAgentOverride')
        .mockResponse('Emulation.setDeviceMetricsOverride')
        .mockResponse('Emulation.setTouchEmulationEnabled');
    });

    /**
     * @param {LH.SharedFlagsSettings['formFactor']} formFactor
     * @param {LH.SharedFlagsSettings['screenEmulation']} screenEmulation
     * @param {LH.SharedFlagsSettings['emulatedUserAgent']} emulatedUserAgent
     */
    const getSettings = (formFactor, screenEmulation, emulatedUserAgent) => ({
      formFactor: formFactor,
      screenEmulation,
      emulatedUserAgent: emulatedUserAgent === undefined ? constants.userAgents[formFactor] : false,
    });

    const metrics = constants.screenEmulationMetrics;

    it('default: mobile w/ screenEmulation', async () => {
      await emulation.emulate(driver, getSettings('mobile', metrics.mobile));

      const uaArgs = connectionStub.sendCommand.findInvocation('Network.setUserAgentOverride');
      expect(uaArgs).toMatchObject({userAgent: constants.userAgents.mobile});

      const emulateArgs = connectionStub.sendCommand.findInvocation(
        'Emulation.setDeviceMetricsOverride'
      );
      expect(emulateArgs).toMatchObject({mobile: true});
    });

    it('default desktop: w/ desktop screen emu', async () => {
      await emulation.emulate(driver, getSettings('desktop', metrics.desktop));

      const uaArgs = connectionStub.sendCommand.findInvocation('Network.setUserAgentOverride');
      expect(uaArgs).toMatchObject({userAgent: constants.userAgents.desktop});

      const emulateArgs = connectionStub.sendCommand.findInvocation(
        'Emulation.setDeviceMetricsOverride'
      );
      expect(emulateArgs).toMatchObject({
        mobile: metrics.desktop.mobile,
        width: metrics.desktop.width,
        height: metrics.desktop.height,
        deviceScaleFactor: metrics.desktop.deviceScaleFactor,
      });
      expect(emulateArgs).toMatchObject({mobile: false});
    });

    it('mobile but screenEmu disabled (scenarios: on-device or external emu applied)', async () => {
      await emulation.emulate(driver, getSettings('mobile', false));
      const uaArgs = connectionStub.sendCommand.findInvocation('Network.setUserAgentOverride');
      expect(uaArgs).toMatchObject({userAgent: constants.userAgents.mobile});

      expect(connectionStub.sendCommand).not.toHaveBeenCalledWith(
        'Emulation.setDeviceMetricsOverride',
        expect.anything()
      );
    });

    it('desktop but screenEmu disabled (scenario: DevTools  or external emu applied)', async () => {
      await emulation.emulate(driver, getSettings('desktop', false));
      const uaArgs = connectionStub.sendCommand.findInvocation('Network.setUserAgentOverride');
      expect(uaArgs).toMatchObject({userAgent: constants.userAgents.desktop});

      expect(connectionStub.sendCommand).not.toHaveBeenCalledWith(
        'Emulation.setDeviceMetricsOverride',
        expect.anything()
      );
    });

    it('mobile but UA emu disabled', async () => {
      await emulation.emulate(driver, getSettings('mobile', metrics.mobile, false));

      expect(connectionStub.sendCommand).not.toHaveBeenCalledWith(
        'Network.setUserAgentOverride',
        expect.anything()
      );

      const emulateArgs = connectionStub.sendCommand.findInvocation(
        'Emulation.setDeviceMetricsOverride'
      );
      expect(emulateArgs).toMatchObject({
        mobile: metrics.mobile.mobile,
        width: metrics.mobile.width,
        height: metrics.mobile.height,
        deviceScaleFactor: metrics.mobile.deviceScaleFactor,
      });
      expect(emulateArgs).toMatchObject({mobile: true});
    });

    it('desktop but UA emu disabled', async () => {
      await emulation.emulate(driver, getSettings('desktop', metrics.desktop, false));

      expect(connectionStub.sendCommand).not.toHaveBeenCalledWith(
        'Network.setUserAgentOverride',
        expect.anything()
      );

      const emulateArgs = connectionStub.sendCommand.findInvocation(
        'Emulation.setDeviceMetricsOverride'
      );
      expect(emulateArgs).toMatchObject({
        mobile: metrics.desktop.mobile,
        width: metrics.desktop.width,
        height: metrics.desktop.height,
        deviceScaleFactor: metrics.desktop.deviceScaleFactor,
      });
      expect(emulateArgs).toMatchObject({mobile: false});
    });
  });
});
