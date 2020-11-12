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
  // @ts-expect-error TS doesn't know PerformanceTimeline types
  window.___timeAlignTs = performance.mark('lh_timealign').startTime;
  
  // @ts-expect-error ___domTimestamps does not exist on window by default
  window.___domTimestamps = [];
  // @ts-expect-error ___observer does not exist on window by default
  window.___observer = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type !== 'childList') return;
      const addedNodes = Array.from(record.addedNodes || []);
      if (!addedNodes || !addedNodes.some(node => node.nodeName === 'IFRAME')) return;
      for (const node of addedNodes) {
        if (node.nodeName !== 'IFRAME') continue;
        // TODO: verify that Iframe src is of an ad network / ignore non-ad iframes
        // Working with nodes, getNodeDetails uses elements, similar work in trace-elements.js
        // TODO: does this change things?
        const elem = node.nodeType === node.ELEMENT_NODE ? node : node.parentElement; 
        // @ts-expect-error ___domTimestamps does not exist on window by default
        window.___domTimestamps.push({
          currTime: performance.now(),
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
 * @return {{domTimestamps: Array<LH.Artifacts.DOMTimestamp>, timeAlignTs: number}}
 */
function getDomDetails() {
  // @ts-expect-error ___observer does not exist on window by default
  window.___observer.disconnect();
  return {
    // @ts-expect-error ___domTimestamps does not exist on window by default
    domTimestamps: window.___domTimestamps, 
    // @ts-expect-error ___timeAlignTs does not exist on window by default
    timeAlignTs: window.___timeAlignTs,
  };
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

    const expression = `(() => {
      return (${getDomDetails.toString()})();
    })()`;

    const {domTimestamps, timeAlignTs} = await driver.evaluateAsync(expression);
    return {domTimestamps, timeAlignTs};
  }
}

module.exports = DOMTimeline;