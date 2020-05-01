/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @fileoverview
 * This gatherer identifies the Largest Contentful Paint element from the trace. Since the trace only has the nodeId of the element,
 * we temporarily add an attribute so that we can identify the element in the DOM.
 */

const Gatherer = require('./gatherer.js');
const pageFunctions = require('../../lib/page-functions.js');
const TraceProcessor = require('../../lib/tracehouse/trace-processor.js');

const LH_ATTRIBUTE_MARKER = 'lhtemp';

/**
 * @param {string} attributeMarker
 * @return {LH.Artifacts['TraceElements']}
 */
/* istanbul ignore next */
function collectTraceElements(attributeMarker) {
  /** @type {Array<HTMLElement>} */
  // @ts-ignore - put into scope via stringification
  const markedElements = getElementsInDocument('[' + attributeMarker + ']'); // eslint-disable-line no-undef
  /** @type {LH.Artifacts['TraceElements']} */
  const TraceElements = [];
  for (const element of markedElements) {
    const metricName = element.getAttribute(attributeMarker) || '';
    element.removeAttribute(attributeMarker);
    // @ts-ignore - put into scope via stringification
    TraceElements.push({
      metricName,
      // @ts-ignore - put into scope via stringification
      devtoolsNodePath: getNodePath(element), // eslint-disable-line no-undef
      // @ts-ignore - put into scope via stringification
      selector: getNodeSelector(element), // eslint-disable-line no-undef
      // @ts-ignore - put into scope via stringification
      nodeLabel: getNodeLabel(element), // eslint-disable-line no-undef
      // @ts-ignore - put into scope via stringification
      snippet: getOuterHTMLSnippet(element), // eslint-disable-line no-undef
    });
  }
  return TraceElements;
}

class TraceElements extends Gatherer {
  /**
   * @param {LH.TraceEvent | undefined} lcpEvent
   * @return {number | undefined}
   */
  static getNodeIDFromTraceEvent(lcpEvent) {
    return lcpEvent && lcpEvent.args &&
      lcpEvent.args.data && lcpEvent.args.data.nodeId;
  }

  /**
   * @param {LH.Gatherer.PassContext} passContext
   * @param {LH.Gatherer.LoadData} loadData
   * @return {Promise<LH.Artifacts['TraceElements']>}
   */
  async afterPass(passContext, loadData) {
    const driver = passContext.driver;
    if (!loadData.trace) {
      throw new Error('Trace is missing!');
    }
    const traceOfTab = TraceProcessor.computeTraceOfTab(loadData.trace);
    const lcpEvent = traceOfTab.largestContentfulPaintEvt;
    /** @type {Array<number>} */
    const backendNodeIds = [];

    const lcpNodeId = TraceElements.getNodeIDFromTraceEvent(lcpEvent);
    if (lcpNodeId) {
      backendNodeIds.push(lcpNodeId);
    }
    // DOM.getDocument is necessary for pushNodesByBackendIdsToFrontend to properly retrieve nodeIds.
    await driver.sendCommand('DOM.getDocument', {depth: -1, pierce: true});
    const translatedIds = await driver.sendCommand('DOM.pushNodesByBackendIdsToFrontend',
      {backendNodeIds: backendNodeIds});

    // Mark the LCP element so we can find it in the page.
    await driver.sendCommand('DOM.setAttributeValue', {
      nodeId: translatedIds.nodeIds[0],
      name: LH_ATTRIBUTE_MARKER,
      value: 'largest-contentful-paint',
    });

    const expression = `(() => {
      ${pageFunctions.getElementsInDocumentString};
      ${pageFunctions.getNodePathString};
      ${pageFunctions.getNodeSelectorString};
      ${pageFunctions.getNodeLabelString};
      ${pageFunctions.getOuterHTMLSnippetString};

      return (${collectTraceElements})('${LH_ATTRIBUTE_MARKER}');
    })()`;

    return driver.evaluateAsync(expression, {useIsolation: true});
  }
}

module.exports = TraceElements;
