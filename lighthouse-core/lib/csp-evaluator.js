/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @typedef Finding
 * @property {number} type Type of the finding.
 * @property {string} description Description of the finding.
 * @property {number} severity Severity of the finding.
 * @property {string} directive The CSP directive in which the finding occurred.
 * @property {string|undefined} value The directive value, if exists.
 */

const log = require('lighthouse-logger');
const i18n = require('../lib/i18n/i18n.js');
const evaluator = require('../../third-party/csp-evaluator/optimized_binary-bundle.js');

const Parser = evaluator.module.get('google3.javascript.security.csp.csp_evaluator.parser').CspParser; // eslint-disable-line max-len
const lighthouseChecks = evaluator.module.get('google3.javascript.security.csp.csp_evaluator.lighthouse.lighthouse_checks'); // eslint-disable-line max-len
const Type = evaluator.module.get('google3.javascript.security.csp.csp_evaluator.finding').Type; // eslint-disable-line max-len

const UIStrings = {
  missingBaseUri: 'Missing base-uri allows the injection of base tags. ' +
    'They can be used to set the base URL for all relative (script) ' +
    'URLs to an attacker controlled domain. ' +
    'Can you set it to \'none\' or \'self\'?',
  missingScriptSrc: 'script-src directive is missing. ' +
    'This can allow the execution of unsafe scripts.',
  missingObjectSrc: 'Missing object-src allows the injection of plugins which can ' +
    'execute JavaScript. Can you set it to \'none\'?',
  strictDynamic: 'Host allowlists can frequently be bypassed. Consider using ' +
    '\'strict-dynamic\' in combination with CSP nonces or hashes.',
  unsafeInline: '\'unsafe-inline\' allows the execution of unsafe in-page scripts ' +
    'and event handlers. Consider using CSP nonces or hashes to allow scripts individually.',
  unsafeInlineFallback: 'Consider adding \'unsafe-inline\' (ignored by browsers supporting ' +
    'nonces/hashes) to be backward compatible with older browsers.',
  allowlistFallback: 'Consider adding https: and http: url schemes (ignored by browsers ' +
    'supporting \'strict-dynamic\') to be backward compatible with older browsers.',
  reportToOnly: 'This CSP policy only provides a reporting ' +
    'destination via the \'report-to\' directive. ' +
    'This directive is only supported in Chromium-based browsers so it is ' +
    'recommended to also use a \'report-uri\' directive.',
  reportingDestinationMissing: 'This CSP policy does not configure a reporting destination. ' +
    'This makes it difficult to maintain the CSP policy over time and monitor for any breakages.',
  nonceLength: 'Nonces should be at least 8 characters long and use the base64 charset.',
  missingSemicolon: 'Did you forget the semicolon? ' +
    '{keyword} seems to be a directive, not a keyword.',
  unknownDirective: 'Unknown CSP directive',
  unknownKeyword: '{keyword} seems to be an invalid keyword.',
  deprecatedReflectedXSS: 'reflected-xss is deprecated since CSP2. ' +
    'Please, use the X-XSS-Protection header instead.',
  deprecatedReferrer: 'referrer is deprecated since CSP2. ' +
    'Please, use the Referrer-Policy header instead.',
  deprecatedDisownOpener: 'disown-opener is deprecated since CSP3. ' +
    'Please, use the Cross-Origin-Opener-Policy header instead.',
};

/** @type {Record<number, Record<string, string>|string>} */
const FINDING_TO_UI_STRING = {
  [Type.UNKNOWN_DIRECTIVE]: UIStrings.unknownDirective,
  [Type.INVALID_KEYWORD]: UIStrings.unknownKeyword,
  [Type.MISSING_DIRECTIVES]: {
    'base-uri': UIStrings.missingBaseUri,
    'script-src': UIStrings.missingScriptSrc,
    'object-src': UIStrings.missingObjectSrc,
  },
  [Type.SCRIPT_UNSAFE_INLINE]: UIStrings.unsafeInline,
  [Type.NONCE_LENGTH]: UIStrings.nonceLength,
  [Type.DEPRECATED_DIRECTIVE]: {
    'reflected-xss': UIStrings.deprecatedReflectedXSS,
    'referrer': UIStrings.deprecatedReferrer,
    'disown-opener': UIStrings.deprecatedDisownOpener,
  },
  [Type.STRICT_DYNAMIC]: UIStrings.strictDynamic,
  [Type.UNSAFE_INLINE_FALLBACK]: UIStrings.unsafeInlineFallback,
  [Type.WHITELIST_FALLBACK]: UIStrings.allowlistFallback,
  [Type.REPORTING_DESTINATION_MISSING]: UIStrings.reportingDestinationMissing,
  [Type.REPORT_TO_ONLY]: UIStrings.reportToOnly,
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

/**
 * @param {Finding} finding
 * @return {LH.IcuMessage|string}
 */
function getTranslatedDescription(finding) {
  const typeResults = FINDING_TO_UI_STRING[finding.type];
  if (!typeResults) {
    log.warn('CSP Evaluator', 'No translation found for description');
    return finding.description;
  }

  if (typeof typeResults === 'string') {
    if ([UIStrings.unknownKeyword, UIStrings.missingSemicolon].includes(typeResults)) {
      return str_(typeResults, {keyword: finding.value || ''});
    }
    return str_(typeResults);
  }

  const result = typeResults[finding.directive];
  if (!result) {
    log.warn('CSP Evaluator', 'No translation found for description');
    return finding.description;
  }

  return str_(result);
}

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

module.exports = {
  evaluateRawCspForFailures,
  evaluateRawCspForWarnings,
  evaluateRawCspForSyntax,
  getTranslatedDescription,
  UIStrings,
};
