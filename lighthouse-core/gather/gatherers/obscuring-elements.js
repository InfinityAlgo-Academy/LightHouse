/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Gatherer = require('./gatherer.js');
const pageFunctions = require('../../lib/page-functions.js');
const TraceProcessor = require('../../lib/tracehouse/trace-processor.js');

/**
 * @this {HTMLElement}
 * @return {Array<LH.Artifacts.ObscuringElement>}
 */
/* istanbul ignore next */
function checkIntersection() {
  /** @type {Array<LH.Artifacts.ObscuringElement>} */
  const obscuringElements = [];

  const lcpElement = this.nodeType === document.ELEMENT_NODE ? this : this.parentElement; // eslint-disable-line no-undef
  if (!lcpElement) return obscuringElements;

  // @ts-ignore - put into scope via stringification
  const boundingRect = getBoundingClientRect(lcpElement); // eslint-disable-line no-undef
  if (!boundingRect) return obscuringElements;

  /** @type {Set<Element>} */
  const seen = new Set();
  /** @type {Set<Element>} */
  const descendents = new Set();
  /**
   * @param {Element} el
   */
  function findDescendantElements(el) {
    if (!el) return;
    descendents.add(el);
    for (const child of el.children) {
      findDescendantElements(child);
    }
  }

  findDescendantElements(lcpElement);
  
  const {left, top, width, height} = boundingRect;
  for (let i = 0.1; i < 1.0; i += 0.2) {
    for (let j = 0.1; j < 1.0; j += 0.2) {
      const x = left + Math.round(width * i);
      const y = top + Math.round(height * j);
      for (const element of document.elementsFromPoint(x, y)) { // eslint-disable-line no-undef
        if (element === lcpElement) break;
        if (descendents.has(element) || seen.has(element)) {
          continue;
        }
        seen.add(element);
      }
    }
  }

  const biggestOverlappingElements = Array.from(seen)
  .sort((a, b) => {
    // @ts-ignore - put into scope via stringification
    const rect1 = getBoundingClientRect(a); // eslint-disable-line no-undef
    // @ts-ignore - put into scope via stringification
    const rect2 = getBoundingClientRect(b); // eslint-disable-line no-undef
    return (rect2.width * rect2.height) - (rect1.width * rect1.height);
  })
  .slice(0, 5)
  .filter(elem => {
    return elem.parentElement && !seen.has(elem.parentElement);
  })
  .map(elem => {
    return {
      // @ts-ignore - put into scope via stringification
      devtoolsNodePath: getNodePath(elem), // eslint-disable-line no-undef
      // @ts-ignore - put into scope via stringification
      selector: getNodeSelector(elem), // eslint-disable-line no-undef
      // @ts-ignore - put into scope via stringification
      nodeLabel: getNodeLabel(elem), // eslint-disable-line no-undef
      // @ts-ignore - put into scope via stringification
      snippet: getOuterHTMLSnippet(elem), // eslint-disable-line no-undef
      // @ts-ignore - put into scope via stringification
      boundingRect: getBoundingClientRect(elem), // eslint-disable-line no-undef
    };
  });

  return biggestOverlappingElements;
}

class ElementsObscuringLCPElement extends Gatherer {
  /**
   * @param {LH.Gatherer.PassContext} passContext
   * @param {LH.Gatherer.LoadData} loadData
   * @return {Promise<LH.Artifacts['ElementsObscuringLCPElement']>}
   */
  async afterPass(passContext, loadData) {
    const driver = passContext.driver;
    if (!loadData.trace) {
      throw new Error('Trace is missing!');
    }
    /** @type {Array<LH.Artifacts.ObscuringElement>} */
    const obscuringElements = [];

    const {largestContentfulPaintEvt} = TraceProcessor.computeTraceOfTab(loadData.trace);
    const backendNodeId = largestContentfulPaintEvt && largestContentfulPaintEvt.args &&
      largestContentfulPaintEvt.args.data && largestContentfulPaintEvt.args.data.nodeId;

    if (!backendNodeId) return obscuringElements;
    const objectId = await driver.resolveNodeIdToObjectId(backendNodeId);
    const response = await driver.sendCommand('Runtime.callFunctionOn', {
      objectId,
      functionDeclaration: `function () {
        ${checkIntersection.toString()};
        ${pageFunctions.getNodePathString};
        ${pageFunctions.getNodeSelectorString};
        ${pageFunctions.getNodeLabelString};
        ${pageFunctions.getOuterHTMLSnippetString};
        ${pageFunctions.getBoundingClientRectString};
        return checkIntersection.call(this);
      }`,
      returnByValue: true,
      awaitPromise: true,
    });

    if (response && response.result && response.result.value) {
      obscuringElements.push(...response.result.value);
    }

    return obscuringElements;
  }
}

module.exports = ElementsObscuringLCPElement;
