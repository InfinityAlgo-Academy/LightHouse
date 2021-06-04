/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* global document window */

import {DOM} from './dom.js';
import {Logger} from './logger.js';
import {ReportRenderer} from './report-renderer.js';
import {ReportUIFeatures} from './report-ui-features.js';

function __initLighthouseReport__() {
  const dom = new DOM(document);
  const renderer = new ReportRenderer(dom);

  const container = document.querySelector('main');
  renderer.renderReport(window.__LIGHTHOUSE_JSON__, container);

  // Hook in JS features and page-level event listeners after the report
  // is in the document.
  const features = new ReportUIFeatures(dom);
  features.initFeatures(window.__LIGHTHOUSE_JSON__);
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', __initLighthouseReport__);
} else {
  __initLighthouseReport__();
}

document.addEventListener('lh-analytics', e => {
  if (window.ga) {
    ga(e.detail.cmd, e.detail.fields);
  }
});

document.addEventListener('lh-log', e => {
  const logger = new Logger(document.querySelector('#lh-log'));

  switch (e.detail.cmd) {
    case 'log':
      logger.log(e.detail.msg);
      break;
    case 'warn':
      logger.warn(e.detail.msg);
      break;
    case 'error':
      logger.error(e.detail.msg);
      break;
    case 'hide':
      logger.hide();
      break;
  }
});
