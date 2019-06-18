/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/** @typedef {import('../driver.js')} Driver */

const Gatherer = require('./gatherer.js');

/**
 * This function is careful not to parse the response as JSON, as it will
 * just need to be serialized again over the protocol, and source maps can
 * be huge.
 *
 * @param {string} url
 */
/* istanbul ignore next */
async function fetchSourceMap(url) {
  try {
    // eslint-disable-next-line no-undef
    const response = await fetch(url);
    return response.text();
  } catch (err) {
    return {errorMessage: err.toString()};
  }
}

/**
 * @fileoverview Gets JavaScript source maps.
 */
class SourceMaps extends Gatherer {
  constructor() {
    super();
    /** @type {LH.Crdp.Debugger.ScriptParsedEvent[]} */
    this._scriptParsedEvents = [];
    this.onScriptParsed = this.onScriptParsed.bind(this);
  }

  /**
   * @param {Driver} driver
   * @param {string} sourceMapUrl
   * @return {Promise<{map: import('source-map').RawSourceMap} | {errorMessage: string}>}
   */
  async fetchSourceMapInPage(driver, sourceMapUrl) {
    // TODO: change default protocol timeout?
    // driver.setNextProtocolTimeout(250);
    /** @type {string|{errorMessage: string}} */
    const sourceMapJson =
      await driver.evaluateAsync(`(${fetchSourceMap})(${JSON.stringify(sourceMapUrl)})`);

    if (typeof sourceMapJson === 'object') {
      return sourceMapJson;
    }

    return {map: JSON.parse(sourceMapJson)};
  }

  /**
   * @param {LH.Crdp.Debugger.ScriptParsedEvent} event
   */
  onScriptParsed(event) {
    if (event.sourceMapURL) {
      this._scriptParsedEvents.push(event);
    }
  }

  /**
   * @param {LH.Gatherer.PassContext} passContext
   */
  async beforePass(passContext) {
    const driver = passContext.driver;
    driver.on('Debugger.scriptParsed', this.onScriptParsed);
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
    for (const event of this._scriptParsedEvents) {
      if (!event.sourceMapURL) continue;

      const url = event.url;
      try {
        if (event.sourceMapURL.startsWith('data:')) {
          const buffer = Buffer.from(event.sourceMapURL.split(',')[1], 'base64');
          sourceMaps.push({
            url,
            map: JSON.parse(buffer.toString()),
          });
        } else {
          const fetchedSourceMap = await this.fetchSourceMapInPage(driver, event.sourceMapURL);
          sourceMaps.push({
            url,
            ...fetchedSourceMap,
          });
        }
      } catch (err) {
        // Without this catch, this silently fails and the gatherer returns an empty object... why no visible error?
        sourceMaps.push({url, errorMessage: err.toString()});
      }
    }

    return sourceMaps;
  }
}

module.exports = SourceMaps;
