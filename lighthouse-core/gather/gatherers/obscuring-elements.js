/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Gatherer = require('./gatherer.js');
const pageFunctions = require('../../lib/page-functions.js');
const TraceProcessor = require('../../lib/tracehouse/trace-processor.js');
const { getOuterHTMLSnippet } = require('../../lib/page-functions.js');

/** @typedef {{element?: string, x?: number, y?:number, retList?: Array<any>}} MyData */
/** @typedef {{xCoord: number, yCoord: number}} Point */

/**
 * @this {HTMLElement}
 * @return {LH.Artifacts['ObscuringElements']}
 */
/* istanbul ignore next */
function checkIntersection() {
  const lcpElement = this.nodeType === document.ELEMENT_NODE ? this : this.parentElement; // eslint-disable-line no-undef
  const lcpHTMLSnippet = lcpElement && getOuterHTMLSnippet(lcpElement);
  const obscuringElements = [];
  const seen = new Set();
  /**
   * @param {HTMLElement | Element} el 
   */
  function getChildrenSnippets(el) {
    if (!el) return;
    const snippet = getOuterHTMLSnippet(el);
    seen.add(snippet);
    for (const child of el.children) {
      getChildrenSnippets(child);
    }
  }
  lcpElement && getChildrenSnippets(lcpElement);
  const boundingRect = lcpElement && lcpElement.getBoundingClientRect();
  if (!boundingRect) return {};
  const {x, y, width, height} = boundingRect;
  /** @type {Array<Point>} */
  const points = [];
  for (let i = 0.1; i < 1.0; i += 0.2) {
    for (let j = 0.1; j < 1.0; j += 0.2) {
      const xCoord = x + Math.round(width * i);
      const yCoord = y + Math.round(height * j);
      points.push({xCoord, yCoord});
    }
  }

  for (const {xCoord, yCoord} of points) {
    for (const element of document.elementsFromPoint(xCoord, yCoord)) {
      // @ts-ignore - put into scope via stringification
      const snippet = getOuterHTMLSnippet(element); // eslint-disable-line no-undef
      if (snippet === lcpHTMLSnippet) break;
      if (seen.has(snippet))
        continue;
      seen.add(snippet);
      const rect = element.getBoundingClientRect();
      obscuringElements.push({x: rect.x, y: rect.y, width: rect.width, height: rect.height, snippet});
    }
  }

  return obscuringElements;
}

class ObscuringElements extends Gatherer {  
  /**
   * @param {LH.Gatherer.PassContext} passContext
   * @param {LH.Gatherer.LoadData} loadData
   * @return {Promise<LH.Artifacts['ObscuringElements'] | null>}
   */
  async afterPass(passContext, loadData) {
    const driver = passContext.driver;
    if (!loadData.trace) {
      throw new Error('Trace is missing!');
    }

    const {largestContentfulPaintEvt} = TraceProcessor.computeTraceOfTab(loadData.trace);
    const backendNodeId = largestContentfulPaintEvt && largestContentfulPaintEvt.args &&
      largestContentfulPaintEvt.args.data && largestContentfulPaintEvt.args.data.nodeId;

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

    let obscuringElements = [];
    if (response && response.result && response.result.value) {
      console.dir(response.result.value);
      obscuringElements.push(...response.result.value);
    }

    return obscuringElements;
  }
}

module.exports = ObscuringElements;
