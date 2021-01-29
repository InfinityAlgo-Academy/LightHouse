/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const {isIcuMessage} = require('../../lib/i18n/i18n.js');
const evaluator = require('../../../third-party/csp-evaluator/optimized_binary-bundle.js');
const {
  evaluateRawCspForFailures,
  getTranslatedDescription,
} = require('../../lib/csp-evaluator.js');

const Type = evaluator.module.get('google3.javascript.security.csp.csp_evaluator.finding').Type; // eslint-disable-line max-len

/* eslint-env jest */

describe('Evaluator compatibility', () => {
  it('finding types', () => {
    expect(Type).toMatchInlineSnapshot(`
      Object {
        "100": "MISSING_SEMICOLON",
        "101": "UNKNOWN_DIRECTIVE",
        "102": "INVALID_KEYWORD",
        "300": "MISSING_DIRECTIVES",
        "301": "SCRIPT_UNSAFE_INLINE",
        "302": "SCRIPT_UNSAFE_EVAL",
        "303": "PLAIN_URL_SCHEMES",
        "304": "PLAIN_WILDCARD",
        "305": "SCRIPT_WHITELIST_BYPASS",
        "306": "OBJECT_WHITELIST_BYPASS",
        "307": "NONCE_LENGTH",
        "308": "IP_SOURCE",
        "309": "DEPRECATED_DIRECTIVE",
        "310": "SRC_HTTP",
        "400": "STRICT_DYNAMIC",
        "401": "STRICT_DYNAMIC_NOT_STANDALONE",
        "402": "NONCE_HASH",
        "403": "UNSAFE_INLINE_FALLBACK",
        "404": "WHITELIST_FALLBACK",
        "405": "IGNORED",
        "500": "REQUIRE_TRUSTED_TYPES_FOR_SCRIPTS",
        "600": "REPORTING_DESTINATION_MISSING",
        "601": "REPORT_TO_ONLY",
        "DEPRECATED_DIRECTIVE": 309,
        "IGNORED": 405,
        "INVALID_KEYWORD": 102,
        "IP_SOURCE": 308,
        "MISSING_DIRECTIVES": 300,
        "MISSING_SEMICOLON": 100,
        "NONCE_HASH": 402,
        "NONCE_LENGTH": 307,
        "OBJECT_WHITELIST_BYPASS": 306,
        "PLAIN_URL_SCHEMES": 303,
        "PLAIN_WILDCARD": 304,
        "REPORTING_DESTINATION_MISSING": 600,
        "REPORT_TO_ONLY": 601,
        "REQUIRE_TRUSTED_TYPES_FOR_SCRIPTS": 500,
        "SCRIPT_UNSAFE_EVAL": 302,
        "SCRIPT_UNSAFE_INLINE": 301,
        "SCRIPT_WHITELIST_BYPASS": 305,
        "SRC_HTTP": 310,
        "STRICT_DYNAMIC": 400,
        "STRICT_DYNAMIC_NOT_STANDALONE": 401,
        "UNKNOWN_DIRECTIVE": 101,
        "UNSAFE_INLINE_FALLBACK": 403,
        "WHITELIST_FALLBACK": 404,
      }
    `);
  });
  it.todo('descriptions');
});

describe('getTranslatedDescription', () => {
  // Missing directives
  it('missing script-src', () => {
    const rawCsp = `base-uri 'none'; object-src 'none'`;
    const findings = evaluateRawCspForFailures([rawCsp]);
    const translated = findings.map(getTranslatedDescription);

    expect(translated).toHaveLength(1);
    expect(isIcuMessage(translated[0])).toBeTruthy();
    expect(translated[0]).toBeDisplayString(
      'script-src directive is missing. This can allow the execution of unsafe scripts.'
    );
  });
  it.todo('missing object-src');
  it.todo('missing base-uri');
  // Allowlist bypass
  it.todo('unsafe-inline');
  it.todo('strict-dynamic');
  // Reporting destination
  it.todo('no reporting destination');
  it.todo('report-to only');
  // Backwards compatibility
  it.todo('no allowlist fallback');
  it.todo('no unsafe-inline fallback');
  // Syntax
  it.todo('missing semicolon');
  it.todo('unknown directive');
  it.todo('unknown keyword');
  it.todo('nonce length');
  it.todo('deprecated reflected-xss');
  it.todo('deprecated referrer');
  it.todo('deprecated disown-opener');
});
