/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const csp_ = require('../../optimized_binary-bundle.js');

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
const Evaluator = csp_.module.getInternal_('google3.javascript.security.csp.csp_evaluator.evaluator').CspEvaluator;
const Version = csp_.module.getInternal_('google3.javascript.security.csp.csp_evaluator.csp').Version;
/* eslint-enable max-len */

/**
 * @param {string} rawCsp
 * @return {Array<Finding>}
 */
function evaluateRawCsp(rawCsp) {
  const parser = new Parser(rawCsp);
  const evaluator = new Evaluator(parser.csp, Version.CSP3);
  return evaluator.evaluate();
}

module.exports = {evaluateRawCsp};
