/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

import {DOM} from './dom.js';
// TODO: should Logger be part of the public interface? or just for standalone?
// import {Logger} from './logger.js';
import {ReportRenderer} from './report-renderer.js';
import {ReportUIFeatures} from './report-ui-features.js';

// OR: we could take an options objec
/**
 * @typedef RenderOptions
 * @property {LH.Result} lhr
 * @property {Element} containerEl Parent element to render the report into.
 */


// TODO: we could instead return an Element (not appending to the dom),
//       and replace `containerEl` with an options `document: Document` property.
//       oh, and `templateContext` ...

/**
 * @param {RenderOptions} opts
 */
export function renderLighthouseReport(opts) {
  const dom = new DOM(opts.containerEl.ownerDocument);
  // Assume fresh styles needed on every call, so mark all template styles as unused.
  dom.resetTemplates();

  const renderer = new ReportRenderer(dom);
  // if (opts.templateContext) renderer.setTemplateContext(opts.templateContext);
  renderer.renderReport(opts.lhr, opts.containerEl);

  // Hook in JS features and page-level event listeners after the report
  // is in the document.
  const features = new ReportUIFeatures(dom);
  features.initFeatures(opts.lhr);
}
