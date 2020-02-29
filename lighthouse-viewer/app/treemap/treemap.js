/**
 * Copyright 2020 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/** @typedef {import('../../../lighthouse-core/audits/treemap-data.js').RootNode} RootNode */

/** @type {TreemapViewer} */
let treemapViewer;

// From DevTools:
// https://cs.chromium.org/chromium/src/third_party/devtools-frontend/src/front_end/quick_open/CommandMenu.js?l=255&rcl=ad5c586c30a6bc55962b7a96b0533911c86bd4fc
const COLOR_HUES = [
  '#F44336', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5', '#03A9F4',
  '#00BCD4', '#009688', '#4CAF50', '#8BC34A', '#CDDC39', '#FFC107',
  '#FF9800', '#FF5722', '#795548', '#9E9E9E', '#607D8B',
].map(hex => {
  const hexParts = hex.slice(1).split(/(..)/).filter(Boolean);
  const rgb = hexParts.map(part => parseInt(part, 16));
  return rgb2hue(...rgb);
});

/**
 * Brilliant code by akinuri
 * https://stackoverflow.com/a/39147465
 * @param {number} r
 * @param {number} g
 * @param {number} b
 */
function rgb2hue(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const c = max - min;
  let hue;
  if (c == 0) {
    hue = 0;
  } else {
    switch (max) {
      case r:
        var segment = (g - b) / c;
        var shift = 0 / 60; // R° / (360° / hex sides)
        if (segment < 0) { // hue > 180, full rotation
          shift = 360 / 60; // R° / (360° / hex sides)
        }
        hue = segment + shift;
        break;
      case g:
        var segment = (b - r) / c;
        var shift = 120 / 60; // G° / (360° / hex sides)
        hue = segment + shift;
        break;
      case b:
        var segment = (r - g) / c;
        var shift = 240 / 60; // B° / (360° / hex sides)
        hue = segment + shift;
        break;
    }
  }
  return hue * 60; // hue is in [0,6], scale it up
}

/**
 * Guaranteed context.querySelector. Always returns an element or throws if
 * nothing matches query.
 * @param {string} query
 * @param {ParentNode=} context
 * @return {HTMLElement}
 */
function find(query, context = document) {
  /** @type {?HTMLElement} */
  const result = context.querySelector(query);
  if (result === null) {
    throw new Error(`query ${query} not found`);
  }
  return result;
}

function dfs(node, fn) {
  fn(node);
  if (node.children) {
    for (const child of node.children) {
      dfs(child, fn);
    }
  }
}

function hsl(h, s, l) {
  return `hsl(${h}, ${s}%, ${l}%)`;
}

/**
 * @param {string} string
 * @param {number} length
 */
function elide(string, length) {
  if (string.length <= length) return string;
  return string.slice(0, length) + '…';
}

class TreemapViewer {
  /**
   * @param {string} documentUrl
   * @param {RootNode[]} rootNodes
   * @param {HTMLElement} el
   */
  constructor(documentUrl, rootNodes, el) {
    for (const rootNode of rootNodes) {
      // Wrap with the id of the rootNode. Only for bundles.
      if (rootNode.node.children) {
        rootNode.node = {
          id: rootNode.id,
          children: [rootNode.node],
          size: rootNode.node.size,
          wastedBytes: rootNode.node.wastedBytes,
        };

        // Remove the extra layer of nodes, but only if it is just '/'.
        // For example, sometimes it is '//webpack'.
        if (rootNode.node.children[0].id === '/') {
          rootNode.node.children = rootNode.node.children[0].children;
        }
      }

      rootNode.id = rootNode.id;
      dfs(rootNode.node, node => node.originalId = node.id);
      const idHash = [...rootNode.id].reduce((acc, char) => acc + char.charCodeAt(0), 0);
      dfs(rootNode.node, node => node.idHash = idHash);
      webtreemap.sort(rootNode.node);
    }

    this.documentUrl = documentUrl;
    this.rootNodes = rootNodes;
    this.el = el;
    this.currentRootNode = null;
  }

  /**
   * @param {string} id
   * @param {string} mode
   */
  show(id, mode) {
    if (id === 'javascript') {
      const children = this.rootNodes
        .filter(rootNode => rootNode.group === id)
        .map(rootNode => rootNode.node);
      this.currentRootNode = {
        originalId: this.documentUrl,
        size: children.reduce((acc, cur) => cur.size + acc, 0),
        wastedBytes: children.reduce((acc, cur) => cur.wastedBytes + acc, 0),
        children,
      };
      webtreemap.sort(this.currentRootNode);
    } else {
      this.currentRootNode = this.rootNodes.find(rootNode => rootNode.id === id).node;
    }
    // Clone because treemap view modifies input.
    this.currentRootNode = JSON.parse(JSON.stringify(this.currentRootNode));
    this.mode = mode;

    this.setTitle(this.currentRootNode);
    this.el.innerHTML = '';
    this.treemap = new webtreemap.TreeMap(this.currentRootNode, {padding: [18, 3, 3, 3]});
    this.render();
  }

  render() {
    this.treemap.render(this.el);
    this.updateColors();
  }

  /**
   * DFS to generate each treemap node's text.
   * @param {any} node
   */
  setTitle(node) {
    dfs(node, node => {
      const {size, total, wastedBytes} = node;
      // TODO: ?
      // node.id += ` • ${Number.bytesToString(size)} • ${Common.UIString('%.1f\xa0%%', size / total * 100)}`;

      if (this.mode === 'default') {
        node.id = `${elide(node.originalId, 60)} • ${Math.round(size)} • ${Math.round(size / total * 100)}`;
      } else if (this.mode === 'usage') {
        node.id = `${elide(node.originalId, 60)} • ${Math.round(size)} • ${Math.round(wastedBytes / size * 100)}`;
      }
    });
  }

  updateColors() {
    dfs(this.currentRootNode, node => {
      if (!node.dom) return;

      // Choose color based on id hash so colors are stable across runs.
      const hue = COLOR_HUES[node.idHash % COLOR_HUES.length || 0];
      const sat = 60;
      let lum = 40;
      if (this.mode === 'usage') {
        lum = 25 + (85 - 25) * (1 - node.wastedBytes / node.size); // 25 - 85
      }

      node.dom.style.backgroundColor = hsl(hue, sat, Math.round(lum));
      node.dom.style.color = lum > 50 ? 'black' : 'white';
    });
  }
}

/**
 * @param {Options} options
 */
function createHeader(options) {
  const bundleSelectorEl = find('.bundle-selector');
  const modeSelectorEl = find('.mode-selector');
  function makeOption(value, text) {
    const optionEl = document.createElement('option');
    optionEl.value = value;
    optionEl.innerText = text;
    bundleSelectorEl.append(optionEl);
  }

  function onChange() {
    treemapViewer.show(bundleSelectorEl.value, modeSelectorEl.value);
  }

  const hasJavascript = options.rootNodes.some(rootNode => rootNode.group === 'javascript');
  if (hasJavascript) {
    makeOption('javascript', `${elide(options.documentUrl, 70)} (all javascript)`);
  }

  for (const rootNode of options.rootNodes) {
    if (!rootNode.node.children) continue; // Only add bundles.
    makeOption(rootNode.id, elide(rootNode.id, 80));
  }

  bundleSelectorEl.value = options.id;
  bundleSelectorEl.addEventListener('change', onChange);
  modeSelectorEl.addEventListener('change', onChange);
}

/**
 * @typedef Options
 * @property {string} documentUrl
 * @property {string} id
 * @property {RootNode[]} rootNodes
 */

function main() {
  window.addEventListener('message', e => {
    if (e.source !== self.opener) return;
    const options = e.data;
    const {documentUrl, id, rootNodes} = options;
    if (!rootNodes || !documentUrl || !id) return;

    createHeader(options);
    treemapViewer = new TreemapViewer(documentUrl, rootNodes, find('main'));
    treemapViewer.show(id);

    // For debugging.
    window.__treemapViewer = treemapViewer;

    if (self.opener && !self.opener.closed) {
      self.opener.postMessage({rendered: true}, '*');
    }
    if (window.ga) {
      // TODO what are these?
      // window.ga('send', 'event', 'treemap', 'open in viewer');
      window.ga('send', 'event', 'report', 'open in viewer');
    }
  });

  // If the page was opened as a popup, tell the opening window we're ready.
  if (self.opener && !self.opener.closed) {
    self.opener.postMessage({opened: true}, '*');
  }

  window.addEventListener('resize', () => {
    treemapViewer && treemapViewer.render();
  });

  window.addEventListener('click', (e) => {
    const nodeEl = e.target.closest('.webtreemap-node');
    if (!nodeEl) return;
    treemapViewer && treemapViewer.updateColors();
  });

  window.addEventListener('mouseover', (e) => {
    const nodeEl = e.target.closest('.webtreemap-node');
    if (!nodeEl) return;
    nodeEl.classList.add('webtreemap-node--hover');
  });
  window.addEventListener('mouseout', (e) => {
    const nodeEl = e.target.closest('.webtreemap-node');
    if (!nodeEl) return;
    nodeEl.classList.remove('webtreemap-node--hover');
  });
}

main();
