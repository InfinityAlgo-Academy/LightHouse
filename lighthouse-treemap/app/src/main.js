/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env browser */

/* globals webtreemap TreemapUtil */

/** @type {TreemapViewer} */
let treemapViewer;

class TreemapViewer {
  /**
   * @param {LH.Treemap.Options} options
   * @param {HTMLElement} el
   */
  constructor(options, el) {
    const treemapDebugData = /** @type {LH.Audit.Details.DebugData} */ (
      options.lhr.audits['script-treemap-data'].details);
    if (!treemapDebugData || !treemapDebugData.treemapData) {
      throw new Error('missing script-treemap-data');
    }

    /** @type {LH.Treemap.Node[]} */
    const scriptNodes = treemapDebugData.treemapData;

    /** @type {{[group: string]: LH.Treemap.Node[]}} */
    this.depthOneNodesByGroup = {
      scripts: scriptNodes,
    };

    /**
     * Used to associate every node with a particular depth one node,
     * so that all nodes from the same depth one node can be colored
     * the same.
     * @type {WeakMap<LH.Treemap.Node, LH.Treemap.Node>}
     */
    this.nodeToDepthOneNodeMap = new WeakMap();
    for (const depthOneNodes of Object.values(this.depthOneNodesByGroup)) {
      for (const depthOneNode of depthOneNodes) {
        TreemapUtil.walk(depthOneNode, node => this.nodeToDepthOneNodeMap.set(node, depthOneNode));
      }
    }

    /** @type {LH.Treemap.Node} */
    this.currentTreemapRoot; // eslint-disable-line no-unused-expressions
    this.documentUrl = options.lhr.requestedUrl;
    this.el = el;
    this.getHueForKey = TreemapUtil.stableHasher(TreemapUtil.COLOR_HUES);

    this.createHeader();
    this.show();
    this.initListeners();
  }

  createHeader() {
    const urlEl = TreemapUtil.find('a.lh-header--url');
    urlEl.textContent = this.documentUrl;
    urlEl.href = this.documentUrl;

    const bytes = this.wrapNodesInNewRootNode(this.depthOneNodesByGroup.scripts).resourceBytes;
    TreemapUtil.find('.lh-header--size').textContent = TreemapUtil.formatBytes(bytes);
  }

  initListeners() {
    window.addEventListener('resize', () => {
      this.resize();
    });

    const treemapEl = TreemapUtil.find('.lh-treemap');
    treemapEl.addEventListener('click', (e) => {
      if (!(e.target instanceof HTMLElement)) return;
      const nodeEl = e.target.closest('.webtreemap-node');
      if (!nodeEl) return;

      this.updateColors();
    });

    treemapEl.addEventListener('mouseover', (e) => {
      if (!(e.target instanceof HTMLElement)) return;
      const nodeEl = e.target.closest('.webtreemap-node');
      if (!nodeEl) return;

      nodeEl.classList.add('webtreemap-node--hover');
    });

    treemapEl.addEventListener('mouseout', (e) => {
      if (!(e.target instanceof HTMLElement)) return;
      const nodeEl = e.target.closest('.webtreemap-node');
      if (!nodeEl) return;

      nodeEl.classList.remove('webtreemap-node--hover');
    });
  }

  /**
   * @param {LH.Treemap.Node[]} nodes
   * @return {LH.Treemap.Node}
   */
  wrapNodesInNewRootNode(nodes) {
    const children = [...nodes];
    return {
      name: this.documentUrl,
      resourceBytes: children.reduce((acc, cur) => cur.resourceBytes + acc, 0),
      unusedBytes: children.reduce((acc, cur) => (cur.unusedBytes || 0) + acc, 0),
      children,
    };
  }

  show() {
    const group = 'scripts';

    const depthOneNodes = this.depthOneNodesByGroup[group];
    this.currentTreemapRoot = this.wrapNodesInNewRootNode(depthOneNodes);
    renderViewModeOptions(this.currentTreemapRoot.resourceBytes);

    TreemapUtil.walk(this.currentTreemapRoot, node => {
      // @ts-ignore: webtreemap will store `dom` on the data to speed up operations.
      // However, when we change the underlying data representation, we need to delete
      // all the cached DOM elements. Otherwise, the rendering will be incorrect when,
      // for example, switching between "All JavaScript" and a specific bundle.
      delete node.dom;

      // @ts-ignore: webtreemap uses `size` to partition the treemap.
      node.size = node.resourceBytes || 0;
    });
    webtreemap.sort(this.currentTreemapRoot);

    this.el.innerHTML = '';
    this.render();
  }

  render() {
    this.treemap = new webtreemap.TreeMap(this.currentTreemapRoot, {
      padding: [16, 3, 3, 3],
      spacing: 10,
      caption: node => this.makeCaption(node),
    });
    this.treemap.render(this.el);
    TreemapUtil.find('.webtreemap-node').classList.add('webtreemap-node--root');
    this.updateColors();
  }

  resize() {
    if (!this.treemap) throw new Error('must call .render() first');

    this.treemap.layout(this.currentTreemapRoot, this.el);
    this.updateColors();
  }

  /**
   * Creates the header text for each node in webtreemap.
   * @param {LH.Treemap.Node} node
   */
  makeCaption(node) {
    const size = node.resourceBytes;
    const total = this.currentTreemapRoot.resourceBytes;

    const parts = [
      TreemapUtil.elide(node.name, 60),
      `${TreemapUtil.formatBytes(size)} (${Math.round(size / total * 100)}%)`,
    ];

    // Only add label for bytes on the root node.
    if (node === this.currentTreemapRoot) {
      parts[1] = `resource bytes: ${parts[1]}`;
    }

    return parts.join(' · ');
  }

  updateColors() {
    TreemapUtil.walk(this.currentTreemapRoot, node => {
      // Color a depth one node and all children the same color.
      const depthOneNode = this.nodeToDepthOneNodeMap.get(node);
      const hueKey = depthOneNode ? depthOneNode.name : node.name;
      const hue = this.getHueForKey(hueKey);

      let backgroundColor = 'white';
      let color = 'black';

      if (hue !== undefined) {
        const sat = 60;
        const lig = 90;
        backgroundColor = TreemapUtil.hsl(hue, sat, lig);
        color = lig > 50 ? 'black' : 'white';
      } else {
        // Ran out of colors.
      }

      // @ts-ignore: webtreemap will add a dom node property to every node.
      const dom = /** @type {HTMLElement?} */ (node.dom);
      if (dom) {
        dom.style.backgroundColor = backgroundColor;
        dom.style.color = color;
      }
    });
  }
}

/**
 * @param {number} scriptsResourceSize
 */
function renderViewModeOptions(scriptsResourceSize) {
  const viewModesEl = TreemapUtil.find('.lh-modes');
  viewModesEl.innerHTML = '';

  /**
   * @param {string} label
   * @param {number} bytes
   */
  function makeViewMode(label, bytes) {
    const modesEl = TreemapUtil.createChildOf(viewModesEl, 'div', 'view-mode');
    modesEl.classList.add('view-mode--active');

    TreemapUtil.createChildOf(modesEl, 'span').textContent = label;
    TreemapUtil.createChildOf(modesEl, 'span', 'lh-text-dim').textContent =
    ` (${TreemapUtil.formatBytes(bytes)})`;

    modesEl.addEventListener('click', () => {
      treemapViewer.show();
    });
  }

  makeViewMode('All', scriptsResourceSize);
}

/**
 * Allows for saving the document and loading with data intact.
 * @param {LH.Treemap.Options} options
 */
function injectOptions(options) {
  if (window.__treemapOptions) return;

  const scriptEl = document.createElement('script');
  scriptEl.textContent = `
    window.__treemapOptions = ${JSON.stringify(options)};
  `;
  document.head.append(scriptEl);
}

/**
 * @param {LH.Treemap.Options} options
 */
function init(options) {
  treemapViewer = new TreemapViewer(options, TreemapUtil.find('div.lh-treemap'));

  injectOptions(options);

  // eslint-disable-next-line no-console
  console.log('window.__treemapOptions', window.__treemapOptions);
}

/**
 * @param {string} message
 */
function showError(message) {
  document.body.textContent = message;
}

async function main() {
  if (window.__treemapOptions) {
    // Prefer the hardcoded options from a saved HTML file above all.
    init(window.__treemapOptions);
  } else if (new URLSearchParams(window.location.search).has('debug')) {
    const response = await fetch('debug.json');
    init(await response.json());
  } else {
    window.addEventListener('message', e => {
      if (e.source !== self.opener) return;

      /** @type {LH.Treemap.Options} */
      const options = e.data;
      const {lhr} = options;
      if (!lhr) return showError('Error: Invalid options');

      const documentUrl = lhr.requestedUrl;
      if (!documentUrl) return showError('Error: Invalid options');

      init(options);
    });
  }

  // If the page was opened as a popup, tell the opening window we're ready.
  if (self.opener && !self.opener.closed) {
    self.opener.postMessage({opened: true}, '*');
  }
}

document.addEventListener('DOMContentLoaded', main);
