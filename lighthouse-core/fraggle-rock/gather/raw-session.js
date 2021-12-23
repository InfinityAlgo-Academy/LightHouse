/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const EventEmitter = require('events').EventEmitter;
const LHError = require('../../lib/lh-error.js');

// Controls how long to wait for a response after sending a DevTools protocol command.
const DEFAULT_PROTOCOL_TIMEOUT = 30000;

/** @implements {LH.Gatherer.FRProtocolSession} */
class RawSession {
  /**
   * @param {import('../../gather/connections/connection.js')} connection
   * @param {string=} sessionId
   */
  constructor(connection, sessionId) {
    this._connection = connection;
    this._sessionId = sessionId;
    this._eventEmitter =
      /** @type {LH.Protocol.StrictEventEmitter<LH.CrdpEvents>} */ (new EventEmitter());
    /** @type {LH.Crdp.Target.TargetInfo|undefined} */
    this._targetInfo = undefined;
    /** @type {number|undefined} */
    this._nextProtocolTimeout = undefined;
    /** @type {WeakMap<any, any>} */
    this._callbackMap = new WeakMap();

    this.addProtocolMessageListener(this._handleProtocolEvent.bind(this));
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
    this._eventEmitter.on(eventName, callback);
  }

  /**
   * Bind listeners for protocol events.
   * @template {keyof LH.CrdpEvents} E
   * @param {E} eventName
   * @param {(...args: LH.CrdpEvents[E]) => void} callback
   */
  once(eventName, callback) {
    this._eventEmitter.once(eventName, callback);
  }

  /**
   * @param {(session: RawSession) => void} callback
   */
  addSessionAttachedListener(callback) {
    /** @param {LH.Crdp.Target.AttachedToTargetEvent} event */
    const listener = event => callback(new RawSession(this._connection, event.sessionId));
    this._callbackMap.set(callback, listener);
    this.on('Target.attachedToTarget', listener);
  }

  /**
   * @param {(session: RawSession) => void} callback
   */
  removeSessionAttachedListener(callback) {
    const listener = this._callbackMap.get(callback);
    if (!listener) return;
    this.off('Target.attachedToTarget', listener);
  }

  /**
   * Bind to *any* protocol event.
   * @param {(payload: LH.Protocol.RawEventMessage) => void} callback
   */
  addProtocolMessageListener(callback) {
    this._connection.on('protocolevent', callback);
  }

  /**
   * Unbind to *any* protocol event.
   * @param {(payload: LH.Protocol.RawEventMessage) => void} callback
   */
  removeProtocolMessageListener(callback) {
    this._connection.off('protocolevent', callback);
  }

  /**
   * Bind listeners for protocol events.
   * @template {keyof LH.CrdpEvents} E
   * @param {E} eventName
   * @param {(...args: LH.CrdpEvents[E]) => void} callback
   */
  off(eventName, callback) {
    this._eventEmitter.off(eventName, callback);
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

    const resultPromise = this._connection.sendCommand(method, this._sessionId, ...params);
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
    if (this._sessionId) {
      await this.sendCommand('Target.detachFromTarget', {
        sessionId: this._sessionId,
      });
    } else {
      await this._connection.disconnect();
    }
  }

  /**
   * @param {LH.Protocol.RawEventMessage} event
   */
  _handleProtocolEvent(event) {
    // @ts-expect-error TODO(bckenny): tsc can't type event.params correctly yet,
    // typing as property of union instead of narrowing from union of
    // properties. See https://github.com/Microsoft/TypeScript/pull/22348.
    this._eventEmitter.emit(event.method, event.params);
  }
}

module.exports = RawSession;
