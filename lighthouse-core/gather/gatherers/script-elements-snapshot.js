/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* global getNodeDetails getElementsInDocument */

const FRGatherer = require('../../fraggle-rock/gather/base-gatherer.js');
const pageFunctions = require('../../lib/page-functions.js');

/**
 * @return {LH.Artifacts['ScriptElements']}
 */
/* c8 ignore start */
function collectAllScriptElements() {
  /** @type {HTMLScriptElement[]} */
  // @ts-expect-error - getElementsInDocument put into scope via stringification
  const scripts = getElementsInDocument('script');

  return scripts.map(script => {
    return {
      type: script.type || null,
      src: script.src || null,
      id: script.id || null,
      async: script.async,
      defer: script.defer,
      source: script.closest('head') ? 'head' : 'body',
      content: script.src ? null : script.text,
      requestId: null,
      // @ts-expect-error - getNodeDetails put into scope via stringification
      node: getNodeDetails(script),
    };
  });
}
/* c8 ignore stop */

/**
 * @fileoverview Gets JavaScript file contents.
 */
class ScriptElementsSnapshot extends FRGatherer {
  /** @type {LH.Gatherer.GathererMeta} */
  meta = {
    supportedModes: ['snapshot', 'timespan', 'navigation'],
  }

  constructor() {
    super();
    /** @type {Array<{url: string, content: string}>} */
    this._scriptParsedEvents = [];
  }

  /**
   * @param {LH.Gatherer.FRTransitionalContext} context
   */
  async startSensitiveInstrumentation(context) {
    const session = context.driver.defaultSession;
    /**
     * @param {LH.Crdp.Debugger.ScriptParsedEvent} event
     */
    this.onScriptParsed = async event => {
      // Inline scripts will have content set, we won't need to fetch it again.
      // We can't match the script content if it doesn't have a valid embedder name.
      if (!event.hasSourceURL || !event.embedderName) return;

      const {scriptSource} = await session.sendCommand('Debugger.getScriptSource', {
        scriptId: event.scriptId,
      });
      this._scriptParsedEvents.push({
        url: event.embedderName,
        content: scriptSource,
      });
    };
    session.on('Debugger.scriptParsed', this.onScriptParsed);
    await session.sendCommand('Debugger.enable');
  }

  /**
   * @param {LH.Gatherer.FRTransitionalContext} context
   */
  async stopSensitiveInstrumentation(context) {
    const session = context.driver.defaultSession;
    await session.sendCommand('Debugger.disable');
    if (this.onScriptParsed) session.off('Debugger.scriptParsed', this.onScriptParsed);
  }

  /**
   * @param {LH.Gatherer.FRTransitionalContext} context
   * @return {Promise<LH.Artifacts['ScriptElements']>}
   */
  async _getArtifact(context) {
    const executionContext = context.driver.executionContext;

    if (context.gatherMode === 'snapshot') {
      await this.startSensitiveInstrumentation(context);
      await this.stopSensitiveInstrumentation(context);
    }

    const scripts = await executionContext.evaluate(collectAllScriptElements, {
      args: [],
      useIsolation: true,
      deps: [
        pageFunctions.getNodeDetailsString,
        pageFunctions.getElementsInDocument,
      ],
    });

    for (const event of this._scriptParsedEvents) {
      const matchedScriptElement = scripts.find(script => script.src === event.url);
      if (matchedScriptElement) {
        matchedScriptElement.content = event.content;
      } else {
        scripts.push({
          type: null,
          src: event.url,
          id: null,
          async: false,
          defer: false,
          source: 'network',
          requestId: null,
          content: event.content,
          node: null,
        });
      }
    }
    return scripts;
  }

  /**
   * @param {LH.Gatherer.FRTransitionalContext} context
   */
  async getArtifact(context) {
    return this._getArtifact(context);
  }
}

module.exports = ScriptElementsSnapshot;
