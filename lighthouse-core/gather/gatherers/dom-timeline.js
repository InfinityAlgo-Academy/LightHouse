/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
// @ts-lmaonocheck - TODO: cut down on exported artifact properties not needed by audits
'use strict';

const Gatherer = require('./gatherer.js');
const pageFunctions = require('../../lib/page-functions.js');
const TraceProcessor = require('../../lib/tracehouse/trace-processor.js');

/* global window, MutationObserver, document, performance, getNodePath, getOuterHTMLSnippet, getNodeSelector, getNodeLabel, getNodeDetails */


function setupObserver() {
  // @ts-expect-error ___observedIframes does not exist on window by default
  window.___observedIframes = [];
  // @ts-expect-error ___observer does not exist on window by default
  window.___observer = new MutationObserver((records) => {
    const currTime = performance.now();
    // performance.mark('lh_timealign');
    // const markPageTs = performance.getEntriesByName('lh_timealign');
    // performance.clearMarks()
    // const temp = markPageTs[0].startTime;
    //const temp2 = markPageTs[0].duration;
    for (const record of records) {
      if (record.type !== 'childList') return;
      const addedNodes = Array.from(record.addedNodes || []);
      if (!addedNodes || !addedNodes.some(node => node.nodeName === 'IFRAME')) return;
      for (const node of addedNodes) {
        if (node.nodeName !== 'IFRAME') continue;
        // TODO: verify that Iframe src is of an ad network / ignore non-ad iframes
        //performance.mark('lh_timealign');
        //const markPageTs = performance.getEntriesByName('lh_timealign');
        //performance.clearMarks()
        //const temp = markPageTs[0].startTime;
        performance.mark('lh_timealign');
        const markPageTs = performance.getEntriesByName('lh_timealign');
        performance.clearMarks()
        const temp = markPageTs[0].startTime;
        // Working with nodes, getNodeDetails uses elements, similar work in trace-elements.js
        // TODO: does this change things?
        const elem = node.nodeType === node.ELEMENT_NODE ? node : node.parentElement; 
        // @ts-expect-error ___observedIframes does not exist on window by default
        window.___observedIframes.push({
          time: temp,
          currTime,
          element: elem,
          // @ts-ignore
          ...getNodeDetails(node),
        });
      }
    }
    
  });
  // @ts-expect-error ___observer does not exist on window by default
  window.___observer.observe(document, {childList: true, subtree: true});
}

/**
 * //@return {Array<LH.Artifacts.DOMTimestamp>}
 */
function getDOMTimestamps() {
  // @ts-expect-error ___observer does not exist on window by default
  window.___observer.disconnect();
  // @ts-expect-error ___observedIframes does not exist on window by default
  return window.___observedIframes;
}

class DOMTimeline extends Gatherer {
  /**
   * @param {LH.Gatherer.PassContext} passContext
   */
  // @ts-expect-error we will not return a phase result
  async beforePass(passContext) {
    const expression = `(function () {
      ${pageFunctions.getNodeDetailsString};
      return (${setupObserver.toString()}());
    })()`;
    return passContext.driver.evaluateScriptOnNewDocument(expression);
  }


  /**
   * @param {LH.Gatherer.PassContext} passContext
   * @param {LH.Gatherer.LoadData} loadData
   * @return {Promise<LH.Artifacts['DOMTimeline']>}
   */
  async afterPass(passContext, loadData) {
    const driver = passContext.driver;
    if (!loadData.trace) {
      throw new Error('Trace is missing!');
    }

    const layoutEvents =
      TraceProcessor.computeTraceOfTab(loadData.trace).layoutShiftTimelineEvents;

    const expression = `(() => {
      return (${getDOMTimestamps.toString()})();
    })()`;

    const timestamps = await driver.evaluateAsync(expression);

    return {timestamps, layoutEvents};
  }
}

module.exports = DOMTimeline;