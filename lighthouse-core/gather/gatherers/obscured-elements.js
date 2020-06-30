/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Gatherer = require('./gatherer.js');
const pageFunctions = require('../../lib/page-functions.js');
const TraceProcessor = require('../../lib/tracehouse/trace-processor.js');
const TraceElements = require('./trace-elements.js');

/** @typedef {{element: string | null, entries: Array<IntersectionObserverEntry>}} MyData */

/**
 * @this {HTMLElement}
 * @return {MyData}
 */
/* istanbul ignore next */
function checkIntersection() {
  const elem = this.nodeType === document.ELEMENT_NODE ? this : this.parentElement; // eslint-disable-line no-undef
  /** @type {Array<IntersectionObserverEntry>} */
  const list = [];
  /**
   * @param {Array<IntersectionObserverEntry>} entries 
   * @param {IntersectionObserver} observer
   */
  function observerCallback(entries, observer) {
    list.push(...entries);
  };
  const options = {
    root: null,
    rootMargin: '0px',
    threshold: [0, 0.25, 0.5, 0.75, 1.0],
  };
  const observer = new IntersectionObserver(observerCallback, options);
  elem && observer.observe(elem);
  // @ts-ignore - put into scope via stringification
  const snippet = getOuterHTMLSnippet(elem); // eslint-disable-line no-undef
  return {
    element: snippet,
    entries: list,
  };
}

class ObscuredElements extends Gatherer {  
  /**
   * @param {LH.Gatherer.PassContext} passContext
   * @param {LH.Gatherer.LoadData} loadData
   * @return {Promise<LH.Artifacts['ObscuredElements'] | null>}
   */
  async afterPass(passContext, loadData) {
    const driver = passContext.driver;
    if (!loadData.trace) {
      throw new Error('Trace is missing!');
    }

    const {largestContentfulPaintEvt} = TraceProcessor.computeTraceOfTab(loadData.trace);
    const backendNodeId = largestContentfulPaintEvt && largestContentfulPaintEvt.args &&
      largestContentfulPaintEvt.args.data && largestContentfulPaintEvt.args.data.nodeId;

    const elements = [];
    if (!backendNodeId) return null;
    const objectId = await driver.resolveNodeIdToObjectId(backendNodeId);
    const response = await driver.sendCommand('Runtime.callFunctionOn', {
      objectId,
      functionDeclaration: `function () {
        ${checkIntersection.toString()};
        ${pageFunctions.getNodePathString};
        ${pageFunctions.getNodeSelectorString};
        ${pageFunctions.getNodeLabelString};
        ${pageFunctions.getOuterHTMLSnippetString};
        return checkIntersection.call(this);
      }`,
      returnByValue: true,
      awaitPromise: true,
    });

    if (response && response.result && response.result.value) {
      console.dir(response.result.value);
      elements.push(response.result.value);
    }
    return elements;
  }
}

module.exports = ObscuredElements;
