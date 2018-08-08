/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const EventEmitter = require('events').EventEmitter;
const log = require('lighthouse-logger');
const LHError = require('../../lib/errors');

/**
 * @typedef {LH.StrictEventEmitter<{'protocolevent': LH.Protocol.RawEventMessage}>} CrdpEventMessageEmitter
 * @typedef {LH.CrdpCommands[keyof LH.CrdpCommands]} CommandInfo
 * @typedef {{resolve: function(Promise<CommandInfo['returnType']>): void, method: keyof LH.CrdpCommands, options: {silent?: boolean}}} CommandCallback
 */

class Connection {
  constructor() {
    this._lastCommandId = 0;
    /** @type {Map<number, CommandCallback>} */
    this._callbacks = new Map();

    /** @type {?CrdpEventMessageEmitter} */
    this._eventEmitter = new EventEmitter();
  }

  /**
   * @return {Promise<void>}
   */
  connect() {
    return Promise.reject(new Error('Not implemented'));
  }

  /**
   * @return {Promise<void>}
   */
  disconnect() {
    return Promise.reject(new Error('Not implemented'));
  }

  /**
   * @return {Promise<string>}
   */
  wsEndpoint() {
    return Promise.reject(new Error('Not implemented'));
  }

  /**
   * Bind listeners for connection events.
   * @param {'protocolevent'} eventName
   * @param {function(LH.Protocol.RawEventMessage): void} cb
   */
  on(eventName, cb) {
    if (eventName !== 'protocolevent') {
      throw new Error('Only supports "protocolevent" events');
    }

    if (!this._eventEmitter) {
      throw new Error('Attempted to add event listener after connection disposed.');
    }
    this._eventEmitter.on(eventName, cb);
  }

  /* eslint-disable no-unused-vars */

  /**
   * @param {string} message
   * @protected
   */
  sendRawMessage(message) {
    throw new Error('Not implemented');
  }

  /* eslint-enable no-unused-vars */

  /**
   * @param {string} message
   * @return {void}
   * @protected
   */
  handleRawMessage(message) {
    const object = /** @type {LH.Protocol.RawMessage} */(JSON.parse(message));

    // Responses to commands carry "id" property, while events do not.
    if (!('id' in object)) {
      log.formatProtocol('<= event',
          {method: object.method, params: object.params}, 'verbose');
      this.emitProtocolEvent(object);
      return;
    }

    const callback = this._callbacks.get(object.id);
    if (callback) {
      this._callbacks.delete(object.id);

      // @ts-ignore since can't convince compiler that callback.resolve's return
      // type and object.result are matching since only linked by object.id.
      return callback.resolve(Promise.resolve().then(_ => {
        if (object.error) {
          const logLevel = callback.options.silent ? 'verbose' : 'error';
          log.formatProtocol('method <= browser ERR', {method: callback.method}, logLevel);
          throw LHError.fromProtocolMessage(callback.method, object.error);
        }

        log.formatProtocol('method <= browser OK',
          {method: callback.method, params: object.result}, 'verbose');
        return object.result;
      }));
    } else {
      // In DevTools we receive responses to commands we did not send which we cannot act on, so we
      // just log these occurrences.
      const error = object.error && object.error.message;
      log.formatProtocol(`disowned method <= browser ${error ? 'ERR' : 'OK'}`,
          {method: 'UNKNOWN', params: error || object.result}, 'verbose');
    }
  }

  /**
   * @param {LH.Protocol.RawEventMessage} eventMessage
   */
  emitProtocolEvent(eventMessage) {
    if (!this._eventEmitter) {
      throw new Error('Attempted to emit event after connection disposed.');
    }

    this._eventEmitter.emit('protocolevent', eventMessage);
  }

  /**
   * @protected
   */
  dispose() {
    if (this._eventEmitter) {
      this._eventEmitter.removeAllListeners();
      this._eventEmitter = null;
    }
  }
}

// Declared outside class body because function expressions can be typed via coercive @type
/**
 * Looser-typed internal implementation of `Connection.sendCommand` which is
 * strictly typed externally on exposed Connection interface. See
 * `Driver.sendCommand` for explanation.
 * @this {Connection}
 * @param {keyof LH.CrdpCommands} method
 * @param {CommandInfo['paramsType']=} params,
 * @param {{silent?: boolean}=} cmdOpts
 * @return {Promise<CommandInfo['returnType']>}
 */
function _sendCommand(method, params, cmdOpts = {}) {
  /* eslint-disable no-invalid-this */
  log.formatProtocol('method => browser', {method, params}, 'verbose');
  const id = ++this._lastCommandId;
  const message = JSON.stringify({id, method, params});
  this.sendRawMessage(message);
  return new Promise(resolve => {
    this._callbacks.set(id, {resolve, method, options: cmdOpts});
  });
  /* eslint-enable no-invalid-this */
}

/**
 * Call protocol methods.
 * @type {LH.Protocol.SendCommand}
 */
Connection.prototype.sendCommand = _sendCommand;

module.exports = Connection;
