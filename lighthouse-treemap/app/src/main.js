/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env browser */

/* globals webtreemap TreemapUtil Tabulator Cell Row */

const UNUSED_BYTES_IGNORE_THRESHOLD = 20 * 1024;
const UNUSED_BYTES_IGNORE_BUNDLE_SOURCE_RATIO = 0.5;
const DUPLICATED_MODULES_IGNORE_THRESHOLD = 1024;
const DUPLICATED_MODULES_IGNORE_ROOT_RATIO = 0.01;

/** @type {TreemapViewer} */
let treemapViewer;

// Make scrolling in Tabulator more performant.
// @ts-expect-error
Cell.prototype.clearHeight = () => {};
// @ts-expect-error
Row.prototype.calcHeight = function() {
  this.height = 24;
  this.outerHeight = 24;
  this.heightStyled = '24px';
};

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

    /** @type {WeakMap<LH.Treemap.Node, LH.Treemap.NodePath>} */
    this.nodeToPathMap = new WeakMap();

    this.documentUrl = options.lhr.requestedUrl;
    this.el = el;
    this.getHueForD1NodeName = TreemapUtil.stableHasher(TreemapUtil.COLOR_HUES);
    this.getHueForModuleNodeName = TreemapUtil.stableHasher(TreemapUtil.COLOR_HUES);

    /* eslint-disable no-unused-expressions */
    /** @type {LH.Treemap.Node} */
    this.currentTreemapRoot;
    /** @type {LH.Treemap.ViewMode} */
    this.currentViewMode;
    /** @type {LH.Treemap.Selector} */
    this.selector;
    /** @type {LH.Treemap.ViewMode[]} */
    this.viewModes;
    /** @type {RenderState=} */
    this.previousRenderState;
    /** @type {WebTreeMap} */
    this.treemap;
    /*  eslint-enable no-unused-expressions */

    this.createHeader();
    this.initListeners();
    this.setSelector({type: 'group', value: 'scripts'});
    this.render();
  }

  createHeader() {
    const urlEl = TreemapUtil.find('a.lh-header--url');
    urlEl.textContent = this.documentUrl;
    urlEl.href = this.documentUrl;

    const bytes = this.wrapNodesInNewRootNode(this.depthOneNodesByGroup.scripts).resourceBytes;
    TreemapUtil.find('.lh-header--size').textContent = TreemapUtil.formatBytes(bytes);

    this.createBundleSelector();

    const toggleTableBtn = TreemapUtil.find('.lh-button--toggle-table');
    toggleTableBtn.addEventListener('click', () => treemapViewer.toggleTable());
  }

  createBundleSelector() {
    const bundleSelectorEl = TreemapUtil.find('select.bundle-selector');
    bundleSelectorEl.innerHTML = ''; // Clear just in case document was saved with Ctrl+S.

    /** @type {LH.Treemap.Selector[]} */
    const selectors = [];

    /**
     * @param {LH.Treemap.Selector} selector
     * @param {string} text
     */
    function makeOption(selector, text) {
      const optionEl = TreemapUtil.createChildOf(bundleSelectorEl, 'option');
      optionEl.value = String(selectors.length);
      selectors.push(selector);
      optionEl.textContent = text;
    }

    for (const [group, depthOneNodes] of Object.entries(this.depthOneNodesByGroup)) {
      makeOption({type: 'group', value: group}, `All ${group}`);
      for (const depthOneNode of depthOneNodes) {
        // Only add bundles.
        if (!depthOneNode.children) continue;

        makeOption({type: 'depthOneNode', value: depthOneNode.name}, depthOneNode.name);
      }
    }

    const currentSelectorIndex = selectors.findIndex(s => {
      return this.selector &&
        s.type === this.selector.type &&
        s.value === this.selector.value;
    });
    bundleSelectorEl.value = String(currentSelectorIndex !== -1 ? currentSelectorIndex : 0);
    bundleSelectorEl.addEventListener('change', () => {
      const index = Number(bundleSelectorEl.value);
      const selector = selectors[index];
      this.setSelector(selector);
      this.render();
    });
  }

  initListeners() {
    const treemapEl = TreemapUtil.find('.lh-treemap');

    const resizeObserver = new ResizeObserver(() => this.resize());
    resizeObserver.observe(treemapEl);

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

  createViewModes() {
    /**
     * @param {LH.Treemap.Node} root
     * @return {LH.Treemap.ViewMode|undefined}
     */
    function createUnusedBytesViewMode(root) {
      if (root.unusedBytes === undefined) return;

      /** @type {LH.Treemap.NodePath[]} */
      const highlightNodePaths = [];
      for (const d1Node of root.children || []) {
        // Only highlight leaf nodes if entire node (ie a JS bundle) has greater than a certain
        // number of unused bytes.
        if (!d1Node.unusedBytes || d1Node.unusedBytes < UNUSED_BYTES_IGNORE_THRESHOLD) continue;

        TreemapUtil.walk(d1Node, (node, path) => {
          // Only highlight leaf nodes of a certain ratio of unused bytes.
          if (node.children) return;
          if (!node.unusedBytes || !node.resourceBytes) return;
          if (node.unusedBytes / node.resourceBytes < UNUSED_BYTES_IGNORE_BUNDLE_SOURCE_RATIO) {
            return;
          }

          highlightNodePaths.push([root.name, ...path]);
        });
      }
      return {
        id: 'unused-bytes',
        label: 'Unused Bytes',
        subLabel: TreemapUtil.formatBytes(root.unusedBytes),
        highlightNodePaths,
        enabled: true,
      };
    }

    /**
     * @param {LH.Treemap.Node} root
     * @return {LH.Treemap.ViewMode|undefined}
     */
    const createDuplicateModulesViewMode = (root) => {
      /** @type {Map<string, Array<{node: LH.Treemap.Node, path: string[]}>>} */
      const moduleNameToNodes = new Map();
      for (const d1Node of root.children || []) {
        TreemapUtil.walk(d1Node, (node, path) => {
          if (node.children) return;
          if (!node.duplicatedNormalizedModuleName) return;

          const nodes = moduleNameToNodes.get(node.duplicatedNormalizedModuleName) || [];
          nodes.push({node, path});
          moduleNameToNodes.set(node.duplicatedNormalizedModuleName, nodes);
        });
      }

      let potentialByteSavings = 0;

      /** @type {LH.Treemap.NodePath[]} */
      const highlightNodePaths = [];
      for (const nodesWithSameModuleName of moduleNameToNodes.values()) {
        if (nodesWithSameModuleName.length === 1) continue;

        const bytes = [];
        for (const {node} of nodesWithSameModuleName) {
          bytes.push(node.resourceBytes);
        }

        // Sum all but the largest copy.
        bytes.sort((a, b) => b - a);
        let duplicatedBytes = 0;
        for (let i = 1; i < bytes.length; i++) duplicatedBytes += bytes[i];
        if (duplicatedBytes < DUPLICATED_MODULES_IGNORE_THRESHOLD) continue;

        for (const {path} of nodesWithSameModuleName) {
          highlightNodePaths.push([root.name, ...path]);
        }
        potentialByteSavings += duplicatedBytes;
      }

      let enabled = true;
      if (highlightNodePaths.length === 0) enabled = false;
      if (potentialByteSavings / root.resourceBytes < DUPLICATED_MODULES_IGNORE_ROOT_RATIO) {
        enabled = false;
      }

      return {
        id: 'duplicate-modules',
        label: 'Duplicate Modules',
        subLabel: enabled ? TreemapUtil.formatBytes(potentialByteSavings) : 'N/A',
        highlightNodePaths,
        enabled,
      };
    };

    /** @type {LH.Treemap.ViewMode[]} */
    const viewModes = [];

    viewModes.push({
      id: 'all',
      label: `All`,
      subLabel: TreemapUtil.formatBytes(this.currentTreemapRoot.resourceBytes),
      enabled: true,
    });

    const unusedBytesViewMode = createUnusedBytesViewMode(this.currentTreemapRoot);
    if (unusedBytesViewMode) viewModes.push(unusedBytesViewMode);

    const duplicateModulesViewMode = createDuplicateModulesViewMode(this.currentTreemapRoot);
    if (duplicateModulesViewMode) viewModes.push(duplicateModulesViewMode);

    return viewModes;
  }

  /**
   * @param {LH.Treemap.Selector} selector
   */
  setSelector(selector) {
    this.selector = selector;

    if (selector.type === 'group') {
      this.currentTreemapRoot =
        this.wrapNodesInNewRootNode(this.depthOneNodesByGroup[selector.value]);
    } else if (selector.type === 'depthOneNode') {
      let node;
      outer: for (const depthOneNodes of Object.values(this.depthOneNodesByGroup)) {
        for (const depthOneNode of depthOneNodes) {
          if (depthOneNode.name === selector.value) {
            node = depthOneNode;
            break outer;
          }
        }
      }

      if (!node) {
        throw new Error('unknown depthOneNode: ' + selector.value);
      }

      this.currentTreemapRoot = node;
    } else {
      throw new Error('unknown selector: ' + JSON.stringify(selector));
    }

    this.viewModes = this.createViewModes();
    const currentViewModeIsDisabled = this.currentViewMode &&
      this.viewModes.find(v => v.id === this.currentViewMode.id && !v.enabled);
    if (!this.currentViewMode || currentViewModeIsDisabled) {
      this.currentViewMode = this.viewModes[0];
    }
  }

  /**
   * @param {LH.Treemap.ViewMode} viewMode
   */
  setViewMode(viewMode) {
    this.currentViewMode = viewMode;
  }

  render() {
    const rootChanged =
      !this.previousRenderState || this.previousRenderState.root !== this.currentTreemapRoot;
    const viewChanged =
      !this.previousRenderState || this.previousRenderState.viewMode !== this.currentViewMode;

    if (rootChanged) {
      this.nodeToPathMap = new Map();
      TreemapUtil.walk(this.currentTreemapRoot, (node, path) => this.nodeToPathMap.set(node, path));
      renderViewModeButtons(this.viewModes);

      TreemapUtil.walk(this.currentTreemapRoot, node => {
        // @ts-ignore: webtreemap will store `dom` on the data to speed up operations.
        // However, when we change the underlying data representation, we need to delete
        // all the cached DOM elements. Otherwise, the rendering will be incorrect when,
        // for example, switching between "All JavaScript" and a specific bundle.
        delete node.dom;

        // @ts-ignore: webtreemap uses `size` to partition the treemap.
        node.size = node[this.currentViewMode.partitionBy || 'resourceBytes'] || 0;
      });
      webtreemap.sort(this.currentTreemapRoot);

      this.treemap = new webtreemap.TreeMap(this.currentTreemapRoot, {
        padding: [16, 3, 3, 3],
        spacing: 10,
        caption: node => this.makeCaption(node),
      });
      this.el.innerHTML = '';
      this.treemap.render(this.el);
      TreemapUtil.find('.webtreemap-node').classList.add('webtreemap-node--root');

      this.createTable();
    }

    if (rootChanged || viewChanged) {
      this.updateColors();
      applyActiveClass(this.currentViewMode.id);
    }

    this.previousRenderState = {
      root: this.currentTreemapRoot,
      viewMode: this.currentViewMode,
    };
  }

  createTable() {
    const tableEl = TreemapUtil.find('.lh-table');
    tableEl.innerHTML = '';

    /** @type {Array<{name: string, bundleNode?: LH.Treemap.Node, resourceBytes: number, unusedBytes?: number}>} */
    const data = [];
    TreemapUtil.walk(this.currentTreemapRoot, (node, path) => {
      if (node.children) return;

      const depthOneNode = this.nodeToDepthOneNodeMap.get(node);
      const bundleNode = depthOneNode && depthOneNode.children ? depthOneNode : undefined;

      let name;
      if (bundleNode) {
        const bundleNodePath = this.nodeToPathMap.get(bundleNode);
        const amountToTrim = bundleNodePath ? bundleNodePath.length : 0; // should never be 0.
        name = `(bundle) ${path.slice(amountToTrim).join('/')}`;
      } else {
        // Elide the first path component, which is common to all nodes.
        if (path[0] === this.currentTreemapRoot.name) {
          name = path.slice(1).join('/');
        } else {
          name = path.join('/');
        }

        // Elide the document URL.
        if (name.startsWith(this.currentTreemapRoot.name)) {
          name = name.replace(this.currentTreemapRoot.name, '//');
        }
      }

      data.push({
        name,
        bundleNode,
        resourceBytes: node.resourceBytes,
        unusedBytes: node.unusedBytes,
      });
    });

    /** @param {Tabulator.CellComponent} cell */
    const makeNameTooltip = (cell) => {
      /** @type {typeof data[number]} */
      const dataRow = cell.getRow().getData();
      if (!dataRow.bundleNode) return '';

      return `${dataRow.bundleNode.name} (bundle) ${dataRow.name}`;
    };

    /** @param {Tabulator.CellComponent} cell */
    const makeCoverageTooltip = (cell) => {
      /** @type {typeof data[number]} */
      const dataRow = cell.getRow().getData();
      if (!dataRow.unusedBytes) return '';

      const percent = Math.floor(100 * dataRow.unusedBytes / dataRow.resourceBytes);
      return `${percent}% bytes unused`;
    };

    const gridEl = document.createElement('div');
    tableEl.append(gridEl);

    const children = this.currentTreemapRoot.children || [];
    const maxSize = Math.max(...children.map(node => node.resourceBytes));

    this.table = new Tabulator(gridEl, {
      data,
      height: '100%',
      layout: 'fitColumns',
      tooltips: true,
      addRowPos: 'top',
      resizableColumns: true,
      initialSort: [
        {column: 'resourceBytes', dir: 'desc'},
      ],
      columns: [
        {title: 'Name', field: 'name', widthGrow: 5, tooltip: makeNameTooltip},
        {title: 'Size', field: 'resourceBytes', headerSortStartingDir: 'desc', formatter: cell => {
          const value = cell.getValue();
          return TreemapUtil.formatBytes(value);
        }},
        // eslint-disable-next-line max-len
        {title: 'Unused', field: 'unusedBytes', widthGrow: 1, sorterParams: {alignEmptyValues: 'bottom'}, headerSortStartingDir: 'desc', formatter: cell => {
          const value = cell.getValue();
          if (value === undefined) return '';
          return TreemapUtil.formatBytes(value);
        }},
        // eslint-disable-next-line max-len
        {title: 'Coverage', widthGrow: 3, headerSort: false, tooltip: makeCoverageTooltip, formatter: cell => {
          /** @type {typeof data[number]} */
          const dataRow = cell.getRow().getData();

          const el = TreemapUtil.createElement('div', 'lh-coverage-bar');
          if (dataRow.unusedBytes === undefined) return el;

          el.style.setProperty('--max', String(maxSize));
          el.style.setProperty('--used', String(dataRow.resourceBytes - dataRow.unusedBytes));
          el.style.setProperty('--unused', String(dataRow.unusedBytes));

          TreemapUtil.createChildOf(el, 'div', 'lh-coverage-bar--used');
          TreemapUtil.createChildOf(el, 'div', 'lh-coverage-bar--unused');

          return el;
        }},
      ],
    });
  }

  toggleTable() {
    const mainEl = TreemapUtil.find('main');
    mainEl.classList.toggle('lh-main--show-table');
    const buttonEl = TreemapUtil.find('.lh-button--toggle-table');
    buttonEl.classList.toggle('lh-button--active');
  }

  resize() {
    if (!this.treemap) throw new Error('must call .render() first');

    this.treemap.layout(this.currentTreemapRoot, this.el);
    this.updateColors();
    if (this.table) this.table.redraw();
  }

  /**
   * Creates the header text for each node in webtreemap.
   * @param {LH.Treemap.Node} node
   */
  makeCaption(node) {
    const partitionBy = this.currentViewMode.partitionBy || 'resourceBytes';
    const bytes = node[partitionBy];
    const total = this.currentTreemapRoot[partitionBy];

    const parts = [
      TreemapUtil.elide(node.name, 60),
    ];

    if (bytes !== undefined && total !== undefined) {
      let str = `${TreemapUtil.formatBytes(bytes)} (${Math.round(bytes / total * 100)}%)`;
      // Only add label for bytes on the root node.
      if (node === this.currentTreemapRoot) {
        str = `${partitionBy}: ${str}`;
      }
      parts.push(str);
    }

    return parts.join(' · ');
  }

  updateColors() {
    TreemapUtil.walk(this.currentTreemapRoot, node => {
      let hue;
      if (this.currentViewMode.id === 'duplicate-modules') {
        hue = this.getHueForModuleNodeName(node.duplicatedNormalizedModuleName || '');
      } else {
        // Color a depth one node and all children the same color.
        const depthOneNode = this.nodeToDepthOneNodeMap.get(node);
        hue = this.getHueForD1NodeName(depthOneNode ? depthOneNode.name : node.name);
      }

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

      // A view can set nodes to highlight. If so, don't color anything else.
      if (this.currentViewMode.highlightNodePaths) {
        const path = this.nodeToPathMap.get(node);
        const shouldHighlight = path && this.currentViewMode.highlightNodePaths
          .some(pathToHighlight => TreemapUtil.pathsAreEqual(pathToHighlight, path));
        if (!shouldHighlight) backgroundColor = 'white';
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
 * @param {LH.Treemap.ViewMode[]} viewModes
 */
function renderViewModeButtons(viewModes) {
  /**
   * @param {LH.Treemap.ViewMode} viewMode
   */
  function render(viewMode) {
    const viewModeEl = TreemapUtil.createChildOf(viewModesEl, 'div', 'view-mode');
    if (!viewMode.enabled) viewModeEl.classList.add('view-mode--disabled');
    viewModeEl.id = `view-mode--${viewMode.id}`;

    const labelEl = TreemapUtil.createChildOf(viewModeEl, 'label');
    TreemapUtil.createChildOf(labelEl, 'span', 'view-mode__label').textContent = viewMode.label;
    TreemapUtil.createChildOf(labelEl, 'span', 'view-mode__sublabel lh-text-dim').textContent =
      ` (${viewMode.subLabel})`;

    const inputEl = TreemapUtil.createChildOf(labelEl, 'input', 'view-mode__button', {
      type: 'radio',
      name: 'view-mode',
      disabled: viewMode.enabled ? undefined : '',
    });

    inputEl.addEventListener('click', () => {
      treemapViewer.setViewMode(viewMode);
      treemapViewer.render();
    });
  }

  const viewModesEl = TreemapUtil.find('.lh-modes');
  viewModesEl.innerHTML = '';
  viewModes.forEach(render);
}

/**
 * @param {string} currentViewModeId
 */
function applyActiveClass(currentViewModeId) {
  const viewModesEl = TreemapUtil.find('.lh-modes');
  for (const viewModeEl of viewModesEl.querySelectorAll('.view-mode')) {
    if (!(viewModeEl instanceof HTMLElement)) continue;

    viewModeEl.classList
      .toggle('view-mode--active', viewModeEl.id === `view-mode--${currentViewModeId}`);
  }
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
