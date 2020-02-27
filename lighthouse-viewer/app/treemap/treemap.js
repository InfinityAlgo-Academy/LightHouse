/**
 * Copyright 2020 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

// TODO
// * This looks so bad :)

const MODE = 'wastedBytes';

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

/**
 * DFS to generate each treemap node's text.
 * @param {any} node
 */
function setTitle(node) {
  dfs(node, node => {
    const {size, total, wastedBytes} = node;
    // TODO: ?
    // node.id += ` • ${Number.bytesToString(size)} • ${Common.UIString('%.1f\xa0%%', size / total * 100)}`;

    if (MODE === 'default') {
      node.id = `${node.originalId} • ${Math.round(size)} • ${Math.round(size / total * 100)}`;
    } else if (MODE === 'wastedBytes') {
      node.id = `${node.originalId} • ${Math.round(size)} • ${Math.round(wastedBytes / size * 100)}`;
    }
  });
}

// https://gist.github.com/mlocati/7210513#gistcomment-3060158
function percentageToColor(percentage, maxHue = 120, minHue = 0) {
  const hue = percentage * (maxHue - minHue) + minHue;
  return `hsl(${hue}, 100%, 50%)`;
}

class TreemapViewer {
  /**
   * @param {string} url
   * @param {Record<string, *>} rootNodes
   * @param {HTMLElement} el
   */
  constructor(url, rootNodes, el) {
    for (const [href, rootNode] of Object.entries(rootNodes)) {
      rootNode.id = href;
      dfs(rootNode, node => node.originalId = node.id);
      webtreemap.sort(rootNode);
    }

    this.url = url;
    this.rootNodes = rootNodes;
    this.el = el;
    this.currentRootNode = null;
  }

  /**
   * @param {*} bundleUrl
   */
  show(bundleUrl) {
    if (bundleUrl === 'all') {
      const children = Object.values(this.rootNodes);
      this.currentRootNode = {
        originalId: this.url,
        size: children.reduce((acc, cur) => cur.size + acc, 0),
        wastedBytes: children.reduce((acc, cur) => cur.wastedBytes + acc, 0),
        children,
      };
    } else {
      this.currentRootNode = this.rootNodes[bundleUrl];
    }
    this.currentRootNode = JSON.parse(JSON.stringify(this.currentRootNode));

    setTitle(this.currentRootNode);
    this.el.innerHTML = '';
    this.treemap = new webtreemap.TreeMap(this.currentRootNode, {padding: [18, 3, 3, 3]});
    this.render();
  }

  render() {
    this.treemap.render(this.el);
    // TODO: recolor on click too.
    dfs(this.currentRootNode, node => {
      if (!node.dom) return;
      node.dom.style.backgroundColor = percentageToColor(1 - node.wastedBytes / node.size);
    });
  }
}

function main() {
  let treemapViewer;

  window.addEventListener('message', e => {
    if (e.source !== self.opener) return;
    const {url, bundleUrl = 'all', rootNodes} = e.data;
    if (!rootNodes || !url) return;

    // Init header controls.
    const bundleSelectorEl = find('.bundle-selector');
    function makeOption(value, text) {
      const optionEl = document.createElement('option');
      optionEl.value = value;
      optionEl.innerText = text;
      bundleSelectorEl.append(optionEl);
    }
    makeOption('all', `${url} (all)`);
    for (const key of Object.keys(rootNodes)) {
      makeOption(key, key);
    }
    bundleSelectorEl.value = bundleUrl;
    bundleSelectorEl.addEventListener('change', () => {
      treemapViewer.show(bundleSelectorEl.value);
    });

    treemapViewer = new TreemapViewer(url, rootNodes, find('main'));
    treemapViewer.show(bundleUrl);

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
}

function showTreeMap() {
  const rootNode = {
    size: 0,
    wastedBytes: 0,
    children: rootNodes,
  };

  dfs(rootNode, node => node.originalId = node.id);
  setTitle(rootNode);
  render(rootNode);
}

main();
