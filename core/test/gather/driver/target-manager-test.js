/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const TargetManager = require('../../../gather/driver/target-manager.js');
const {createMockSession} = require('../../fraggle-rock/gather/mock-driver.js');

/* eslint-env jest */

jest.useFakeTimers();

/**
 *
 * @param {{type?: string, targetId?: string}} [overrides]
 * @return {LH.Crdp.Target.TargetInfo}
 */
function createTargetInfo(overrides) {
  return {
    type: 'page',
    targetId: 'page',
    title: '',
    url: '',
    attached: true,
    canAccessOpener: false,
    ...overrides,
  };
}

describe('TargetManager', () => {
  let sessionMock = createMockSession();
  let sendCommandMock = sessionMock.sendCommand;
  let targetManager = new TargetManager(sessionMock.asSession());
  let targetInfo = createTargetInfo();

  beforeEach(() => {
    sessionMock = createMockSession();
    sessionMock.sendCommand
      .mockResponse('Page.enable')
      .mockResponse('Runtime.runIfWaitingForDebugger');
    sendCommandMock = sessionMock.sendCommand;
    targetManager = new TargetManager(sessionMock.asSession());
    targetInfo = createTargetInfo();
  });

  describe('.enable()', () => {
    it('should autoattach to root session', async () => {
      sessionMock.sendCommand
        .mockResponse('Target.getTargetInfo', {targetInfo})
        .mockResponse('Target.setAutoAttach');
      await targetManager.enable();

      const invocations = sendCommandMock.findAllInvocations('Target.setAutoAttach');
      expect(invocations).toHaveLength(1);

      expect(sessionMock.setTargetInfo).toHaveBeenCalledWith(targetInfo);
    });

    it('should autoattach to further unique sessions', async () => {
      sessionMock.sendCommand
        .mockResponse('Target.getTargetInfo', {targetInfo}) // original, attach
        .mockResponse('Target.getTargetInfo', {targetInfo}) // duplicate, no attach
        .mockResponse('Target.getTargetInfo', {targetInfo: {...targetInfo, targetId: '1'}}) // unique, attach
        .mockResponse('Target.getTargetInfo', {targetInfo: {...targetInfo, targetId: '2'}}) // unique, attach

        .mockResponse('Target.setAutoAttach')
        .mockResponse('Target.setAutoAttach')
        .mockResponse('Target.setAutoAttach')

        .mockResponse('Runtime.runIfWaitingForDebugger')
        .mockResponse('Runtime.runIfWaitingForDebugger')
        .mockResponse('Runtime.runIfWaitingForDebugger')
        .mockResponse('Runtime.runIfWaitingForDebugger');
      await targetManager.enable();

      expect(sessionMock.addSessionAttachedListener).toHaveBeenCalled();
      const sessionListener = sessionMock.addSessionAttachedListener.mock.calls[0][0];

      await sessionListener(sessionMock);
      expect(sendCommandMock.findAllInvocations('Target.setAutoAttach')).toHaveLength(1);

      await sessionListener(sessionMock);
      expect(sendCommandMock.findAllInvocations('Target.setAutoAttach')).toHaveLength(2);

      await sessionListener(sessionMock);
      expect(sendCommandMock.findAllInvocations('Target.setAutoAttach')).toHaveLength(3);
    });

    it('should ignore non-frame targets', async () => {
      targetInfo.type = 'worker';
      sessionMock.sendCommand
        .mockResponse('Target.getTargetInfo', {targetInfo})
        .mockResponse('Target.setAutoAttach');
      await targetManager.enable();

      const invocations = sendCommandMock.findAllInvocations('Target.setAutoAttach');
      expect(invocations).toHaveLength(0);
    });

    it('should fire listeners before target attached', async () => {
      sessionMock.sendCommand
        .mockResponse('Target.getTargetInfo', {targetInfo})
        .mockResponse('Target.setAutoAttach');
      targetManager.addTargetAttachedListener(jest.fn().mockImplementation(() => {
        const setAutoAttachCalls = sessionMock.sendCommand.mock.calls
          .filter(call => call[0] === 'Target.setAutoAttach');
        expect(setAutoAttachCalls).toHaveLength(0);
      }));
      await targetManager.enable();
    });

    it('should handle target closed gracefully', async () => {
      sessionMock.sendCommand.mockResponse('Target.getTargetInfo', {targetInfo});
      const targetClosedError = new Error('Target closed');
      targetManager.addTargetAttachedListener(jest.fn().mockRejectedValue(targetClosedError));
      await targetManager.enable();
    });

    it('should throw other listener errors', async () => {
      sessionMock.sendCommand.mockResponse('Target.getTargetInfo', {targetInfo});
      const targetClosedError = new Error('Fatal error');
      targetManager.addTargetAttachedListener(jest.fn().mockRejectedValue(targetClosedError));
      await expect(targetManager.enable()).rejects.toMatchObject({message: 'Fatal error'});
    });

    it('should resume the target when finished', async () => {
      sessionMock.sendCommand.mockResponse('Target.getTargetInfo', {});
      await targetManager.enable();

      const invocations = sendCommandMock.findAllInvocations('Runtime.runIfWaitingForDebugger');
      expect(invocations).toHaveLength(1);
    });

    it('should autoattach on main frame navigation', async () => {
      sessionMock.sendCommand
        .mockResponse('Target.getTargetInfo', {targetInfo})
        .mockResponse('Target.setAutoAttach')
        .mockResponse('Target.setAutoAttach');
      await targetManager.enable();

      const onFrameNavigation = sessionMock.on.getListeners('Page.frameNavigated')[0];
      onFrameNavigation({frame: {}}); // note the lack of a `parentId`

      const invocations = sendCommandMock.findAllInvocations('Target.setAutoAttach');
      expect(invocations).toHaveLength(2);
    });

    it('should not autoattach on subframe navigation', async () => {
      sessionMock.sendCommand
        .mockResponse('Target.getTargetInfo', {targetInfo})
        .mockResponse('Target.setAutoAttach')
        .mockResponse('Target.setAutoAttach');
      await targetManager.enable();

      const onFrameNavigation = sessionMock.on.getListeners('Page.frameNavigated')[0];
      onFrameNavigation({frame: {parentId: 'root'}});

      const invocations = sendCommandMock.findAllInvocations('Target.setAutoAttach');
      expect(invocations).toHaveLength(1);
    });

    it('should be idempotent', async () => {
      sessionMock.sendCommand
        .mockResponse('Target.getTargetInfo', {targetInfo})
        .mockResponse('Target.setAutoAttach');
      await targetManager.enable();
      await targetManager.enable();
      await targetManager.enable();

      const invocations = sendCommandMock.findAllInvocations('Target.setAutoAttach');
      expect(invocations).toHaveLength(1);
    });
  });

  describe('.disable()', () => {
    it('should uninstall listeners', async () => {
      await targetManager.disable();

      expect(sessionMock.off).toHaveBeenCalled();
      expect(sessionMock.removeSessionAttachedListener).toHaveBeenCalled();
    });
  });
});
