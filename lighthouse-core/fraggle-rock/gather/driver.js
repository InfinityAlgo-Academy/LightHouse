/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const log = require('lighthouse-logger');
const ExecutionContext = require('../../gather/driver/execution-context.js');
const Fetcher = require('../../gather/fetcher.js');

/** @return {*} */
const throwNotConnectedFn = () => {
  throw new Error('Session not connected');
};

/** @implements {LH.Gatherer.FRTransitionalDriver} */
class Driver {
  /**
   * @param {LH.Gatherer.FRProtocolSession} session
   */
  constructor(session) {
    /** @type {LH.Gatherer.FRProtocolSession} */
    this._session = this.defaultSession = session;
    /** @type {ExecutionContext|undefined} */
    this._executionContext = undefined;
    /** @type {Fetcher|undefined} */
    this._fetcher = undefined;

    this._onFrameNavigated = this._onFrameNavigated.bind(this);
  }

  /** @return {LH.Gatherer.FRTransitionalDriver['executionContext']} */
  get executionContext() {
    if (!this._executionContext) return throwNotConnectedFn();
    return this._executionContext;
  }

  /** @return {Fetcher} */
  get fetcher() {
    if (!this._fetcher) return throwNotConnectedFn();
    return this._fetcher;
  }

  /** @return {Promise<string>} */
  async url() {
    if (!this._url) return throwNotConnectedFn();
    return this._url;
  }

  /** @return {Promise<void>} */
  async connect() {
    const status = {msg: 'Connecting to browser', id: 'lh:driver:connect'};
    log.time(status);
    const {frameTree} = await this._session.sendCommand('Page.getFrameTree');
    this._url = frameTree.frame.url + (frameTree.frame.urlFragment || '');
    this.defaultSession.on('Page.frameNavigated', this._onFrameNavigated);

    this._executionContext = new ExecutionContext(this._session);
    this._fetcher = new Fetcher(this._session, this._executionContext);
    log.timeEnd(status);
  }

  /** @return {Promise<void>} */
  async disconnect() {
    this.defaultSession.off('Page.frameNavigated', this._onFrameNavigated);
    if (!this._session) return;
    // await this._session.dispose();
  }

  /**
   *
   * @param {LH.Crdp.Page.FrameNavigatedEvent} event
   */
  _onFrameNavigated(event) {
    this._url = event.frame.url + (event.frame.urlFragment || '');
  }
}

module.exports = Driver;
