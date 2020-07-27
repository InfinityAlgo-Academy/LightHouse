/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @fileoverview
 * This gatherer identifies elements that contribrute to metrics in the trace (LCP, CLS, etc.).
 * We take the backend nodeId from the trace and use it to find the corresponding element in the DOM.
 */

const Gatherer = require('./gatherer.js');
const pageFunctions = require('../../lib/page-functions.js');
const TraceProcessor = require('../../lib/tracehouse/trace-processor.js');
const RectHelpers = require('../../lib/rect-helpers.js');

/** @typedef {{nodeId: number, score?: number}} TraceElementData */

/**
 * @this {HTMLElement}
 */
/* istanbul ignore next */
function getNodeDetailsData() {
  const elem = this.nodeType === document.ELEMENT_NODE ? this : this.parentElement; // eslint-disable-line no-undef
  let traceElement;
  if (elem) {
    traceElement = {
      // @ts-expect-error - put into scope via stringification
      devtoolsNodePath: getNodePath(elem), // eslint-disable-line no-undef
      // @ts-expect-error - put into scope via stringification
      selector: getNodeSelector(elem), // eslint-disable-line no-undef
      // @ts-expect-error - put into scope via stringification
      nodeLabel: getNodeLabel(elem), // eslint-disable-line no-undef
      // @ts-expect-error - put into scope via stringification
      snippet: getOuterHTMLSnippet(elem), // eslint-disable-line no-undef
      // @ts-expect-error - put into scope via stringification
      boundingRect: getBoundingClientRect(elem), // eslint-disable-line no-undef
    };
  }
  return traceElement;
}

class TraceElements extends Gatherer {
  /**
   * @param {LH.TraceEvent | undefined} event
   * @return {number | undefined}
   */
  static getNodeIDFromTraceEvent(event) {
    return event && event.args &&
      event.args.data && event.args.data.nodeId;
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
    return RectHelpers.addRectTopAndBottom(rectArgs);
  }

  /**
   * This function finds the top (up to 5) elements that contribute to the CLS score of the page.
   * Each layout shift event has a 'score' which is the amount added to the CLS as a result of the given shift(s).
   * We calculate the score per element by taking the 'score' of each layout shift event and
   * distributing it between all the nodes that were shifted, proportianal to the impact region of
   * each shifted element.
   * @param {Array<LH.TraceEvent>} mainThreadEvents
   * @return {Array<TraceElementData>}
   */
  static getTopLayoutShiftElements(mainThreadEvents) {
    /** @type {Map<number, number>} */
    const clsPerNode = new Map();
    const shiftEvents = mainThreadEvents
      .filter(e => e.name === 'LayoutShift')
      .map(e => e.args && e.args.data);
    const indexFirstEventWithoutInput =
      shiftEvents.findIndex(event => event && !event.had_recent_input);

    shiftEvents.forEach((event, index) => {
      if (!event || !event.impacted_nodes || !event.score) {
        return;
      }

      // Ignore events with input, unless it's one of the initial events.
      // See comment in computed/metrics/cumulative-layout-shift.js.
      if (indexFirstEventWithoutInput !== -1 && index >= indexFirstEventWithoutInput) {
        if (event.had_recent_input) return;
      }

      let totalAreaOfImpact = 0;
      /** @type {Map<number, number>} */
      const pixelsMovedPerNode = new Map();

      event.impacted_nodes.forEach(node => {
        if (!node.node_id || !node.old_rect || !node.new_rect) {
          return;
        }

        const oldRect = TraceElements.traceRectToLHRect(node.old_rect);
        const newRect = TraceElements.traceRectToLHRect(node.new_rect);
        const areaOfImpact = RectHelpers.getRectArea(oldRect) +
          RectHelpers.getRectArea(newRect) -
          RectHelpers.getRectOverlapArea(oldRect, newRect);

        pixelsMovedPerNode.set(node.node_id, areaOfImpact);
        totalAreaOfImpact += areaOfImpact;
      });

      for (const [nodeId, pixelsMoved] of pixelsMovedPerNode.entries()) {
        let clsContribution = clsPerNode.get(nodeId) || 0;
        clsContribution += (pixelsMoved / totalAreaOfImpact) * event.score;
        clsPerNode.set(nodeId, clsContribution);
      }
    });

    const topFive = [...clsPerNode.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([nodeId, clsContribution]) => {
      return {
        nodeId: nodeId,
        score: clsContribution,
      };
    });

    return topFive;
  }

  /**
   * Find the node ids of elements which are animated using the Animation trace events.
   * @param {Array<LH.TraceEvent>} mainThreadEvents
   * @return {Array<TraceElementData>}
   */
  static getAnimatedElements(mainThreadEvents) {
    const animatedElementIds = new Set(mainThreadEvents
      .filter(e => e.name === 'Animation' && e.ph === 'b')
      .map(e => this.getNodeIDFromTraceEvent(e)));

    /** @type Array<TraceElementData> */
    const animatedElementData = [];
    for (const nodeId of animatedElementIds) {
      nodeId && animatedElementData.push({nodeId});
    }
    return animatedElementData;
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

    const {largestContentfulPaintEvt, mainThreadEvents} =
      TraceProcessor.computeTraceOfTab(loadData.trace);

    const lcpNodeId = TraceElements.getNodeIDFromTraceEvent(largestContentfulPaintEvt);
    const clsNodeData = TraceElements.getTopLayoutShiftElements(mainThreadEvents);
    const animatedElementData = TraceElements.getAnimatedElements(mainThreadEvents);

    /** @type Map<string, {nodeId: number, score?: number}[]> */
    const backendNodeDataMap = new Map([
      ['largest-contentful-paint', lcpNodeId ? [{nodeId: lcpNodeId}] : []],
      ['layout-shift', clsNodeData],
      ['animation', animatedElementData],
    ]);

    const traceElements = [];
    for (const [traceEventType, backendNodeData] of backendNodeDataMap) {
      for (let i = 0; i < backendNodeData.length; i++) {
        const backendNodeId = backendNodeData[i].nodeId;
        const objectId = await driver.resolveNodeIdToObjectId(backendNodeId);
        if (!objectId) continue;
        const response = await driver.sendCommand('Runtime.callFunctionOn', {
          objectId,
          functionDeclaration: `function () {
            ${getNodeDetailsData.toString()};
            ${pageFunctions.getNodePathString};
            ${pageFunctions.getNodeSelectorString};
            ${pageFunctions.getNodeLabelString};
            ${pageFunctions.getOuterHTMLSnippetString};
            ${pageFunctions.getBoundingClientRectString};
            return getNodeDetailsData.call(this);
          }`,
          returnByValue: true,
          awaitPromise: true,
        });

        if (response && response.result && response.result.value) {
          traceElements.push({
            traceEventType,
            ...response.result.value,
            score: backendNodeData[i].score,
            nodeId: backendNodeId,
          });
        }
      }
    }

    return traceElements;
  }
}

module.exports = TraceElements;
