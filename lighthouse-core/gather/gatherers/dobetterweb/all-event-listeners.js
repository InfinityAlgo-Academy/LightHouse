/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

/**
 * @fileoverview Tests whether the page is using passive event listeners.
 */

'use strict';

const Gatherer = require('../gatherer');
const Driver = require('../../driver.js'); // eslint-disable-line no-unused-vars
const Element = require('../../../lib/element.js'); // eslint-disable-line no-unused-vars

class EventListeners extends Gatherer {
  /**
   * @param {Driver} driver
   */
  async listenForScriptParsedEvents(driver) {
    /** @type {Map<string, LH.Crdp.Debugger.ScriptParsedEvent>} */
    const parsedScripts = new Map();
    /** @param {LH.Crdp.Debugger.ScriptParsedEvent} script */
    const scriptListener = script => {
      parsedScripts.set(script.scriptId, script);
    };

    // Enable and disable Debugger domain, triggering flood of parsed scripts.
    driver.on('Debugger.scriptParsed', scriptListener);
    await driver.sendCommand('Debugger.enable');
    await driver.sendCommand('Debugger.disable');
    driver.off('Debugger.scriptParsed', scriptListener);

    return parsedScripts;
  }

  /**
   * @param {Driver} driver
   * @param {number|string} nodeIdOrObject The node id of the element or the
   *     string of an object ('document', 'window').
   * @return {Promise<{listeners: Array<LH.Crdp.DOMDebugger.EventListener>, tagName: string}>}
   * @private
   */
  _listEventListeners(driver, nodeIdOrObject) {
    let promise;

    if (typeof nodeIdOrObject === 'string') {
      promise = driver.sendCommand('Runtime.evaluate', {
        expression: nodeIdOrObject,
        objectGroup: 'event-listeners-gatherer', // populates event handler info.
      }).then(result => result.result);
    } else {
      promise = driver.sendCommand('DOM.resolveNode', {
        nodeId: nodeIdOrObject,
        objectGroup: 'event-listeners-gatherer', // populates event handler info.
      }).then(result => result.object);
    }

    return promise.then(obj => {
      const objectId = obj.objectId;
      const description = obj.description;
      if (!objectId || !description) {
        return {listeners: [], tagName: ''};
      }

      return driver.sendCommand('DOMDebugger.getEventListeners', {
        objectId,
      }).then(results => {
        return {listeners: results.listeners, tagName: description};
      });
    });
  }

  /**
   * Collects the event listeners attached to an object and formats the results.
   * listenForScriptParsedEvents should be called before this method to ensure
   * the page's parsed scripts are collected at page load.
   * @param {Driver} driver
   * @param {Map<string, LH.Crdp.Debugger.ScriptParsedEvent>} parsedScripts
   * @param {string|number} nodeId The node to look for attached event listeners.
   * @return {Promise<LH.Artifacts['EventListeners']>} List of event listeners attached to
   *     the node.
   */
  getEventListeners(driver, parsedScripts, nodeId) {
    /** @type {LH.Artifacts['EventListeners']} */
    const matchedListeners = [];

    return this._listEventListeners(driver, nodeId).then(results => {
      results.listeners.forEach(listener => {
        // Slim down the list of parsed scripts to match the found event
        // listeners that have the same script id.
        const script = parsedScripts.get(listener.scriptId);
        if (script) {
          // Combine the EventListener object and the result of the
          // Debugger.scriptParsed event so we get .url and other
          // needed properties.
          matchedListeners.push({
            url: script.url,
            type: listener.type,
            handler: listener.handler,
            objectName: results.tagName,
            // Note: line/col numbers are zero-index. Add one to each so we have
            // actual file line/col numbers.
            line: listener.lineNumber + 1,
            col: listener.columnNumber + 1,
          });
        }
      });

      return matchedListeners;
    });
  }

  /**
   * Aggregates the event listeners used on each element into a single list.
   * @param {Driver} driver
   * @param {Map<string, LH.Crdp.Debugger.ScriptParsedEvent>} parsedScripts
   * @param {Array<string|number>} nodeIds List of objects or nodeIds to fetch event listeners for.
   * @return {Promise<LH.Artifacts['EventListeners']>} Resolves to a list of all the event
   *     listeners found across the elements.
   */
  collectListeners(driver, parsedScripts, nodeIds) {
    // Gather event listeners from each node in parallel.
    return Promise.all(nodeIds.map(node => this.getEventListeners(driver, parsedScripts, node)))
      .then(nestedListeners => nestedListeners.reduce((prev, curr) => prev.concat(curr)));
  }

  /**
   * @param {LH.Gatherer.PassContext} passContext
   * @return {Promise<LH.Artifacts['EventListeners']>}
   */
  async afterPass(passContext) {
    const driver = passContext.driver;
    await passContext.driver.sendCommand('DOM.enable');
    const parsedScripts = await this.listenForScriptParsedEvents(driver);

    const elements = await passContext.driver.getElementsInDocument();
    const elementIds = [...elements.map(el => el.getNodeId()), 'document', 'window'];

    const listeners = await this.collectListeners(driver, parsedScripts, elementIds);
    await passContext.driver.sendCommand('DOM.disable');
    return listeners;
  }
}

module.exports = EventListeners;
