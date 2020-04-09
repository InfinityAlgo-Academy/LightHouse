/**
 * @license Copyright 2020 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Gatherer = require('./gatherer.js');
const pageFunctions = require('../../lib/page-functions.js');
const TraceProcessor = require('../../lib/tracehouse/trace-processor.js');
const {
  addRectTopAndBottom,
  getRectOverlapArea,
  getRectArea,
} = require('../../lib/rect-helpers.js');

/**
 * @return {LH.Artifacts['TraceNodes']}
 */
function collectTraceNodes() {
  /** @type {Array<HTMLElement>} */
  // @ts-ignore - put into scope via stringification
  const markedElements = getElementsInDocument('[lhtemp]'); // eslint-disable-line no-undef
  /** @type {LH.Artifacts['TraceNodes']} */
  const traceNodes = [];

  for (const element of markedElements) {
    traceNodes.push({
      metricTag: element.getAttribute('lhtemp') || '',
      // @ts-ignore - put into scope via stringification
      nodePath: getNodePath(element), // eslint-disable-line no-undef
      // @ts-ignore - put into scope via stringification
      selector: getNodeSelector(element), // eslint-disable-line no-undef
      // @ts-ignore - put into scope via stringification
      nodeLabel: getNodeLabel(element), // eslint-disable-line no-undef
      // @ts-ignore - put into scope via stringification
      snippet: getOuterHTMLSnippet(element), // eslint-disable-line no-undef
    });
  }
  return traceNodes;
}

class TraceNodes extends Gatherer {
  /**
   * @param {LH.TraceEvent} lcpEvent
   * @return {number | undefined}
   */
  static getLCPNodeFromTraceEvent(lcpEvent) {
    return lcpEvent && lcpEvent.args &&
    lcpEvent.args.data && lcpEvent.args.data.nodeId;
  }

  /**
   * @param {Array<number>} rect
   * @return {LH.Artifacts.Rect}
   */
  static traceRectToLHRect(rect) {
    const rectArgs = {
      x: rect[0],
      y: rect[1],
      width: rect[2],
      height: rect[3],
    };
    return addRectTopAndBottom(rectArgs);
  }

  /**
   * @param {Array<LH.TraceEvent>} mainThreadEvents 
   * @return {Array<number>}
   */
  static getCLSNodesFromMainThreadEvents(mainThreadEvents) {
    const clsPerNodeMap = new Map();
    /** @type {Set<number>} */
    const clsNodeIds = new Set();
    const shiftEvents = mainThreadEvents.filter(e => e.name === 'LayoutShift').map(e => e.args && e.args.data);

    shiftEvents.forEach(event => {
      if (!event) {
        return;
      }

      event.impacted_nodes && event.impacted_nodes.forEach(node => {
        if (!node.node_id || !node.old_rect || !node.new_rect) {
          return;
        }

        const oldRect = TraceNodes.traceRectToLHRect(node.old_rect);
        const newRect = TraceNodes.traceRectToLHRect(node.new_rect);
        const areaOfImpact = getRectArea(oldRect) +
          getRectArea(newRect) - 
          getRectOverlapArea(oldRect, newRect);
        
        let prevShiftTotal = 0;
        if (clsPerNodeMap.has(node.node_id)) {
          prevShiftTotal += clsPerNodeMap.get(node.node_id);
        }
        clsPerNodeMap.set(node.node_id, prevShiftTotal + areaOfImpact);
        clsNodeIds.add(node.node_id);
      });
    });

    console.log('=====================');
    console.log(clsPerNodeMap);
    console.log('=====================');
    
    const topFive = [...clsPerNodeMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5).map(entry => Number(entry[0]));

    console.log('=====================');
    console.log(topFive);
    console.log('=====================');
    
    return topFive;
  }

  /**
   * @param {LH.Gatherer.PassContext} passContext
   * @param {LH.Gatherer.LoadData} loadData
   * @return {Promise<LH.Artifacts['TraceNodes']>}
   */
  async afterPass(passContext, loadData) {
    const driver = passContext.driver;
    if (!loadData.trace) {
      throw new Error('Trace is missing!');
    }
    const traceOfTab = TraceProcessor.computeTraceOfTab(loadData.trace);
    const lcpEvent = traceOfTab.largestContentfulPaintEvt;
    const mainThreadEvents = traceOfTab.mainThreadEvents;
    /** @type {Array<number>} */
    const backendNodeIds = [];
    
    const lcpNodeId = lcpEvent && TraceNodes.getLCPNodeFromTraceEvent(lcpEvent);
    const clsNodeIds = TraceNodes.getCLSNodesFromMainThreadEvents(mainThreadEvents);

    if (lcpNodeId) {
      backendNodeIds.push(lcpNodeId);
    }
    backendNodeIds.push(...clsNodeIds);

    // The call below is necessary for pushNodesByBackendIdsToFrontend to properly retrieve nodeIds
    await driver.sendCommand('DOM.getDocument', {depth: -1, pierce: true});
    const translatedIds = await driver.sendCommand('DOM.pushNodesByBackendIdsToFrontend',
      {backendNodeIds: backendNodeIds});
    
    for (let i = 0; i < backendNodeIds.length; i++) {
      // A bit hacky,
      const metricTag = lcpNodeId === backendNodeIds[i] ? 'lcp' : 'cls';
      await driver.sendCommand('DOM.setAttributeValue', {
        nodeId: translatedIds.nodeIds[i],
        name: 'lhtemp',
        value: metricTag,
      });
    }

    const expression = `(() => {
      ${pageFunctions.getElementsInDocumentString};
      ${pageFunctions.getNodePathString};
      ${pageFunctions.getNodeSelectorString};
      ${pageFunctions.getNodeLabelString};
      ${pageFunctions.getOuterHTMLSnippetString};

      return (${collectTraceNodes})();
    })()`;

    const traceNodes = driver.evaluateAsync(expression, {useIsolation: true});
    return traceNodes;
  }
}

module.exports = TraceNodes;
