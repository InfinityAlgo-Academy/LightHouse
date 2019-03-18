/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
// eslint-disable-next-line spaced-comment
/// <reference types="chrome" />
'use strict';

const Connection = require('./connection.js');
const log = require('lighthouse-logger');

/* globals chrome */

class ExtensionConnection extends Connection {
  constructor() {
    super();
    this._tabId = null;
    /** @type {Set<string>} */
    this._attachedTargetIds = new Set();

    this._onEvent = this._onEvent.bind(this);
    this._onUnexpectedDetach = this._onUnexpectedDetach.bind(this);
  }

  /**
   * @param {chrome.debugger.Debuggee} source
   * @param {string} method
   * @param {object=} params
   * @private
   */
  _onEvent(source, method, params) {
    // log events received
    log.log('<=', method, params);

    // Warning: type cast, assuming that debugger API is giving us a valid protocol event.
    // Must be cast together since types of `params` and `method` come as a pair.
    const eventMessage = /** @type {LH.Protocol.RawEventMessage} */({method, params});
    this.emitProtocolEvent(eventMessage);
  }

  /**
   * @private
   * @param {chrome.debugger.Debuggee} debuggee
   * @return {Promise<void>}
   */
  async _attachIfNecessary(debuggee) {
    if (debuggee.tabId && this._tabId !== null) return;
    if (debuggee.targetId && this._attachedTargetIds.has(debuggee.targetId)) return;

    if (debuggee.targetId) chrome.debugger.getTargets(console.log)

    return new Promise((resolve, reject) => {
      chrome.debugger.attach(debuggee, '1.1', () => {
        if (chrome.runtime.lastError) {
          return reject(new Error(chrome.runtime.lastError.message));
        }

        if (debuggee.tabId) this._tabId = debuggee.tabId;
        if (debuggee.targetId) this._attachedTargetIds.add(debuggee.targetId);
        resolve();
      });
    });
  }

  /**
   * @private
   * @param {chrome.debugger.Debuggee} debuggee
   * @return {Promise<void>}
   */
  async _detachIfNecessary(debuggee) {
    if (debuggee.tabId && this._tabId === null) return;
    if (debuggee.targetId && !this._attachedTargetIds.has(debuggee.targetId)) return;

    return new Promise((resolve, reject) => {
      chrome.debugger.detach(debuggee, () => {
        if (chrome.runtime.lastError) {
          return reject(new Error(chrome.runtime.lastError.message));
        }

        if (debuggee.tabId) this._tabId = null;
        if (debuggee.targetId) this._attachedTargetIds.delete(debuggee.targetId);
        resolve();
      });
    })
  }

  /**
   * @param {chrome.debugger.Debuggee} source
   * @param {string} detachReason
   * @return {never}
   * @private
   */
  _onUnexpectedDetach(source, detachReason) {
    if (source.tabId) this._tabId = null;
    if (source.targetId) this._attachedTargetIds.delete(source.targetId);
    this._detachCleanup();
    throw new Error('Lighthouse detached from browser: ' + detachReason);
  }

  /**
   * @private
   * @return {Promise<void>}
   */
  async _detachCleanup() {
    chrome.debugger.onEvent.removeListener(this._onEvent);
    chrome.debugger.onDetach.removeListener(this._onUnexpectedDetach);

    if (this._tabId) await this._detachIfNecessary({tabId: this._tabId});
    for (const targetId of this._attachedTargetIds) {
      await this._detachIfNecessary({targetId});
    }

    this.dispose();
  }

  /**
   * @override
   * @return {Promise<void>}
   */
  async connect() {
    if (this._tabId !== null) {
      return Promise.resolve();
    }

    const tabId = await this._getCurrentTabId();
    chrome.debugger.onEvent.addListener(this._onEvent);
    chrome.debugger.onDetach.addListener(this._onUnexpectedDetach);
    await this._attachIfNecessary({tabId});
  }

  /**
   * @override
   * @return {Promise<void>}
   */
  async disconnect() {
    if (this._tabId === null) {
      log.warn('ExtensionConnection', 'disconnect() was called without an established connection.');
      return Promise.resolve();
    }

    const tabId = this._tabId;
    await this._detachIfNecessary({tabId});
    // Reload the target page to restore its state.
    chrome.tabs.reload(tabId);
    await this._detachCleanup();
  }

  /**
   * Call protocol methods.
   * @template {keyof LH.CrdpCommands} C
   * @param {C} method
   * @param {{sessionId: string, targetId: string}|undefined} target
   * @param {LH.CrdpCommands[C]['paramsType']} paramArgs,
   * @return {Promise<LH.CrdpCommands[C]['returnType']>}
   */
  async sendCommand(method, target, ...paramArgs) {
    if (!this._tabId) {
      log.error('ExtensionConnection', 'No tabId set for sendCommand');
      throw new Error('No tabId set for sendCommand');
    }

    // Reify params since we need it as a property so can't just spread again.
    const params = paramArgs.length ? paramArgs[0] : undefined;

    /** @type {chrome.debugger.Debuggee} */
    const debuggerTarget = target ? {targetId: target.targetId} : {tabId: this._tabId};
    // Make sure we're attached to the target
    await this._attachIfNecessary(debuggerTarget);

    return new Promise((resolve, reject) => {
      log.formatProtocol('method => browser', {method, params}, 'verbose');
      chrome.debugger.sendCommand(debuggerTarget, method, params || {}, result => {
        if (chrome.runtime.lastError) {
          // The error from the extension has a `message` property that is the
          // stringified version of the actual protocol error object.
          const message = chrome.runtime.lastError.message || '';
          let errorMessage;
          try {
            errorMessage = JSON.parse(message).message;
          } catch (e) {}
          errorMessage = errorMessage || message || 'Unknown debugger protocol error.';

          log.formatProtocol('method <= browser ERR', {method}, 'error');
          return reject(new Error(`Protocol error (${method}): ${errorMessage}`));
        }

        log.formatProtocol('method <= browser OK', {method, params: result}, 'verbose');
        resolve(result);
      });
    });
  }

  /**
   * @return {Promise<chrome.tabs.Tab>}
   * @private
   */
  _queryCurrentTab() {
    return new Promise((resolve, reject) => {
      const queryOpts = {
        active: true,
        currentWindow: true,
      };

      chrome.tabs.query(queryOpts, (tabs => {
        if (chrome.runtime.lastError) {
          return reject(chrome.runtime.lastError);
        }

        const errMessage = 'Couldn\'t resolve current tab. Check your URL, reload, and try again.';
        if (tabs.length === 0) {
          return reject(new Error(errMessage));
        }
        if (tabs.length > 1) {
          log.warn('ExtensionConnection', '_queryCurrentTab returned multiple tabs');
        }

        const firstUrledTab = tabs.find(tab => !!tab.url);
        if (!firstUrledTab) {
          const tabIds = tabs.map(tab => tab.id).join(', ');
          const message = errMessage + ` Found ${tabs.length} tab(s) with id(s) [${tabIds}].`;
          return reject(new Error(message));
        }

        resolve(firstUrledTab);
      }));
    });
  }

  /**
   * @return {Promise<number>}
   * @private
   */
  _getCurrentTabId() {
    return this._queryCurrentTab().then(tab => {
      if (tab.id === undefined) {
        throw new Error('Unable to resolve current tab ID. Check the tab, reload, and try again.');
      }

      return tab.id;
    });
  }

  /**
   * Used by extension-entry to kick off the run on the current page
   * @return {Promise<string>}
   */
  getCurrentTabURL() {
    return this._queryCurrentTab().then(tab => {
      if (!tab.url) {
        log.error('ExtensionConnection', 'getCurrentTabURL returned empty string', tab);
        throw new Error('getCurrentTabURL returned empty string');
      }
      return tab.url;
    });
  }
}

module.exports = ExtensionConnection;
