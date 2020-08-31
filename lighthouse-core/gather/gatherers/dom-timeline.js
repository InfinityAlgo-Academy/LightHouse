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

/* global window, MutationObserver, document, performance, getNodePath, getOuterHTMLSnippet, getNodeSelector, getNodeLabel, ShadowRoot */


function setupObserver() {
  function getNodePath(node) {
  /** @param {Node} node */
    function getNodeIndex(node) {
      let index = 0;
      let prevNode;
      while (prevNode = node.previousSibling) {
        node = prevNode;
        // skip empty text nodes
        if (node.nodeType === Node.TEXT_NODE && node.nodeValue.trim().length === 0) continue;
        index++;
      }
      return index;
    }

    const path = [];
    while (node && node.parentNode) {
      const index = getNodeIndex(node);
      path.push([index, node.nodeName]);
      node = node.parentNode;
    }
    path.reverse();
    return path.join(',');
  }
  function getNodeLabel(node) {
    // Inline so that audits that import getNodeLabel don't
    // also need to import truncate
    /**
     * @param {string} str
     * @param {number} maxLength
     * @return {string}
     */
    function truncate(str, maxLength) {
      if (str.length <= maxLength) {
        return str;
      }
      return str.slice(0, maxLength - 1) + '…';
    }

    const tagName = node.tagName.toLowerCase();
    // html and body content is too broad to be useful, since they contain all page content
    if (tagName !== 'html' && tagName !== 'body') {
      const nodeLabel = node.innerText || node.getAttribute('alt') || node.getAttribute('aria-label');
      if (nodeLabel) {
        return truncate(nodeLabel, 80);
      } else {
        // If no useful label was found then try to get one from a child.
        // E.g. if an a tag contains an image but no text we want the image alt/aria-label attribute.
        const nodeToUseForLabel = node.querySelector('[alt], [aria-label]');
        if (nodeToUseForLabel) {
          return getNodeLabel(/** @type {HTMLElement} */ (nodeToUseForLabel));
        }
      }
    }
    return tagName;
  }
  function getOuterHTMLSnippet(element, ignoreAttrs = [], snippetCharacterLimit = 500) {
    const ATTRIBUTE_CHAR_LIMIT = 75;
    try {
      // ShadowRoots are sometimes passed in; use their hosts' outerHTML.
      if (element instanceof ShadowRoot) {
        element = element.host;
      }

      const clone = element.cloneNode();
      ignoreAttrs.forEach(attribute =>{
        clone.removeAttribute(attribute);
      });
      let charCount = 0;
      for (const attributeName of clone.getAttributeNames()) {
        if (charCount > snippetCharacterLimit) {
          clone.removeAttribute(attributeName);
        } else {
          let attributeValue = clone.getAttribute(attributeName);
          if (attributeValue.length > ATTRIBUTE_CHAR_LIMIT) {
            attributeValue = attributeValue.slice(0, ATTRIBUTE_CHAR_LIMIT - 1) + '…';
            clone.setAttribute(attributeName, attributeValue);
          }
          charCount += attributeName.length + attributeValue.length;
        }
      }

      const reOpeningTag = /^[\s\S]*?>/;
      const [match] = clone.outerHTML.match(reOpeningTag) || [];
      if (match && charCount > snippetCharacterLimit) {
        return match.slice(0, match.length - 1) + ' …>';
      }
      return match || '';
    } catch (_) {
      // As a last resort, fall back to localName.
      return `<${element.localName}>`;
    }
  }
  function getNodeSelector(node) {
    /**
     * @param {Element} node
     */
    function getSelectorPart(node) {
      let part = node.tagName.toLowerCase();
      if (node.id) {
        part += '#' + node.id;
      } else if (node.classList.length > 0) {
        part += '.' + node.classList[0];
      }
      return part;
    }

    const parts = [];
    while (parts.length < 4) {
      parts.unshift(getSelectorPart(node));
      if (!node.parentElement) {
        break;
      }
      node = node.parentElement;
      if (node.tagName === 'HTML') {
        break;
      }
    }
    return parts.join(' > ');
  }
  window.___observedIframes = [];
  window.___observer = new MutationObserver((records) => {
    const mark = performance.mark('lh_timealign');
    for (const record of records) {
      if (record.type !== 'childList') return;
      const addedNodes = Array.from(record.addedNodes || []);
      if (!addedNodes || !addedNodes.some(node => node.nodeName === 'IFRAME')) return;
      for (const node of addedNodes) {
        if (node.nodeName !== 'IFRAME') continue;
        // can verify that Iframe src is of an ad network / ignore non-ad iframes
        window.___observedIframes.push({
          time: mark.startTime,
          devtoolsNodePath: getNodePath(node),
          snippet: getOuterHTMLSnippet(node),
          selector: getNodeSelector(node),
          nodeLabel: getNodeLabel(node),
        });
      }
    }
  });
  window.___observer.observe(document, {childList: true, subtree: true});
}

/**
 * //@return {Array<LH.Artifacts.DOMTimestamp>}
 */
function getDOMTimestamps() {
  window.___observer.disconnect();
  return window.___observedIframes;
}


class DOMTimeline extends Gatherer {
  /**
   * @param {LH.Gatherer.PassContext} passContext
   */
  async beforePass(passContext) {
    return passContext.driver.evaluateScriptOnNewDocument(`(${setupObserver.toString()})()`);
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

    const {keyEvents} = TraceProcessor.computeTraceOfTab(loadData.trace);
    // console.log(keyEvents);

    const layoutEvents = keyEvents
      .filter(e => e.cat === 'devtools.timeline' && e.name === 'Layout' ||
      // e.cat === 'devtools.timeline' && e.name === 'UpdateLayerTree' ||
      e.name === 'LayoutShift')
      .map(e => {
        return {event: e} //, timing: maybeGetTiming(getTimestamp(e))};
      });
    console.log(layoutEvents);

    const windows = [];
    let end = undefined;
    let start = undefined;
    for (const event in layoutEvents) {
      if (event.name === 'Layout') {
        start = event.ts;
      }
    }
    // refilter to only have Layout +- Layout LayoutShift patterns throughout
    // then can do forward pass and do Layout = start, LayoutShift = end, start again

    /**
    const updateLayerTreeEvents = keyEvents
      .filter(e => e.cat === 'devtools.timeline' && e.name === 'UpdateLayerTree')
      .map(e => {
        return {event: e} //, timing: maybeGetTiming(getTimestamp(e))};
      });
    console.log(updateLayerTreeEvents);
    */

    const expression = `(() => {
      return (${getDOMTimestamps.toString()})();
    })()`;

    const domTimestamps = await driver.evaluateAsync(expression);
    console.log(domTimestamps);

    return [];
  }
}

module.exports = DOMTimeline;

