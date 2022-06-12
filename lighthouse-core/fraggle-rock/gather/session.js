/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const LHError = require('../../lib/lh-error.js');

// Controls how long to wait for a response after sending a DevTools protocol command.
const DEFAULT_PROTOCOL_TIMEOUT = 30000;

/** @implements {LH.Gatherer.FRProtocolSession} */
class ProtocolSession {
  /**
   * @param {LH.Puppeteer.CDPSession} cdpSession
   */
  constructor(cdpSession) {
    this._cdpSession = cdpSession;
    /** @type {LH.Crdp.Target.TargetInfo|undefined} */
    this._targetInfo = undefined;
    /** @type {number|undefined} */
    this._nextProtocolTimeout = undefined;
    /** @type {WeakMap<any, any>} */
    this._callbackMap = new WeakMap();
  }

  sessionId() {
    return this._targetInfo && this._targetInfo.type === 'iframe' ?
      // TODO: use this._session.id() for real session id.
      this._targetInfo.targetId :
      undefined;
  }

  /** @param {LH.Crdp.Target.TargetInfo} targetInfo */
  setTargetInfo(targetInfo) {
    this._targetInfo = targetInfo;
  }

  /**
   * @return {boolean}
   */
  hasNextProtocolTimeout() {
    return this._nextProtocolTimeout !== undefined;
  }

  /**
   * @return {number}
   */
  getNextProtocolTimeout() {
    return this._nextProtocolTimeout || DEFAULT_PROTOCOL_TIMEOUT;
  }

  /**
   * @param {number} ms
   */
  setNextProtocolTimeout(ms) {
    this._nextProtocolTimeout = ms;
  }

  /**
   * Bind listeners for protocol events.
   * @template {keyof LH.CrdpEvents} E
   * @param {E} eventName
   * @param {(...args: LH.CrdpEvents[E]) => void} callback
   */
  on(eventName, callback) {
    this._cdpSession.on(eventName, /** @type {*} */ (callback));
  }

  /**
   * Bind listeners for protocol events.
   * @template {keyof LH.CrdpEvents} E
   * @param {E} eventName
   * @param {(...args: LH.CrdpEvents[E]) => void} callback
   */
  once(eventName, callback) {
    this._cdpSession.once(eventName, /** @type {*} */ (callback));
  }

  /**
   * Bind to puppeteer's '*' event that fires for *any* protocol event,
   * and wrap it with data about the protocol message instead of just the event.
   * @param {(payload: LH.Protocol.RawEventMessage) => void} callback
   */
  addProtocolMessageListener(callback) {
    /**
     * @param {any} method
     * @param {any} event
     */
    const listener = (method, event) => callback({
      method,
      params: event,
      sessionId: this.sessionId(),
    });
    this._callbackMap.set(callback, listener);
    this._cdpSession.on('*', /** @type {*} */ (listener));
  }

  /**
   * @param {(payload: LH.Protocol.RawEventMessage) => void} callback
   */
  removeProtocolMessageListener(callback) {
    const listener = this._callbackMap.get(callback);
    if (!listener) return;
    this._cdpSession.off('*', /** @type {*} */ (listener));
  }

  /**
   * Bind listeners for protocol events.
   * @template {keyof LH.CrdpEvents} E
   * @param {E} eventName
   * @param {(...args: LH.CrdpEvents[E]) => void} callback
   */
  off(eventName, callback) {
    this._cdpSession.off(eventName, /** @type {*} */ (callback));
  }

  /**
   * @template {keyof LH.CrdpCommands} C
   * @param {C} method
   * @param {LH.CrdpCommands[C]['paramsType']} params
   * @return {Promise<LH.CrdpCommands[C]['returnType']>}
   */
  sendCommand(method, ...params) {
    const timeoutMs = this.getNextProtocolTimeout();
    this._nextProtocolTimeout = undefined;

    /** @type {NodeJS.Timer|undefined} */
    let timeout;
    const timeoutPromise = new Promise((resolve, reject) => {
      if (timeoutMs === Infinity) return;

      timeout = setTimeout(reject, timeoutMs, new LHError(LHError.errors.PROTOCOL_TIMEOUT, {
        protocolMethod: method,
      }));
    });

    const resultPromise = this._cdpSession.send(method, ...params);
    const resultWithTimeoutPromise = Promise.race([resultPromise, timeoutPromise]);

    return resultWithTimeoutPromise.finally(() => {
      if (timeout) clearTimeout(timeout);
    });
  }

  /**
   * Disposes of a session so that it can no longer talk to Chrome.
   * @return {Promise<void>}
   */
  async dispose() {
    this._cdpSession.removeAllListeners();
    await this._cdpSession.detach();
  }
}

module.exports = ProtocolSession;
