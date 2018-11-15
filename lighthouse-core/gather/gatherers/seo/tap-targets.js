/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* global document, getComputedStyle, Node */

const Gatherer = require('../gatherer');
const pageFunctions = require('../../../lib/page-functions.js');
const {rectContains} = require('../../../lib/client-rect-functions');

const TARGET_SELECTORS = [
  'button',
  'a',
  'input',
  'textarea',
  'select',
  'option',
  '[role=button]',
  '[role=checkbox]',
  '[role=link]',
  '[role=menuitem]',
  '[role=menuitemcheckbox]',
  '[role=menuitemradio]',
  '[role=option]',
  '[role=scrollbar]',
  '[role=slider]',
  '[role=spinbutton]',
];

/**
 * @param {LH.Artifacts.ClientRect[]} clientRects
 */
function allClientRectsEmpty(clientRects) {
  return (
    clientRects.length === 0 ||
    clientRects.every(cr => cr.width === 0 && cr.height === 0)
  );
}

/**
 * @param {{node: Element, clientRects?: LH.Artifacts.ClientRect[], checkClientRectsInsideParents?: boolean}} options
 */
function isVisible({
  node,
  clientRects = getClientRects(node, false),
  checkClientRectsInsideParents = true,
}) {
  const {
    overflowX,
    overflowY,
    display,
    opacity,
    visibility,
  } = getComputedStyle(node);

  if (
    ((overflowX === 'hidden' && overflowY === 'hidden') ||
      node.children.length === 0) &&
    allClientRectsEmpty(clientRects)
  ) {
    return false;
  }

  if (
    display === 'none' ||
    visibility === 'hidden' ||
    visibility === 'collapse' ||
    (opacity && parseFloat(opacity) < 0.1)
  ) {
    return false;
  }

  if (display === 'block' || display === 'inline-block') {
    if (node.clientWidth === 0 && overflowX === 'hidden') {
      return false;
    }
    if (node.clientHeight === 0 && overflowY === 'hidden') {
      return false;
    }
  }

  if (checkClientRectsInsideParents) {
    if (!isWithinAncestorsVisibleScrollArea(node, clientRects)) {
      return false;
    }
  }

  const parent = node.parentElement;
  if (
    parent &&
    parent.tagName !== 'HTML' &&
    !isVisible({node: parent, checkClientRectsInsideParents: false})
  ) {
    return false;
  }

  return true;
}

/**
 * @param {Element} node
 * @param {LH.Artifacts.ClientRect[]} clientRects
 * @returns {boolean}
 */
function isWithinAncestorsVisibleScrollArea(node, clientRects) {
  const parent = node.parentElement;
  if (!parent) {
    return true;
  }
  if (getComputedStyle(parent).overflowY !== 'visible') {
    for (let i = 0; i < clientRects.length; i++) {
      const clientRect = clientRects[i];
      if (!rectContains(parent.getBoundingClientRect(), clientRect)) {
        return false;
      }
    }
  }
  if (parent.parentElement && parent.parentElement.tagName !== 'HTML') {
    return isWithinAncestorsVisibleScrollArea(
      parent.parentElement,
      clientRects
    );
  }
  return true;
}

/**
 * @param {string} str
 * @param {number} maxLength
 * @returns {string}
 */
function truncate(str, maxLength) {
  if (str.length <= maxLength) {
    return str;
  }
  return str.slice(0, maxLength - 1) + '…';
}

/**
 * @param {Element} node
 * @param {boolean} includeChildren
 * @returns {LH.Artifacts.ClientRect[]}
 */
function getClientRects(node, includeChildren = true) {
  const rawClientRects = /** @type {LH.Artifacts.ClientRect[]} */ Array.from(
    node.getClientRects()
  );

  const clientRects = Array.from(rawClientRects).map(clientRect => {
    const {width, height, left, top, right, bottom} = clientRect;
    return {width, height, left, top, right, bottom};
  });
  if (includeChildren) {
    for (const child of node.children) {
      getClientRects(child).forEach(childClientRect =>
        clientRects.push(childClientRect)
      );
    }
  }

  return clientRects;
}

/**
 * Check if node is in a block of text, such as paragraph with a bunch of links in it.
 * @param {Node} node
 * @returns {boolean}
 */
function nodeIsInTextBlock(node) {
  /**
   * @param {Node} node
   * @returns {boolean}
   */
  function isInline(node) {
    // if (!node) {
    //   return false;
    // }
    if (node.nodeType === Node.TEXT_NODE) {
      return true;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return false;
    }
    const element = /** @type {Element} */ (node);
    return (
      getComputedStyle(element).display === 'inline' ||
      getComputedStyle(element).display === 'inline-block'
    );
  }

  /**
   * @param {Node} node
   */
  function hasTextNodeSiblingsFormingTextBlock(node) {
    if (!node.parentElement) {
      return false;
    }

    const parentElement = node.parentElement;

    const nodeText = node.textContent || '';
    const parentText = parentElement.textContent || '';
    if (parentText.length - nodeText.length < 5) {
      // Parent text mostly consists of this node, so the parent
      // is not a text block container
      return false;
    }

    const potentialSiblings = node.parentElement.childNodes;
    for (let i = 0; i < potentialSiblings.length; i++) {
      const sibling = potentialSiblings[i];
      if (sibling === node) {
        continue;
      }
      // check for at least 3 chars so e.g. " || " doesn't count as content
      if (
        sibling.nodeType === Node.TEXT_NODE &&
        sibling.textContent &&
        sibling.textContent.trim().length > 0
      ) {
        return true;
      }
    }

    return false;
  }

  if (!isInline(node)) {
    return false;
  }

  if (hasTextNodeSiblingsFormingTextBlock(node)) {
    return true;
  } else {
    if (node.parentElement) {
      return nodeIsInTextBlock(node.parentElement);
    } else {
      return false;
    }
  }
}

function gatherTapTargets() {
  // todo: move this code out of there and run toString on the function
  // migth need stuff like this: // @ts-ignore - getOuterHTMLSnippet put into scope via stringification

  const selector = TARGET_SELECTORS.join(',');
  // const elements = getElementsInDocument(selector);

  /** @type Array<LH.Artifacts.TapTargetWithNode> */
  let targets = Array.from(document.querySelectorAll(selector)).map(node => ({
    node,
    clientRects: getClientRects(node),
    snippet: truncate(node.outerHTML, 700),
    href: node.getAttribute('href') || '',
  }));

  targets = targets.filter(target => !nodeIsInTextBlock(target.node));

  targets = targets.filter(isVisible);

  return targets.map(t => {
    return {
      ...t,
      node: undefined,
    };
  });
}

/**
 * @param {function} fn
 * @param {(args: any[]) => any} getCacheKey
 */
function cacheResults(fn, getCacheKey) {
  const cache = new Map();
  /**
   * @this {any}
   * @param  {...any} args
   */
  function fnWithCaching(...args) {
    const cacheKey = getCacheKey(args);
    if (cache.get(cacheKey)) {
      return cache.get(cacheKey);
    }

    const result = fn.apply(this, args);
    cache.set(cacheKey, result);
    return result;
  }
  return fnWithCaching;
}

class TapTargets extends Gatherer {
  /**
   * @param {LH.Gatherer.PassContext} passContext
   * @return {Promise<LH.Artifacts.TapTarget[]>} All visible tap targets with their positions and sizes
   */
  afterPass(passContext) {
    const expression = `(function() {
      ${pageFunctions.getElementsInDocumentString};
      ${isWithinAncestorsVisibleScrollArea.toString()};
      ${isVisible.toString()};
      ${truncate.toString()};
      ${getClientRects.toString()};
      ${cacheResults.toString()};
      ${nodeIsInTextBlock.toString()};
      ${allClientRectsEmpty.toString()};
      ${rectContains.toString()};
      ${pageFunctions.getOuterHTMLSnippetString};
      ${gatherTapTargets.toString()};

      const TARGET_SELECTORS = ${JSON.stringify(TARGET_SELECTORS)};
      isVisible = cacheResults(isVisible, args => args[0].node)

      return gatherTapTargets();
    
    })()`;

    return passContext.driver.evaluateAsync(expression);
  }
}

module.exports = TapTargets;
