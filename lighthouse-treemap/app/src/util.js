/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env browser */

/** @typedef {HTMLElementTagNameMap & {[id: string]: HTMLElement}} HTMLElementByTagName */

const KB = 1024;
const MB = KB * KB;

class Util {
  /**
   * @param {Treemap.Node} node
   * @param {(node: Treemap.Node, path: string[]) => void} fn
   * @param {string[]=} path
   */
  static dfs(node, fn, path) {
    if (!path) path = [];
    path.push(node.name);

    fn(node, path);
    if (!node.children) return;

    for (const child of node.children) {
      Util.dfs(child, fn, [...path]);
    }
  }

  /**
   * @param {string[]} path1
   * @param {string[]} path2
   */
  static pathsAreEqual(path1, path2) {
    if (path1.length !== path2.length) return false;
    for (let i = 0; i < path1.length; i++) {
      if (path1[i] !== path2[i]) return false;
    }
    return true;
  }

  /**
   * @param {string[]} maybeSubpath
   * @param {string[]} path
   */
  static pathIsSubpath(maybeSubpath, path) {
    if (maybeSubpath.length > path.length) return false;
    for (let i = 0; i < maybeSubpath.length; i++) {
      if (maybeSubpath[i] !== path[i]) return false;
    }
    return true;
  }

  /**
   * @param {string} string
   * @param {number} length
   */
  static elide(string, length) {
    if (string.length <= length) return string;
    return string.slice(0, length) + '…';
  }

  /**
   * @template {string} T
   * @param {T} name
   * @param {string=} className
   * @param {Object<string, (string|undefined)>=} attrs Attribute key/val pairs.
   *     Note: if an attribute key has an undefined value, this method does not
   *     set the attribute on the node.
   * @return {HTMLElementByTagName[T]}
   */
  static createElement(name, className, attrs = {}) {
    const element = document.createElement(name);
    if (className) {
      element.className = className;
    }
    Object.keys(attrs).forEach(key => {
      const value = attrs[key];
      if (typeof value !== 'undefined') {
        element.setAttribute(key, value);
      }
    });
    return element;
  }

  /**
   * @template {string} T
   * @param {Element} parentElem
   * @param {T} elementName
   * @param {string=} className
   * @param {Object<string, (string|undefined)>=} attrs Attribute key/val pairs.
   *     Note: if an attribute key has an undefined value, this method does not
   *     set the attribute on the node.
   * @return {HTMLElementByTagName[T]}
   */
  static createChildOf(parentElem, elementName, className, attrs) {
    const element = this.createElement(elementName, className, attrs);
    parentElem.appendChild(element);
    return element;
  }

  /**
   * Guaranteed context.querySelector. Always returns an element or throws if
   * nothing matches query.
   * @param {string} query
   * @param {ParentNode=} context
   * @return {HTMLElement}
   */
  static find(query, context = document) {
    /** @type {?HTMLElement} */
    const result = context.querySelector(query);
    if (result === null) {
      throw new Error(`query ${query} not found`);
    }
    return result;
  }

  /**
   * @param {number} bytes
   */
  static formatBytes(bytes) {
    if (bytes >= MB) return (bytes / MB).toFixed(2) + ' MiB';
    if (bytes >= KB) return (bytes / KB).toFixed(0) + ' KiB';
    return bytes + ' B';
  }

  /**
   * @param {number} value
   * @param {string} unit
   */
  static format(value, unit) {
    if (unit === 'bytes') return Util.formatBytes(value);
    if (unit === 'time') return `${value} ms`;
    return `${value} ${unit}`;
  }

  /**
   * @example array.sort((a, b) => sortByPrecedence(['first', 'me next. alpha sort after'], a, b));
   * @template T
   * @param {T[]} precedence
   * @param {T} a
   * @param {T} b
   */
  static sortByPrecedence(precedence, a, b) {
    const aIndex = precedence.indexOf(a);
    const bIndex = precedence.indexOf(b);

    // If neither value has a title with a predefined order, use an alphabetical comparison.
    if (aIndex === -1 && bIndex === -1) {
      return String(a).localeCompare(String(b));
    }

    // If just one value has a title with a predefined order, it is greater.
    if (aIndex === -1 && bIndex >= 0) {
      return 1;
    }
    if (bIndex === -1 && aIndex >= 0) {
      return -1;
    }

    // Both values have a title with a predefined order, so do a simple comparison.
    return aIndex - bIndex;
  }

  /**
   * @template T
   * @param {T[]} items
   * @return {(key: string) => T|undefined}
   */
  static stableHasher(items) {
    // Clone.
    items = [...items];

    /** @type {Map<string, T>} */
    const assignedItems = new Map();
    return key => {
      // Key has already been assigned an item.
      if (assignedItems.has(key)) return assignedItems.get(key);

      // Ran out of items.
      if (items.length === 0) return;

      // Select a random item using a stable hash.
      const hash = [...key].reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const [assignedColor] = items.splice(hash % items.length, 1);
      assignedItems.set(key, assignedColor);

      return assignedColor;
    };
  }

  /**
   * @param {number} h
   * @param {number} s
   * @param {number} l
   */
  static hsl(h, s, l) {
    return `hsl(${h}, ${s}%, ${l}%)`;
  }

  /**
   * Brilliant code by akinuri
   * https://stackoverflow.com/a/39147465
   * @param {number} r
   * @param {number} g
   * @param {number} b
   */
  static rgb2hue(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const c = max - min;
    let hue = 0;
    let segment;
    let shift;
    if (c === 0) {
      hue = 0;
    } else {
      switch (max) {
        case r:
          segment = (g - b) / c;
          shift = 0 / 60; // R° / (360° / hex sides)
          if (segment < 0) { // hue > 180, full rotation
            shift = 360 / 60; // R° / (360° / hex sides)
          }
          hue = segment + shift;
          break;
        case g:
          segment = (b - r) / c;
          shift = 120 / 60; // G° / (360° / hex sides)
          hue = segment + shift;
          break;
        case b:
          segment = (r - g) / c;
          shift = 240 / 60; // B° / (360° / hex sides)
          hue = segment + shift;
          break;
      }
    }
    return hue * 60; // hue is in [0,6], scale it up
  }
}

// From DevTools:
// https://cs.chromium.org/chromium/src/third_party/devtools-frontend/src/front_end/quick_open/CommandMenu.js?l=255&rcl=ad5c586c30a6bc55962b7a96b0533911c86bd4fc
Util.COLOR_HUES = [
  '#F44336', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5', '#03A9F4',
  '#00BCD4', '#009688', '#4CAF50', '#8BC34A', '#CDDC39', '#FFC107',
  '#FF9800', '#FF5722', '#795548', '#9E9E9E', '#607D8B',
].map(hex => {
  const hexParts = hex.slice(1).split(/(..)/).filter(Boolean);
  const [r, g, b] = hexParts.map(part => parseInt(part, 16));
  return Util.rgb2hue(r, g, b);
});

// node export for testing.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Util;
}
