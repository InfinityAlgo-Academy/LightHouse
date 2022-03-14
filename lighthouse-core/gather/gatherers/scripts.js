/**
 * @license Copyright 2022 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const FRGatherer = require('../../fraggle-rock/gather/base-gatherer.js');

/**
 * @template T, U
 * @param {Array<T>} values
 * @param {(value: T) => Promise<U>} promiseMapper
 * @param {boolean} runInSeries
 * @return {Promise<Array<U>>}
 */
async function runInSeriesOrParallel(values, promiseMapper, runInSeries) {
  if (runInSeries) {
    const results = [];
    for (const value of values) {
      const result = await promiseMapper(value);
      results.push(result);
    }
    return results;
  } else {
    const promises = values.map(promiseMapper);
    return await Promise.all(promises);
  }
}

/**
 * @fileoverview Gets JavaScript file contents.
 */
class Scripts extends FRGatherer {
  /** @type {LH.Gatherer.GathererMeta} */
  meta = {
    supportedModes: ['snapshot', 'timespan', 'navigation'],
  };

  /** @type {LH.Crdp.Debugger.ScriptParsedEvent[]} */
  _scriptParsedEvents = [];

  /** @type {Array<string | undefined>} */
  _scriptContents = [];

  /** @type {string|null|undefined} */
  _mainSessionId = null;

  constructor() {
    super();
    this.onProtocolMessage = this.onProtocolMessage.bind(this);
    this.onFrameNavigated = this.onFrameNavigated.bind(this);
  }

  /**
   * @param {LH.Protocol.RawEventMessage} event
   */
  onProtocolMessage(event) {
    // Go read the comments in network-recorder.js _findRealRequestAndSetSession.
    let sessionId = event.sessionId;
    if (this._mainSessionId === null) {
      this._mainSessionId = sessionId;
    }
    if (this._mainSessionId === sessionId) {
      sessionId = undefined;
    }

    // We want to ignore scripts from OOPIFs. In reality, this does more than block just OOPIFs,
    // it also blocks scripts from the same origin but that happen to run in a different process,
    // like a worker.
    if (event.method === 'Debugger.scriptParsed' && !sessionId) {
      // Events without an embedderName (read: a url) are for JS that we ran over the protocol.
      if (event.params.embedderName) this._scriptParsedEvents.push(event.params);
    }
  }

  /**
   * If we aren't navigating from about:blank, the protocol will pick up scripts from the starting page and destination page.
   * If navigating within the same origin, the same script can show up multiple times with a different script id.
   * To prevent this, we clear the scripts every time we detect a navigation.
   * @param {LH.Crdp.Page.FrameNavigatedEvent} event
   */
  onFrameNavigated(event) {
    // Only clear for main frame navigation events.
    if (!event.frame.parentId) {
      this._scriptParsedEvents = [];
    }
  }

  /**
   * @param {LH.Gatherer.FRTransitionalContext} context
   */
  async startInstrumentation(context) {
    this.localSession = await context.driver.createSession();
    this.localSession.addProtocolMessageListener(this.onProtocolMessage);
    await this.localSession.sendCommand('Debugger.enable');
    this.localSession.on('Page.frameNavigated', this.onFrameNavigated);
    await this.localSession.sendCommand('Page.enable');
  }

  /**
   * @param {LH.Gatherer.FRTransitionalContext} context
   */
  async stopInstrumentation(context) {
    const formFactor = context.baseArtifacts.HostFormFactor;

    await this.localSession.sendCommand('Page.disable');
    this.localSession.off('Page.frameNavigated', this.onFrameNavigated);

    this.localSession.removeProtocolMessageListener(this.onProtocolMessage);

    // If run on a mobile device, be sensitive to memory limitations and only
    // request one at a time.
    this._scriptContents = await runInSeriesOrParallel(
      this._scriptParsedEvents,
      ({scriptId}) => {
        return this.localSession.sendCommand('Debugger.getScriptSource', {scriptId})
          .then((resp) => resp.scriptSource)
          .catch(() => undefined);
      },
      formFactor === 'mobile' /* runInSeries */
    );
    await this.localSession.sendCommand('Debugger.disable');
  }

  /**
   * @param {LH.Gatherer.FRTransitionalContext} context
   */
  async getArtifact(context) {
    if (context.gatherMode === 'snapshot') {
      await this.startInstrumentation(context);
      await this.stopInstrumentation(context);
    }

    /** @type {LH.Artifacts['Scripts']} */
    const scripts = this._scriptParsedEvents.map((event, i) => {
      // 'embedderName' and 'url' are confusingly named, so we rewrite them here.
      // On the protocol, 'embedderName' always refers to the URL of the script (or HTML if inline).
      // Same for 'url' ... except, magic "sourceURL=" comments will override the value.
      // It's nice to display the user-provided value in Lighthouse, so we add a field 'name'
      // to make it clear this is for presentational purposes.
      // See https://chromium-review.googlesource.com/c/v8/v8/+/2317310
      return {
        name: event.url,
        ...event,
        // embedderName is optional on the protocol because backends like Node may not set it.
        // For our purposes, it is always set. But just in case it isn't... fallback to the url.
        url: event.embedderName || event.url,
        content: this._scriptContents[i],
      };
    });

    return scripts;
  }
}

module.exports = Scripts;
