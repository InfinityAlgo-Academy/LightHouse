/**
 * Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

function main() {
  window.addEventListener('message', e => {
    if (e.source === self.opener && e.data.rootNode) {
      render(e.data.rootNode);

      if (self.opener && !self.opener.closed) {
        self.opener.postMessage({rendered: true}, '*');
      }
      if (window.ga) {
        // TODO what are these?
        // window.ga('send', 'event', 'treemap', 'open in viewer');
        window.ga('send', 'event', 'report', 'open in viewer');
      }
    }
  });

  // If the page was opened as a popup, tell the opening window we're ready.
  if (self.opener && !self.opener.closed) {
    self.opener.postMessage({opened: true}, '*');
  }
}

let treemap;
function render(rootNode) {
  webtreemap.sort(rootNode);
  treemap = new webtreemap.TreeMap(rootNode, {padding: [18, 3, 3, 3]});
  treemap.render(document.querySelector('main'));
}

window.addEventListener('resize', function() {
  if (treemap) treemap.render(document.querySelector('main'));
});

main();
