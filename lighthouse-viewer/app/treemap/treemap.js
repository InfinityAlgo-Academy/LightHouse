/**
 * Copyright 2020 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

// TODO
// * This looks so bad :)
// * Show all the bundles
// * Have a toolbar to choose between all the bundles; single bundle; change MODE

const MODE = 'wastedBytes';

let treemap;
let rootNode;

function main() {
  window.addEventListener('message', e => {
    if (e.source !== self.opener) return;
    rootNode = e.data.rootNode;
    if (!rootNode) return;

    // For debugging.
    window.__rootNode = rootNode;

    dfs(rootNode, node => node.originalId = node.id);
    setTitle(rootNode);
    render(rootNode);

    if (self.opener && !self.opener.closed) {
      self.opener.postMessage({ rendered: true }, '*');
    }
    if (window.ga) {
      // TODO what are these?
      // window.ga('send', 'event', 'treemap', 'open in viewer');
      window.ga('send', 'event', 'report', 'open in viewer');
    }
  });

  // If the page was opened as a popup, tell the opening window we're ready.
  if (self.opener && !self.opener.closed) {
    self.opener.postMessage({ opened: true }, '*');
  }
}

// https://gist.github.com/mlocati/7210513#gistcomment-3060158
function percentageToColor(percentage, maxHue = 120, minHue = 0) {
  const hue = percentage * (maxHue - minHue) + minHue;
  return `hsl(${hue}, 100%, 50%)`;
}

function init() {
  webtreemap.sort(rootNode);
  treemap = new webtreemap.TreeMap(rootNode, { padding: [18, 3, 3, 3] });
}

function render() {
  if (!treemap) init();
  treemap.render(document.querySelector('main'));
  dfs(rootNode, node => {
    if (!node.dom) return;
    node.dom.style.backgroundColor = percentageToColor(1 - node.wastedBytes / node.size);
  });
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
    const { size, wastedBytes } = node;
    // TODO: ?
    // node.id += ` • ${Number.bytesToString(size)} • ${Common.UIString('%.1f\xa0%%', size / total * 100)}`;

    if (MODE === 'default') {
      node.id = `${node.originalId} • ${Math.round(size)} • ${Math.round(size / total * 100)}`;
    } else if (MODE === 'wastedBytes') {
      node.id = `${node.originalId} • ${Math.round(size)} • ${Math.round(wastedBytes / size * 100)}`;
    }
  });
}

window.addEventListener('resize', () => {
  render();
});

main();
