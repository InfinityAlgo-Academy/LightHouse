/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Gatherer = require('./gatherer.js');
const NetworkAnalyzer = require('../../lib/dependency-graph/simulator/network-analyzer.js');
const NetworkRequest = require('../../lib/network-request.js');
const getElementsInDocumentString = require('../../lib/page-functions.js').getElementsInDocumentString; // eslint-disable-line max-len
const pageFunctions = require('../../lib/page-functions.js');
const Driver = require('../driver.js'); // eslint-disable-line no-unused-vars
const LHError = require('../../lib/lh-error.js');

/* global getNodePath fetch */

/**
 * @return {LH.Artifacts['ScriptElements']}
 */
/* istanbul ignore next */
function collectAllScriptElements() {
  /** @type {HTMLScriptElement[]} */
  // @ts-ignore - getElementsInDocument put into scope via stringification
  const scripts = getElementsInDocument('script'); // eslint-disable-line no-undef

  return scripts.map(script => {
    return {
      type: script.type || null,
      src: script.src || null,
      async: script.async,
      defer: script.defer,
      source: /** @type {'head'|'body'} */ (script.closest('head') ? 'head' : 'body'),
      // @ts-ignore - getNodePath put into scope via stringification
      devtoolsNodePath: getNodePath(script),
      content: script.src ? null : script.text,
      requestId: null,
    };
  });
}

/**
 * This function is careful not to parse the response as JSON, as it will
 * just need to be serialized again over the protocol, and source maps can
 * be huge.
 *
 * If an error occurs, the first character is '!'.
 *
 * @param {string[]} urls
 * @return {Promise<string[]>}
 */
async function fetchSourceMaps(urls) {
  const responses = urls.map(async (url) => {
    try {
      const response = await fetch(url);
      return response.text();
    } catch (err) {
      return '!' + err.toString();
    }
  });
  return Promise.all(responses);
}

/**
 * @fileoverview Gets JavaScript file contents.
 */
class ScriptElements extends Gatherer {
  constructor() {
    super();
    /** @type {LH.Crdp.Debugger.ScriptParsedEvent[]} */
    this._scriptParsedEvents = [];
  }

  /**
   * @param {Driver} driver
   * @param {string[]} urls
   * @return {Promise<LH.Artifacts.SourceMap[]>}
   */
  async fetchSourceMaps(driver, urls) {
    const urlsParam = JSON.stringify(urls);
    // TODO: change default protocol timeout?
    // driver.setNextProtocolTimeout(250);
    /** @type {string[]} */
    const sourceMapJsons =
      await driver.evaluateAsync(`(${fetchSourceMaps.toString()})(${urlsParam})`);

    /** @type {LH.Artifacts.SourceMap[]} */
    const sourceMaps = [];
    for (const json of sourceMapJsons) {
      if (json.startsWith('!')) {
        sourceMaps.push({error: json.substring(1)});
        continue;
      }

      try {
        sourceMaps.push(JSON.parse(json));
      } catch (error) {
        // Without this catch, this silently fails and the gatherer returns an empty object... why no visible error?
        sourceMaps.push({error});
      }
    }
    return sourceMaps;
  }

  /**
   * @param {LH.Crdp.Debugger.ScriptParsedEvent} event
   */
  onScriptParsed(event) {
    this._scriptParsedEvents.push(event);
  }

  /**
   * @param {LH.Gatherer.PassContext} passContext
   */
  async beforePass(passContext) {
    const driver = passContext.driver;
    driver.on('Debugger.scriptParsed', this.onScriptParsed.bind(this));
    await driver.sendCommand('Debugger.enable');
  }

  /**
   * @param {LH.Gatherer.PassContext} passContext
   * @param {LH.Gatherer.LoadData} loadData
   * @return {Promise<LH.Artifacts['ScriptElements']>}
   */
  async afterPass(passContext, loadData) {
    const driver = passContext.driver;
    const mainResource = NetworkAnalyzer.findMainDocument(loadData.networkRecords, passContext.url);

    /** @type {LH.Artifacts['ScriptElements']} */
    const scripts = await driver.evaluateAsync(`(() => {
      ${getElementsInDocumentString}
      ${pageFunctions.getNodePathString};
      return (${collectAllScriptElements.toString()})();
    })()`, {useIsolation: true});

    for (const script of scripts) {
      if (script.content) script.requestId = mainResource.requestId;
    }

    const scriptRecords = loadData.networkRecords
      // Ignore records from OOPIFs
      .filter(record => !record.sessionId)
      // Only get the content of script requests
      .filter(record => record.resourceType === NetworkRequest.TYPES.Script);

    for (const record of scriptRecords) {
      try {
        const content = await driver.getRequestContent(record.requestId);
        if (!content) continue;

        const matchedScriptElement = scripts.find(script => script.src === record.url);
        if (matchedScriptElement) {
          matchedScriptElement.requestId = record.requestId;
          matchedScriptElement.content = content;
        } else {
          scripts.push({
            devtoolsNodePath: '',
            type: null,
            src: record.url,
            async: false,
            defer: false,
            source: 'network',
            requestId: record.requestId,
            content,
          });
        }
      } catch (e) {}
    }

    driver.off('Debugger.scriptParsed', this.onScriptParsed);
    await driver.sendCommand('Debugger.disable');

    /** @type {Array<{script: LH.Artifacts.ScriptElement, sourceMapURL: string}>} */
    const toFetch = [];
    for (const event of this._scriptParsedEvents) {
      if (event.sourceMapURL) {
        const script = scripts.find(script => script.src === event.url);
        if (!script) continue;
        if (event.sourceMapURL.startsWith('data:')) {
          const buffer = new Buffer(event.sourceMapURL.split(',')[1], 'base64');
          script.sourceMap = JSON.parse(buffer.toString());
        } else {
          toFetch.push({script, sourceMapURL: event.sourceMapURL});
        }
      }
    }

    try {
      const sourceMaps = await this.fetchSourceMaps(driver, toFetch.map(obj => obj.sourceMapURL));
      for (const [i, sourceMap] of sourceMaps.entries()) {
        toFetch[i].script.sourceMap = sourceMap;
      }
    } catch (err) {
      // If we timeout, we timeout.
      if (err.code !== LHError.errors.PROTOCOL_TIMEOUT) {
        throw err;
      }
    }

    return scripts;
  }
}

module.exports = ScriptElements;
