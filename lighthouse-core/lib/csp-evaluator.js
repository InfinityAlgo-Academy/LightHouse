/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const csp_ = require('../../third-party/csp-evaluator/optimized_binary-bundle.js');

/**
 * @typedef Finding
 * @property {number} type Type of the finding.
 * @property {string} description Description of the finding.
 * @property {number} severity Severity of the finding.
 * @property {string} directive The CSP directive in which the finding occurred.
 * @property {string|undefined} value The directive value, if exists.
 */

/* eslint-disable max-len */
const Parser = csp_.module.getInternal_('google3.javascript.security.csp.csp_evaluator.parser').CspParser;
const lighthouseChecks = csp_.module.getInternal_('google3.javascript.security.csp.csp_evaluator.lighthouse.lighthouse_checks');
/* eslint-enable max-len */

/**
 * @param {Array<string>} rawCsps
 * @return {Array<Finding>}
 */
function evaluateRawCspForFailures(rawCsps) {
  return lighthouseChecks.evaluateForFailure(rawCsps.map(c => new Parser(c).csp));
}

/**
 * @param {Array<string>} rawCsps
 * @return {Array<Finding>}
 */
function evaluateRawCspForWarnings(rawCsps) {
  return lighthouseChecks.evaluateForWarnings(rawCsps.map(c => new Parser(c).csp));
}

/**
 * @param {Array<string>} rawCsps
 * @return {Array<Array<Finding>>}
 */
function evaluateRawCspForSyntax(rawCsps) {
  return lighthouseChecks.evaluateForSyntaxErrors(rawCsps.map(c => new Parser(c).csp));
}

module.exports = {evaluateRawCspForFailures, evaluateRawCspForWarnings, evaluateRawCspForSyntax};
