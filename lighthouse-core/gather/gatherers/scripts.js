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
 * @param {LH.Crdp.Debugger.ScriptParsedEvent} script
 */
function shouldIgnoreScript(script) {
  return script.hasSourceURL && [
    '_lighthouse-eval.js',
    '__puppeteer_evaluation_script__',
  ].includes(script.url);
}

/**
 * @fileoverview Gets JavaScript file contents.
 */
class Scripts extends FRGatherer {
  /** @type {LH.Gatherer.GathererMeta} */
  meta = {
    supportedModes: ['timespan', 'navigation'],
  };

  /** @type {LH.Crdp.Debugger.ScriptParsedEvent[]} */
  _scriptParsedEvents = [];

  /** @type {Array<string | undefined>} */
  _scriptContents = [];

  /** @type {Array<string | undefined>} */
  _scriptFrameUrls = [];

  /** @type {Map<string, string>} */
  _frameIdToUrl = new Map();

  /** @type {string|null|undefined} */
  _mainSessionId = null;

  constructor() {
    super();
    this.onFrameNavigated = this.onFrameNavigated.bind(this);
    this.onScriptParsed = this.onScriptParsed.bind(this);
  }

  /**
   * @param {LH.Crdp.Debugger.ScriptParsedEvent} event
   */
  onScriptParsed(event) {
    if (!shouldIgnoreScript(event)) {
      this._scriptParsedEvents.push(event);
      this._scriptFrameUrls.push(
        event.executionContextAuxData?.frameId ?
          this._frameIdToUrl.get(event.executionContextAuxData?.frameId) :
          undefined
      );
    }
  }

  /**
   * @param {LH.Crdp.Page.FrameNavigatedEvent} event
   */
  onFrameNavigated(event) {
    this._frameIdToUrl.set(event.frame.id, event.frame.url);
  }

  /**
   * @param {LH.Gatherer.FRTransitionalContext} context
   */
  async startInstrumentation(context) {
    const session = context.driver.defaultSession;
    session.on('Debugger.scriptParsed', this.onScriptParsed);
    await session.sendCommand('Debugger.enable');
    await session.sendCommand('Page.enable');
    session.on('Page.frameNavigated', this.onFrameNavigated);
  }

  /**
   * @param {LH.Gatherer.FRTransitionalContext} context
   */
  async stopInstrumentation(context) {
    const session = context.driver.defaultSession;
    const formFactor = context.baseArtifacts.HostFormFactor;

    session.off('Debugger.scriptParsed', this.onScriptParsed);

    // Without this line the Debugger domain will be off in FR runner,
    // because only the legacy gatherer has special handling for multiple,
    // overlapped enabled/disable calls.
    await session.sendCommand('Debugger.enable');

    // If run on a mobile device, be sensitive to memory limitations and only
    // request one at a time.
    this._scriptContents = await runInSeriesOrParallel(
      this._scriptParsedEvents,
      ({scriptId}) => {
        return session.sendCommand('Debugger.getScriptSource', {scriptId})
          .then((resp) => resp.scriptSource)
          .catch(() => undefined);
      },
      formFactor === 'mobile' /* runInSeries */
    );
    await session.sendCommand('Debugger.disable');
    await session.sendCommand('Page.disable');
    session.off('Page.frameNavigated', this.onFrameNavigated);
  }

  async getArtifact() {
    /** @type {LH.Artifacts['Scripts']} */
    const scripts = this._scriptParsedEvents.map((event, i) => {
      // 'embedderName' and 'url' are confusingly named, so we rewrite them here.
      // On the protocol, 'embedderName' always refers to the URL of the script (or HTML if inline).
      // Same for 'url' ... except, magic "sourceURL=" comments will override the value.
      // It's nice to display the user-provided value in Lighthouse, so we add a field 'name'
      // to make it clear this is for presentational purposes.
      // See https://chromium-review.googlesource.com/c/v8/v8/+/2317310
      let name = event.url;
      // embedderName is optional on the protocol because backends like Node may not set it.
      // For our purposes, it is always set. But just in case it isn't... fallback to the url.
      let url = event.embedderName || event.url;

      // Some eval'd scripts may not have a name or url, so let's set them.
      if (!name) name = '<eval script>';
      if (!url && event.stackTrace?.callFrames.length) url = event.stackTrace.callFrames[0].url;
      if (!url) url = this._scriptFrameUrls[i] || '';

      return {
        name,
        ...event,
        url,
        content: this._scriptContents[i],
      };
    })
    // If we can't name a script or know its url, just ignore it.
    .filter(script => script.name && script.url)
    // This is a script with unknown origin, but seems to come from Puppeteer.
    .filter(script => script.content !== '(function(e) { console.log(e.type, e); })');

    return scripts;
  }
}

module.exports = Scripts;
