/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
// @ts-nocheck
'use strict';

/**
 * Stubbery to allow portions of the DevTools frontend to be used in lighthouse. `WebInspector`
 * technically lives on the global object but should be accessed through a normal `require` call.
 */
module.exports = (function() {
  if (global.WebInspector) {
    return global.WebInspector;
  }

  // Global pollution.
  // Check below is to make it worker-friendly where global is worker's self.
  if (global.self !== global) {
    global.self = global;
  }

  if (typeof global.window === 'undefined') {
    global.window = global;
  }

  global.Node = {
    ELEMENT_NODE: 1,
    TEXT_NODE: 3,
  };

  global.CSSAgent = {};
  global.CSSAgent.StyleSheetOrigin = {
    INJECTED: 'injected',
    USER_AGENT: 'user-agent',
    INSPECTOR: 'inspector',
    REGULAR: 'regular',
  };

  global.CSS = {};
  global.CSS.supports = () => true;

  // Stash the real one so we can reinstall after DT incorrectly polyfills.
  // See https://github.com/GoogleChrome/lighthouse/issues/73
  const _setImmediate = global.setImmediate;

  global.Runtime = global.Runtime || {};
  global.Runtime.experiments = global.Runtime.experiments || {};
  // DevTools runtime doesn't know about some experiments that DTM looks for
  // To avoid exceptions, we assume all experiments are disabled
  global.Runtime.experiments.isEnabled = (_ => false);

  const _queryParam = global.Runtime.queryParam;
  global.Runtime.queryParam = function(arg) {
    switch (arg) {
      case 'remoteFrontend':
        return false;
      case 'ws':
        return false;
      default: {
        if (_queryParam) {
          return _queryParam.call(global.Runtime, arg);
        }
        throw new Error('Mock queryParam case not implemented.');
      }
    }
  };

  global.TreeElement = {};
  global.WorkerRuntime = {};

  global.Protocol = {
    Agents() {},
  };

  global.WebInspector = {};
  const WebInspector = global.WebInspector;
  WebInspector._moduleSettings = {
    cacheDisabled: {
      addChangeListener() {},
      get() {
        return false;
      },
    },
    monitoringXHREnabled: {
      addChangeListener() {},
      get() {
        return false;
      },
    },
    showNativeFunctionsInJSProfile: {
      addChangeListener() {},
      get() {
        return true;
      },
    },
  };
  WebInspector.moduleSetting = function(settingName) {
    return this._moduleSettings[settingName];
  };

  // Shared Dependencies
  require('chrome-devtools-frontend/front_end/common/Object.js');
  require('chrome-devtools-frontend/front_end/common/ParsedURL.js');
  require('chrome-devtools-frontend/front_end/common/UIString.js');
  require('chrome-devtools-frontend/front_end/common/SegmentedRange.js');
  require('chrome-devtools-frontend/front_end/platform/utilities.js');
  require('chrome-devtools-frontend/front_end/sdk/Target.js');
  require('chrome-devtools-frontend/front_end/sdk/TargetManager.js');

  // Dependencies for timeline-model
  WebInspector.targetManager = {
    observeTargets() { },
    addEventListener() { },
  };
  WebInspector.settings = {
    createSetting() {
      return {
        get() {
          return false;
        },
        addChangeListener() {},
      };
    },
  };
  WebInspector.console = {
    error() {},
  };
  WebInspector.VBox = function() {};
  WebInspector.HBox = function() {};
  WebInspector.ViewportDataGrid = function() {};
  WebInspector.ViewportDataGridNode = function() {};
  global.WorkerRuntime.Worker = function() {};

  // used for streaming json parsing
  require('chrome-devtools-frontend/front_end/common/TextUtils.js');
  require('chrome-devtools-frontend/front_end/timeline/TimelineLoader.js');

  // Mock for WebInspector code that writes to console.
  WebInspector.ConsoleMessage = function() {};
  WebInspector.ConsoleMessage.MessageSource = {
    Network: 'network',
  };
  WebInspector.ConsoleMessage.MessageLevel = {
    Log: 'log',
  };
  WebInspector.ConsoleMessage.MessageType = {
    Log: 'log',
  };

  // Dependencies for color parsing.
  require('chrome-devtools-frontend/front_end/common/Color.js');

  // Dependencies for effective CSS rule calculation.
  require('chrome-devtools-frontend/front_end/common/TextRange.js');
  require('chrome-devtools-frontend/front_end/sdk/CSSMatchedStyles.js');
  require('chrome-devtools-frontend/front_end/sdk/CSSMedia.js');
  require('chrome-devtools-frontend/front_end/sdk/CSSMetadata.js');
  require('chrome-devtools-frontend/front_end/sdk/CSSProperty.js');
  require('chrome-devtools-frontend/front_end/sdk/CSSRule.js');
  require('chrome-devtools-frontend/front_end/sdk/CSSStyleDeclaration.js');

  WebInspector.CSSMetadata._generatedProperties = [
    {
      name: 'font-size',
      inherited: true,
    },
  ];

  // Restore setImmediate, see comment at top.
  global.setImmediate = _setImmediate;

  return WebInspector;
})();
