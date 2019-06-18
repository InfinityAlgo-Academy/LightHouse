/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @fileoverview Instead of loading report assets form the filesystem, in Devtools we must load
 * them via Runtime.cachedResources. We use this module to shim
 * lighthouse-core/report/html/html-report-assets.js in Devtools.
 */

/* global Runtime */

// @ts-ignore: Runtime exists in Devtools.
const cachedResources = Runtime.cachedResources;

module.exports = {
  REPORT_CSS: cachedResources['audits/lighthouse/report.css'],
  REPORT_JAVASCRIPT: cachedResources['audits/lighthouse/report.js'],
  REPORT_TEMPLATE: cachedResources['audits/lighthouse/template.html'],
  REPORT_TEMPLATES: cachedResources['audits/lighthouse/templates.html'],
};
