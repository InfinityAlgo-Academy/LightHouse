/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
// @ts-nocheck
'use strict';

/**
 * Stubbery to allow portions of the DevTools frontend to be used in lighthouse. `SDK`
 * technically lives on the global object but should be accessed through a normal `require` call.
 */
module.exports = (function() {
  if (global.SDK) {
    return global.SDK;
  }

  // Dependencies for effective CSS rule calculation. Global pollution!
  global.SDK = {};
  global.TextUtils = {};
  global.Node = {
    ELEMENT_NODE: 1,
    TEXT_NODE: 3,
  };
  global.Protocol = {
    CSS: {
      StyleSheetOrigin: {
        Injected: 'injected',
        UserAgent: 'user-agent',
        Inspector: 'inspector',
        Regular: 'regular',
      },
    },
  };

  /**
   * The single prototype augmentation needed from 'chrome-devtools-frontend/front_end/platform/utilities.js'.
   * @return {Array<number>}
   */
  String.prototype.computeLineEndings = function() { // eslint-disable-line no-extend-native
    const endings = [];
    for (let i = 0; i < this.length; i++) {
      if (this.charAt(i) === '\n') {
        endings.push(i);
      }
    }
    endings.push(this.length);
    return endings;
  };

  require('chrome-devtools-frontend/front_end/text_utils/Text.js');
  require('chrome-devtools-frontend/front_end/text_utils/TextRange.js');
  require('chrome-devtools-frontend/front_end/sdk/CSSMatchedStyles.js');
  require('chrome-devtools-frontend/front_end/sdk/CSSMedia.js');
  require('chrome-devtools-frontend/front_end/sdk/CSSMetadata.js');
  require('chrome-devtools-frontend/front_end/sdk/CSSProperty.js');
  require('chrome-devtools-frontend/front_end/sdk/CSSRule.js');
  require('chrome-devtools-frontend/front_end/sdk/CSSStyleDeclaration.js');

  return global.SDK;
})();
