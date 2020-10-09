/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env browser */

/* globals webtreemap Tabulator Util */

/** @type {TreemapViewer} */
let treemapViewer;

// TODO: click on lighthouse logo -> default mode.

// TODO: use the full URL to shorten names?
// if (id.startsWith(origin)) id = id.replace(origin, '/');

// TODO: applyMutations option?

class TreemapViewer {
  /**
   * @param {Treemap.Options} options
   * @param {HTMLElement} el
   */
  constructor(options, el) {
    const treemapDebugData = /** @type {LH.Audit.Details.DebugData} */ (
      options.lhr.audits['script-treemap-data'].details);
    if (!treemapDebugData || !treemapDebugData.treemapData) {
      throw new Error('missing script-treemap-data');
    }

    /** @type {import('../../../lighthouse-core/audits/script-treemap-data').TreemapData} */
    const scriptTreemapData = treemapDebugData.treemapData;

    /** @type {WeakMap<Treemap.Node, Treemap.RootNodeContainer>} */
    this.nodeToRootNodeMap = new WeakMap();

    /** @type {WeakMap<Treemap.Node, string[]>} */
    this.nodeToPathMap = new WeakMap();

    /** @type {{[rootNodeGroup: string]: Treemap.RootNodeContainer[]}} */
    const treemapData = {
      scripts: scriptTreemapData,
    };

    // TODO: add resource summary root node.

    for (const rootNodes of Object.values(treemapData)) {
      for (const rootNode of rootNodes) {
        Util.dfs(rootNode.node, node => this.nodeToRootNodeMap.set(node, rootNode));
        Util.dfs(rootNode.node, (node, path) => this.nodeToPathMap.set(node, path));
      }
    }

    this.mode = options.mode;
    this.treemapData = treemapData;
    /** @type {Treemap.Node} */
    this.currentRootNode; // eslint-disable-line no-unused-expressions
    this.documentUrl = options.lhr.requestedUrl;
    this.el = el;
    this.getHue = Util.stableHasher(Util.COLOR_HUES);

    this.createHeader();
    this.show(this.mode);
    this.initListeners();
  }

  createHeader() {
    Util.find('.lh-header--url').textContent = this.documentUrl;
    Util.find('.lh-header--size').textContent =
      Util.formatBytes(this.createRootNodeForGroup('scripts').resourceBytes);

    const bundleSelectorEl = /** @type {HTMLSelectElement} */ (Util.find('.bundle-selector'));
    bundleSelectorEl.innerHTML = ''; // Clear just in case document was saved with Ctrl+S.

    const partitionBySelectorEl = /** @type {HTMLSelectElement} */ (
      Util.find('.partition-selector'));
    const toggleTableBtn = Util.find('.lh-button--toggle-table');

    /**
     * @param {string} value
     * @param {string} text
     */
    function makeOption(value, text) {
      const optionEl = Util.createChildOf(bundleSelectorEl, 'option');
      optionEl.value = value;
      optionEl.innerText = text;
    }

    function onChange() {
      let selectorValue = bundleSelectorEl.value;
      let selectorType = /** @type {Treemap.DataSelector['type']} */ ('rootNodeId');
      if (selectorValue.startsWith('group:')) {
        selectorValue = selectorValue.replace('group:', '');
        selectorType = 'group';
      }

      treemapViewer.show({
        ...treemapViewer.mode,
        selector: {
          type: selectorType,
          value: selectorValue,
          viewId: treemapViewer.mode.selector.viewId,
        },
        partitionBy: partitionBySelectorEl.value,
      });
    }

    for (const [group, rootNodes] of Object.entries(this.treemapData)) {
      const aggregateNodes = rootNodes.length > 1 && group !== 'misc';

      if (aggregateNodes) {
        makeOption('group:' + group, `All ${group}`);
      }

      for (const rootNode of rootNodes) {
        if (!rootNode.node.children) continue; // Only add bundles.
        const title = (aggregateNodes ? '- ' : '') + Util.elide(rootNode.name, 80);
        makeOption(rootNode.name, title);
      }
    }

    if (this.mode.selector.type === 'group') {
      bundleSelectorEl.value = 'group:' + this.mode.selector.value;
    } else {
      bundleSelectorEl.value = this.mode.selector.value;
    }
    bundleSelectorEl.addEventListener('change', onChange);
    partitionBySelectorEl.addEventListener('change', onChange);
    toggleTableBtn.addEventListener('click', () => treemapViewer.toggleTable());
  }

  initListeners() {
    window.addEventListener('resize', () => {
      this.render();
    });

    window.addEventListener('click', (e) => {
      if (!(e.target instanceof HTMLElement)) return;
      const nodeEl = e.target.closest('.webtreemap-node');
      if (!nodeEl) return;
      this.updateColors();
    });

    window.addEventListener('mouseover', (e) => {
      if (!(e.target instanceof HTMLElement)) return;
      const nodeEl = e.target.closest('.webtreemap-node');
      if (!nodeEl) return;
      nodeEl.classList.add('webtreemap-node--hover');
    });

    window.addEventListener('mouseout', (e) => {
      if (!(e.target instanceof HTMLElement)) return;
      const nodeEl = e.target.closest('.webtreemap-node');
      if (!nodeEl) return;
      nodeEl.classList.remove('webtreemap-node--hover');
    });
  }

  /**
   * @param {string} id
   */
  findRootNode(id) {
    for (const rootNodes of Object.values(this.treemapData)) {
      for (const rootNode of rootNodes) {
        if (rootNode.name === id) return rootNode;
      }
    }
  }

  /**
   * @param {string} group
   */
  createRootNodeForGroup(group) {
    const rootNodes = this.treemapData[group];

    const children = rootNodes.map(rootNode => {
      // TODO: keep?
      // Wrap with the name of the rootNode. Only for bundles.
      if (group === 'scripts' && rootNode.node.children) {
        return {
          name: rootNode.name,
          children: [rootNode.node],
          resourceBytes: rootNode.node.resourceBytes,
          unusedBytes: rootNode.node.unusedBytes,
          executionTime: rootNode.node.executionTime,
        };
      }

      return rootNode.node;
    });

    return {
      name: this.documentUrl,
      resourceBytes: children.reduce((acc, cur) => cur.resourceBytes + acc, 0),
      unusedBytes: children.reduce((acc, cur) => (cur.unusedBytes || 0) + acc, 0),
      executionTime: children.reduce((acc, cur) => (cur.executionTime || 0) + acc, 0),
      children,
    };
  }

  /**
   * @param {Treemap.Mode} mode
   */
  show(mode) {
    this.mode = mode;
    if (!this.mode.partitionBy) this.mode.partitionBy = 'resourceBytes';

    // Update options view.
    const partitionBySelectorEl = /** @type {HTMLSelectElement} */ (
      Util.find('.partition-selector'));
    partitionBySelectorEl.value = this.mode.partitionBy;

    if (mode.selector.type === 'group' && mode.selector.value in this.treemapData) {
      const group = mode.selector.value;
      this.currentRootNode = this.createRootNodeForGroup(group);
      const rootNodes = this.treemapData[group];
      createViewModes(rootNodes, mode);
      this.createTable(rootNodes);
    } else if (mode.selector.type === 'rootNodeId') {
      const rootNode = this.findRootNode(mode.selector.value);
      if (!rootNode) throw new Error('unknown root node');

      this.currentRootNode = rootNode.node;
      createViewModes([rootNode], mode);
      this.createTable([rootNode]);
    } else {
      throw new Error('invalid mode selector');
    }

    Util.dfs(this.currentRootNode, node => {
      // @ts-ignore: webtreemap will store `dom` on the data to speed up operations.
      // However, when we change the underlying data representation, we need to delete
      // all the cached DOM elements. Otherwise, the rendering will be incorrect when,
      // for example, switching between "All JavaScript" and a specific bundle.
      delete node.dom;

      // @ts-ignore: webtreemap uses `size` to partition the treemap.
      node.size = node[mode.partitionBy || 'resourceBytes'] || 0;
    });
    webtreemap.sort(this.currentRootNode);

    this.el.innerHTML = '';
    this.render();
  }

  render() {
    // If particular nodes are highlighted we want to hide nodes that aren't in the highlighted
    // nodes paths.
    // TODO: this actually doesn't work well. seems if any node is hidden, all its siblings are hidden too :(
    let showNode;
    // if (this.mode.highlightNodePaths && this.mode.selector.viewId === 'duplicate-js') {
    //   /** @param {Treemap.Node} node */
    //   showNode = node => {
    //     // Never happens.
    //     if (!this.mode.highlightNodePaths) return false;

    //     const path = this.nodeToPathMap.get(node);
    //     if (!path) return true;

    //     // console.log(path, this.mode.highlightNodePaths.some(p => Util.pathIsSubpath(path, p)));
    //     return this.mode.highlightNodePaths.some(p => Util.pathIsSubpath(path, p));
    //   };
    // }

    webtreemap.render(this.el, this.currentRootNode, {
      padding: [18, 3, 3, 3],
      spacing: 10,
      caption: node => this.makeCaption(node),
      // showChildren: node => node.children && node.children.some(c => c.resourceBytes > 1000 * 100),
      // showNode: node => node.resourceBytes > 100 * 100,
      showNode,
      // lowerBound: 0.2,
    });

    Util.find('.webtreemap-node').classList.add('webtreemap-node--root');

    this.updateColors();
  }

  /**
   * @param {Treemap.Node} node
   */
  makeCaption(node) {
    const total = this.currentRootNode[this.mode.partitionBy || 'resourceBytes'];
    const sections = [
      {
        calculate: node => Util.elide(node.name, 60),
      },
      {
        label: this.mode.partitionBy,
        calculate: node => {
          const unit = this.mode.partitionBy === 'executionTime' ? 'time' : 'bytes';
          const value = node[this.mode.partitionBy || 'resourceBytes'];
          return `${Util.format(value, unit)} (${Math.round(value / total * 100)}%)`;
        },
      },
    ];

    return sections.map(section => {
      // Only print the label for the root node.
      if (node === this.currentRootNode && section.label) {
        return `${section.label}: ${section.calculate(node)}`;
      } else {
        return section.calculate(node);
      }
    }).join(' • ');
  }

  updateColors() {
    Util.dfs(this.currentRootNode, node => {
      // Color a root node and all children the same color.
      const rootNode = this.nodeToRootNodeMap.get(node);
      const hueKey = rootNode ? rootNode.name : node.name;
      const hue = this.getHue(hueKey);

      let backgroundColor = 'white';
      let color = 'black';

      if (hue !== undefined) {
        const sat = 60;
        const lum = 90;
        backgroundColor = Util.hsl(hue, sat, Math.round(lum));
        color = lum > 50 ? 'black' : 'white';
      } else {
        // Ran out of colors.
      }

      // A view can set nodes to highlight. If so, don't color anything else.
      if (this.mode.highlightNodePaths) {
        const path = this.nodeToPathMap.get(node);
        const shouldHighlight = path && this.mode.highlightNodePaths
          .some(pathToHighlight => Util.pathsAreEqual(pathToHighlight, path));
        if (!shouldHighlight) backgroundColor = 'white';
      }

      // @ts-ignore: webtreemap will add a dom node property to every node.
      const dom =/** @type {HTMLElement} */ (node.dom);
      if (dom) {
        dom.style.backgroundColor = backgroundColor;
        dom.style.color = color;
      }
    });
  }

  /**
   * @param {Treemap.RootNodeContainer[]} rootNodes
   */
  createTable(rootNodes) {
    const gridPanelEl = Util.find('.panel--datagrid');
    gridPanelEl.innerHTML = '';

    /** @type {Array<{name: string, bytes: {resource: number, unused?: number}}>} */
    const data = [];
    let maxSize = 0;
    for (const rootNode of rootNodes) {
      const node = rootNode.node;
      // if (node.children) node = node.children[0];

      Util.dfs(node, (node, path) => {
        if (node.children) return;

        if (node.resourceBytes) maxSize = Math.max(maxSize, node.resourceBytes);
        data.push({
          name: path.join('/'),
          bytes: {resource: node.resourceBytes, unused: node.unusedBytes},
        });
      });
    }

    const gridEl = document.createElement('div');
    gridPanelEl.append(gridEl);

    /**
     * @param {typeof data[0]['bytes']} a
     * @param {typeof data[0]['bytes']} b
     * @return {number}
     */
    const bytesSorter = (a, b) => a.resource - b.resource;

    this.table = new Tabulator(gridEl, {
      data,
      height: '100%',
      layout: 'fitColumns',
      tooltips: true,
      addRowPos: 'top',
      history: true,
      resizableRows: true,
      initialSort: [
        {column: 'bytes', dir: 'desc'},
      ],
      columns: [
        {title: 'Name', field: 'name'},
        {title: 'Size / Unused', field: 'bytes', sorter: bytesSorter, formatter: cell => {
          const value = cell.getValue();
          return `${Util.formatBytes(value.resource)} / ${Util.formatBytes(value.unused)}`;
        }},
        {title: 'Coverage', field: 'bytes', sorter: bytesSorter, formatter: cell => {
          const value = cell.getValue();

          const el = Util.createElement('div', 'lh-coverage-bar');
          el.style.setProperty('--max', String(maxSize));
          el.style.setProperty('--used', String(value.resource - value.unused));
          el.style.setProperty('--unused', String(value.unused));

          Util.createChildOf(el, 'div', 'lh-coverage-bar--used');
          Util.createChildOf(el, 'div', 'lh-coverage-bar--unused');

          return el;
        }},
      ],
    });
  }

  toggleTable() {
    const mainEl = Util.find('main');
    // mainEl.addEventListener('animationstart', () => {
    //   console.log('Animation started');
    // });
    mainEl.classList.toggle('lh-main__show-table');
    this.render();
  }
}

/**
 * @param {Treemap.RootNodeContainer[]} rootNodes
 * @param {Treemap.Mode} currentMode
 */
function createViewModes(rootNodes, currentMode) {
  const viewModesPanel = Util.find('.panel--modals');
  viewModesPanel.innerHTML = '';

  /**
   * @param {Treemap.DataSelector['viewId']} viewId
   * @param {string} label
   * @param {number} bytes
   * @param {Partial<Treemap.Mode>} modeOptions
   */
  function makeViewMode(viewId, label, bytes, modeOptions) {
    const isCurrentView = viewId === currentMode.selector.viewId;
    const viewModeEl = Util.createChildOf(viewModesPanel, 'div', 'view-mode');
    if (isCurrentView) viewModeEl.classList.add('view-mode--active');

    Util.createChildOf(viewModeEl, 'span').textContent = label;
    Util.createChildOf(viewModeEl, 'span', 'lh-text-dim').textContent =
      ` (${Util.formatBytes(bytes)})`;

    viewModeEl.addEventListener('click', () => {
      /** @type {Treemap.Mode} */
      const newMode = {
        ...currentMode,
        highlightNodePaths: undefined,
        ...modeOptions,
        selector: {
          ...currentMode.selector,
          viewId,
        },
      };

      if (isCurrentView) {
        // Do nothing.
        return;
      }

      treemapViewer.show(newMode);
    });
  }

  {
    let bytes = 0;
    for (const rootNode of rootNodes) {
      Util.dfs(rootNode.node, node => {
        if (node.children) return; // Only consider leaf nodes.

        bytes += node.resourceBytes;
      });
    }
    makeViewMode('all', 'All', bytes, {
      partitionBy: 'resourceBytes',
    });
  }

  {
    let bytes = 0;
    /** @type {Array<string[]>} */
    const highlightNodeNames = [];
    for (const rootNode of rootNodes) {
      Util.dfs(rootNode.node, (node, path) => {
        if (node.children) return; // Only consider leaf nodes.
        if (!node.unusedBytes || node.unusedBytes < 50 * 1024) return;

        bytes += node.unusedBytes;
        highlightNodeNames.push(path);
      });
    }
    if (bytes) {
      makeViewMode('unused-js', 'Unused JS', bytes, {
        partitionBy: 'unusedBytes',
        highlightNodePaths: highlightNodeNames,
      });
    }
  }

  {
    let bytes = 0;
    /** @type {Array<string[]>} */
    const highlightNodePaths = [];
    for (const rootNode of rootNodes) {
      if (!rootNode.node.children) continue; // Only consider bundles.

      Util.dfs(rootNode.node, (node, path) => {
        if (node.children) return; // Only consider leaf nodes.
        if (node.resourceBytes < 200 * 1024) return;

        bytes += node.resourceBytes;
        highlightNodePaths.push(path);
      });
    }
    if (bytes) {
      makeViewMode('large-js', 'Large Modules', bytes, {
        partitionBy: 'resourceBytes',
        highlightNodePaths,
      });
    }
  }

  {
    let bytes = 0;
    /** @type {Array<string[]>} */
    const highlightNodePaths = [];
    const duplicateIdsSeen = new Set();
    for (const rootNode of rootNodes) {
      if (!rootNode.node.children) continue; // Only consider bundles.

      Util.dfs(rootNode.node, (node, path) => {
        if (node.children && node.children.length) return; // Only consider leaf nodes.
        if (!node.duplicatedNormalizedModuleName) return;
        if (duplicateIdsSeen.has(node.duplicatedNormalizedModuleName)) return;
        duplicateIdsSeen.add(node.duplicatedNormalizedModuleName);

        bytes += node.resourceBytes;
        highlightNodePaths.push(path);
      });
    }
    if (bytes) {
      makeViewMode('duplicate-js', 'Duplicate Modules', bytes, {
        partitionBy: 'resourceBytes',
        highlightNodePaths,
      });
    }
  }
}

/**
 * @param {Treemap.Options} options
 */
function init(options) {
  treemapViewer = new TreemapViewer(options, Util.find('.panel--treemap'));

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

  // eslint-disable-next-line no-console
  console.log({options});
}

async function main() {
  if (new URLSearchParams(window.location.search).has('debug')) {
    const response = await fetch('debug.json');
    const json = await response.json();
    window.__TREEMAP_OPTIONS = json;
  }

  if (window.__TREEMAP_OPTIONS) {
    init(window.__TREEMAP_OPTIONS);
  } else {
    window.addEventListener('message', e => {
      if (e.source !== self.opener) return;

      /** @type {Treemap.Options} */
      const options = e.data;
      const {lhr, mode} = options;
      const documentUrl = lhr.requestedUrl;
      if (!documentUrl || !mode) return;

      // Allows for saving the document and loading with data intact.
      const scriptEl = document.createElement('script');
      scriptEl.innerText = `window.__TREEMAP_OPTIONS = ${JSON.stringify(options)};`;
      document.head.append(scriptEl);

      init(options);
    });
  }

  // If the page was opened as a popup, tell the opening window we're ready.
  if (self.opener && !self.opener.closed) {
    self.opener.postMessage({opened: true}, '*');
  }
}

document.addEventListener('DOMContentLoaded', main);
