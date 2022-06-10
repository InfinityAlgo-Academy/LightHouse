/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
  * @fileoverview This class tracks multiple targets (the page itself and its OOPIFs) and allows consumers to
  * listen for protocol events before each target is resumed.
  */

const log = require('lighthouse-logger');
const ProtocolSession = require('../../fraggle-rock/gather/session.js');

/** @typedef {{target: LH.Crdp.Target.TargetInfo, session: LH.Gatherer.FRProtocolSession}} TargetWithSession */

class TargetManager {
  /** @param {LH.Puppeteer.CDPSession} cdpSession */
  constructor(cdpSession) {
    this._enabled = false;
    this._rootCdpSession = cdpSession;

    /** @type {Array<(targetWithSession: TargetWithSession) => Promise<void>|void>} */
    this._listeners = [];

    this._onSessionAttached = this._onSessionAttached.bind(this);

    /** @type {Map<string, TargetWithSession>} */
    this._targetIdToTargets = new Map();

    /** @param {LH.Crdp.Page.FrameNavigatedEvent} event */
    this._onFrameNavigated = async event => {
      // Child frames are handled in `_onSessionAttached`.
      if (event.frame.parentId) return;

      // It's not entirely clear when this is necessary, but when the page switches processes on
      // navigating from about:blank to the `requestedUrl`, resetting `setAutoAttach` has been
      // necessary in the past.
      await this._rootCdpSession.send('Target.setAutoAttach', {
        autoAttach: true,
        flatten: true,
        waitForDebuggerOnStart: true,
      });
    };
  }

  /**
   * @param {LH.Puppeteer.CDPSession} cdpSession
   */
  async _onSessionAttached(cdpSession) {
    const session = new ProtocolSession(cdpSession);

    try {
      const target = await session.sendCommand('Target.getTargetInfo').catch(() => null);
      const targetType = target?.targetInfo?.type;
      const hasValidTargetType = targetType === 'page' || targetType === 'iframe';
      if (!target || !hasValidTargetType) return;

      const targetId = target.targetInfo.targetId;
      session.setTargetInfo(target.targetInfo);
      if (this._targetIdToTargets.has(targetId)) return;

      const targetName = target.targetInfo.url || target.targetInfo.targetId;
      log.verbose('target-manager', `target ${targetName} attached`);

      const targetWithSession = {target: target.targetInfo, session};
      this._targetIdToTargets.set(targetId, targetWithSession);
      for (const listener of this._listeners) await listener(targetWithSession);

      await session.sendCommand('Target.setAutoAttach', {
        autoAttach: true,
        flatten: true,
        waitForDebuggerOnStart: true,
      });
    } catch (err) {
      // Sometimes targets can be closed before we even have a chance to listen to their network activity.
      if (/Target closed/.test(err.message)) return;

      throw err;
    } finally {
      // Resume the target if it was paused, but if it's unnecessary, we don't care about the error.
      await session.sendCommand('Runtime.runIfWaitingForDebugger').catch(() => {});
    }
  }

  /**
   * @return {Promise<void>}
   */
  async enable() {
    if (this._enabled) return;

    this._enabled = true;
    this._targetIdToTargets = new Map();

    this._rootCdpSession.on('Page.frameNavigated', this._onFrameNavigated);

    const rootConnection = this._rootCdpSession.connection();
    if (!rootConnection) {
      throw new Error('Connection has been closed.');
    }
    rootConnection.on('sessionattached', this._onSessionAttached);

    await this._rootCdpSession.send('Page.enable');

    // Start with the already attached root session.
    await this._onSessionAttached(this._rootCdpSession);
  }

  /**
   * @return {Promise<void>}
   */
  async disable() {
    this._rootCdpSession.off('Page.frameNavigated', this._onFrameNavigated);
    // No need to remove listener if connection is already closed.
    this._rootCdpSession.connection()?.off('sessionattached', this._onSessionAttached);

    this._enabled = false;
    this._targetIdToTargets = new Map();
  }

  /**
   * @param {(targetWithSession: TargetWithSession) => Promise<void>|void} listener
   */
  addTargetAttachedListener(listener) {
    this._listeners.push(listener);
  }

  /**
   * @param {(targetWithSession: TargetWithSession) => Promise<void>|void} listener
   */
  removeTargetAttachedListener(listener) {
    this._listeners = this._listeners.filter(entry => entry !== listener);
  }
}

module.exports = TargetManager;
