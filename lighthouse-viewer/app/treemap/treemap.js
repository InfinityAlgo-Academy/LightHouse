/**
 * Copyright 2020 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/** @typedef {import('../../../lighthouse-core/audits/treemap-data.js').RootNode} RootNode */

/**
 * @typedef Mode
 * @property {string} rootNodeId
 * @property {string} partitionBy
 * @property {string} colorBy
 */

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

const KB = 1024;
const MB = KB * KB;
/**
 * @param {number} bytes
 */
function formatBytes(bytes) {
  if (bytes >= MB) return (bytes / MB).toFixed(2) + ' MB';
  if (bytes >= KB) return (bytes / KB).toFixed(2) + ' KB';
  return bytes + ' B';
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

function sortByPrecedence(precedence, a, b) {
  const aIndex = precedence.indexOf(a);
  const bIndex = precedence.indexOf(b);

  // If neither value has a title with a predefined order, use an alphabetical comparison.
  if (aIndex === -1 && bIndex === -1) {
    return a.localeCompare(b);
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
          bytes: rootNode.node.bytes,
          wastedBytes: rootNode.node.wastedBytes,
          executionTime: rootNode.node.executionTime,
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
    }

    this.documentUrl = documentUrl;
    this.rootNodes = rootNodes;
    this.el = el;
    this.currentRootNode = null;
  }

  /**
   * @param {Mode} mode
   */
  show(mode) {
    this.mode = mode;

    if (mode.rootNodeId === 'javascript') {
      const children = this.rootNodes
        .filter(rootNode => rootNode.group === mode.rootNodeId)
        .map(rootNode => rootNode.node);
      this.currentRootNode = {
        originalId: this.documentUrl,
        bytes: children.reduce((acc, cur) => cur.bytes + acc, 0),
        wastedBytes: children.reduce((acc, cur) => cur.wastedBytes + acc, 0),
        executionTime: children.reduce((acc, cur) => (cur.executionTime || 0) + acc, 0),
        children,
      };
    } else {
      this.currentRootNode = this.rootNodes.find(rootNode => rootNode.id === mode.rootNodeId).node;
    }
    // Clone because data is modified.
    this.currentRootNode = JSON.parse(JSON.stringify(this.currentRootNode));

    dfs(this.currentRootNode, node => {
      node.size = node[mode.partitionBy];
    });
    webtreemap.sort(this.currentRootNode);

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
      const {bytes, wastedBytes, executionTime} = node;
      // TODO: this is from pauls code
      // node.id += ` • ${Number.bytesToString(bytes)} • ${Common.UIString('%.1f\xa0%%', bytes / total * 100)}`;
      //                                                                    ^^ what this?

      if (this.mode.partitionBy === 'bytes') {
        const total = this.currentRootNode.bytes;
        node.id = `${elide(node.originalId, 60)} • ${formatBytes(bytes)} • ${Math.round(bytes / total * 100)}%`;
      } else if (this.mode.partitionBy === 'wastedBytes') {
        node.id = `${elide(node.originalId, 60)} • ${formatBytes(wastedBytes)} wasted • ${Math.round((1 - wastedBytes / bytes) * 100)}% usage`;
      } else if (this.mode.partitionBy === 'executionTime' && executionTime !== undefined) {
        node.id = `${elide(node.originalId, 60)} • ${Math.round(executionTime)} ms`;
      } else {
        node.id = elide(node.originalId, 60);
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
      if (this.mode.colorBy === 'wastedBytes') {
        lum = 25 + (85 - 25) * (1 - (node.wastedBytes / node.bytes)); // 25 to 85.
      } else if (this.mode.colorBy === 'executionTime') {
        lum = 25 + (85 - 25) * (1 - ((node.executionTime || 0) / this.currentRootNode.executionTime)); // 25 to 85.
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
  const partitionBySelectorEl = find('.partition-selector');
  const colorBySelectorEl = find('.color-selector');
  function makeOption(value, text) {
    const optionEl = document.createElement('option');
    optionEl.value = value;
    optionEl.innerText = text;
    bundleSelectorEl.append(optionEl);
  }

  function onChange() {
    treemapViewer.show({
      rootNodeId: bundleSelectorEl.value,
      partitionBy: partitionBySelectorEl.value,
      colorBy: colorBySelectorEl.value,
    });
  }

  /** @type {Map<string, RootNode[]>} */
  const nodesByGroup = new Map();
  for (const rootNode of options.rootNodes) {
    const nodes = nodesByGroup.get(rootNode.group) || [];
    nodes.push(rootNode);
    nodesByGroup.set(rootNode.group, nodes);
  }

  const groups = [...nodesByGroup.keys()]
    .sort((a, b) => sortByPrecedence(['javascript'], a, b));
  for (const group of groups) {
    const rootNodes = nodesByGroup.get(group);
    const aggregateNodes = rootNodes.length > 1 && group !== 'misc';

    if (aggregateNodes) {
      makeOption(group, `All ${group}`);
    }

    for (const rootNode of rootNodes) {
      if (!rootNode.node.children) continue; // Only add bundles.
      const title = (aggregateNodes ? '- ' : '') + elide(rootNode.id, 80);
      makeOption(rootNode.id, title);
    }
  }

  bundleSelectorEl.value = options.id;
  bundleSelectorEl.addEventListener('change', onChange);
  partitionBySelectorEl.addEventListener('change', onChange);
  colorBySelectorEl.addEventListener('change', onChange);
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
    treemapViewer.show({
      rootNodeId: id,
      partitionBy: 'bytes',
      colorBy: 'default',
    });

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
    const nodeEl = e.target.closest('.webtreemap-node'); COLOR_HUES;
    if (!nodeEl) return;
    nodeEl.classList.remove('webtreemap-node--hover');
  });
}

main();
