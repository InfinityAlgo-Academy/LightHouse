/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Gatherer = require('./gatherer.js');
const Driver = require('../driver.js'); // eslint-disable-line no-unused-vars
const LHError = require('../../lib/lh-error.js');

/* global fetch */

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
 * @fileoverview Gets JavaScript source maps.
 */
class SourceMaps extends Gatherer {
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
  async fetchSourceMapsInPage(driver, urls) {
    const urlsParam = JSON.stringify(urls);
    // TODO: change default protocol timeout?
    // driver.setNextProtocolTimeout(250);
    /** @type {string[]} */
    const sourceMapJsons =
      await driver.evaluateAsync(`(${fetchSourceMaps.toString()})(${urlsParam})`);

    /** @type {LH.Artifacts.SourceMap[]} */
    const sourceMaps = [];
    for (const [i, json] of sourceMapJsons.entries()) {
      const url = urls[i];
      if (json.startsWith('!')) {
        sourceMaps.push({url, error: json.substring(1)});
      } else {
        sourceMaps.push(this.parseSourceMapJson(url, json));
      }
    }
    return sourceMaps;
  }

  /**
   * @param {string} url
   * @param {string} json
   * @return {LH.Artifacts.SourceMap}
   */
  parseSourceMapJson(url, json) {
    try {
      return {
        url,
        map: JSON.parse(json),
      };
    } catch (err) {
      // Without this catch, this silently fails and the gatherer returns an empty object... why no visible error?
      return {url, error: err.toString()};
    }
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
   * @return {Promise<LH.Artifacts['SourceMaps']>}
   */
  async afterPass(passContext) {
    const driver = passContext.driver;

    driver.off('Debugger.scriptParsed', this.onScriptParsed);
    await driver.sendCommand('Debugger.disable');

    /** @type {LH.Artifacts.SourceMap[]} */
    const sourceMaps = [];

    /** @type {Array<{url: string, sourceMapURL: string}>} */
    const toFetch = [];
    for (const event of this._scriptParsedEvents) {
      if (event.sourceMapURL) {
        if (event.sourceMapURL.startsWith('data:')) {
          const buffer = Buffer.from(event.sourceMapURL.split(',')[1], 'base64');
          sourceMaps.push(this.parseSourceMapJson(event.url, buffer.toString()));
        } else {
          toFetch.push({
            url: event.url,
            sourceMapURL: event.sourceMapURL,
          });
        }
      }
    }

    try {
      const sourceMapUrls = toFetch.map(obj => obj.sourceMapURL);
      const fetchedSourceMaps = await this.fetchSourceMapsInPage(driver, sourceMapUrls);
      sourceMaps.push(...fetchedSourceMaps);
    } catch (err) {
      // If we timeout, we timeout.
      if (err.code !== LHError.errors.PROTOCOL_TIMEOUT) {
        throw err;
      }
    }

    return sourceMaps;
  }
}

module.exports = SourceMaps;
