/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const {isIcuMessage} = require('../../lib/i18n/i18n.js');
const {Type} = require('../../../third-party/csp-evaluator/optimized_binary.js');
const {
  evaluateRawCspForFailures,
  getTranslatedDescription,
  evaluateRawCspForWarnings,
  evaluateRawCspForSyntax,
} = require('../../lib/csp-evaluator.js');

/* eslint-env jest */

describe('Evaluator compatibility', () => {
  it('finding types', () => {
    expect(Type).toMatchInlineSnapshot(`
      Object {
        "100": "MISSING_SEMICOLON",
        "101": "UNKNOWN_DIRECTIVE",
        "102": "INVALID_KEYWORD",
        "106": "NONCE_CHARSET",
        "300": "MISSING_DIRECTIVES",
        "301": "SCRIPT_UNSAFE_INLINE",
        "302": "SCRIPT_UNSAFE_EVAL",
        "303": "PLAIN_URL_SCHEMES",
        "304": "PLAIN_WILDCARD",
        "305": "SCRIPT_ALLOWLIST_BYPASS",
        "306": "OBJECT_ALLOWLIST_BYPASS",
        "307": "NONCE_LENGTH",
        "308": "IP_SOURCE",
        "309": "DEPRECATED_DIRECTIVE",
        "310": "SRC_HTTP",
        "400": "STRICT_DYNAMIC",
        "401": "STRICT_DYNAMIC_NOT_STANDALONE",
        "402": "NONCE_HASH",
        "403": "UNSAFE_INLINE_FALLBACK",
        "404": "ALLOWLIST_FALLBACK",
        "405": "IGNORED",
        "500": "REQUIRE_TRUSTED_TYPES_FOR_SCRIPTS",
        "600": "REPORTING_DESTINATION_MISSING",
        "601": "REPORT_TO_ONLY",
        "ALLOWLIST_FALLBACK": 404,
        "DEPRECATED_DIRECTIVE": 309,
        "IGNORED": 405,
        "INVALID_KEYWORD": 102,
        "IP_SOURCE": 308,
        "MISSING_DIRECTIVES": 300,
        "MISSING_SEMICOLON": 100,
        "NONCE_CHARSET": 106,
        "NONCE_HASH": 402,
        "NONCE_LENGTH": 307,
        "OBJECT_ALLOWLIST_BYPASS": 306,
        "PLAIN_URL_SCHEMES": 303,
        "PLAIN_WILDCARD": 304,
        "REPORTING_DESTINATION_MISSING": 600,
        "REPORT_TO_ONLY": 601,
        "REQUIRE_TRUSTED_TYPES_FOR_SCRIPTS": 500,
        "SCRIPT_ALLOWLIST_BYPASS": 305,
        "SCRIPT_UNSAFE_EVAL": 302,
        "SCRIPT_UNSAFE_INLINE": 301,
        "SRC_HTTP": 310,
        "STRICT_DYNAMIC": 400,
        "STRICT_DYNAMIC_NOT_STANDALONE": 401,
        "UNKNOWN_DIRECTIVE": 101,
        "UNSAFE_INLINE_FALLBACK": 403,
      }
    `);
  });
});

describe('getTranslatedDescription', () => {
  it('missing script-src', () => {
    const rawCsp = `object-src 'none'`;
    const findings = evaluateRawCspForFailures([rawCsp]);
    const translated = findings.map(getTranslatedDescription);

    expect(translated).toHaveLength(1);
    expect(isIcuMessage(translated[0])).toBeTruthy();
    expect(translated[0]).toBeDisplayString(
      'script-src directive is missing. This can allow the execution of unsafe scripts.'
    );
  });

  it('missing object-src', () => {
    const rawCsp = `script-src 'none'`;
    const findings = evaluateRawCspForFailures([rawCsp]);
    const translated = findings.map(getTranslatedDescription);

    expect(translated).toHaveLength(1);
    expect(isIcuMessage(translated[0])).toBeTruthy();
    expect(translated[0]).toBeDisplayString(
      'Consider setting object-src to \'none\' to prevent ' +
      'the injection of plugins that execute unsafe scripts.'
    );
  });

  it('missing base-uri', () => {
    const rawCsp = `script-src 'nonce-000000000'; object-src 'none'`;
    const findings = evaluateRawCspForFailures([rawCsp]);
    const translated = findings.map(getTranslatedDescription);

    expect(translated).toHaveLength(1);
    expect(isIcuMessage(translated[0])).toBeTruthy();
    expect(translated[0]).toBeDisplayString(
      'Missing base-uri allows the injection of base tags. ' +
      'They can be used to set the base URL for all relative (script) ' +
      'URLs to an attacker controlled domain. ' +
      'Can you set it to \'none\' or \'self\'?'
    );
  });

  it('unsafe-inline', () => {
    const rawCsp = `script-src 'unsafe-inline'; object-src 'none'`;
    const findings = evaluateRawCspForFailures([rawCsp]);
    const translated = findings.map(getTranslatedDescription);

    expect(translated).toHaveLength(1);
    expect(isIcuMessage(translated[0])).toBeTruthy();
    expect(translated[0]).toBeDisplayString(
      '\'unsafe-inline\' allows the execution of unsafe in-page scripts ' +
      'and event handlers. Consider using CSP nonces or hashes to allow scripts individually.'
    );
  });

  it('strict-dynamic', () => {
    const rawCsp = `script-src http:; object-src 'none'`;
    const findings = evaluateRawCspForFailures([rawCsp]);
    const translated = findings.map(getTranslatedDescription);

    expect(translated).toHaveLength(1);
    expect(isIcuMessage(translated[0])).toBeTruthy();
    expect(translated[0]).toBeDisplayString(
      'Host allowlists can frequently be bypassed. Consider using ' +
      '\'strict-dynamic\' in combination with CSP nonces or hashes.'
    );
  });

  it('no reporting destination', () => {
    const rawCsp = `script-src 'none'`;
    const findings = evaluateRawCspForWarnings([rawCsp]);
    const translated = findings.map(getTranslatedDescription);

    expect(translated).toHaveLength(1);
    expect(isIcuMessage(translated[0])).toBeTruthy();
    expect(translated[0]).toBeDisplayString(
      'This CSP does not configure a reporting destination. ' +
      'This makes it difficult to maintain the CSP over time and monitor for any breakages.'
    );
  });

  it('report-to only', () => {
    const rawCsp = `script-src 'none'; report-to https://example.com`;
    const findings = evaluateRawCspForWarnings([rawCsp]);
    const translated = findings.map(getTranslatedDescription);

    expect(translated).toHaveLength(1);
    expect(isIcuMessage(translated[0])).toBeTruthy();
    expect(translated[0]).toBeDisplayString(
      'This CSP only provides a reporting ' +
      'destination via the report-to directive. ' +
      'This directive is only supported in Chromium-based browsers so it is ' +
      'recommended to also use a report-uri directive.'
    );
  });

  it('no allowlist fallback', () => {
    const rawCsp = `script-src 'strict-dynamic'; report-uri https://example.com`;
    const findings = evaluateRawCspForWarnings([rawCsp]);
    const translated = findings.map(getTranslatedDescription);

    expect(translated).toHaveLength(1);
    expect(isIcuMessage(translated[0])).toBeTruthy();
    expect(translated[0]).toBeDisplayString(
      'Consider adding https: and http: url schemes (ignored by browsers ' +
      'supporting \'strict-dynamic\') to be backward compatible with older browsers.'
    );
  });

  it('no unsafe-inline fallback', () => {
    const rawCsp = `script-src 'nonce-00000000'; report-uri https://example.com`;
    const findings = evaluateRawCspForWarnings([rawCsp]);
    const translated = findings.map(getTranslatedDescription);

    expect(translated).toHaveLength(1);
    expect(isIcuMessage(translated[0])).toBeTruthy();
    expect(translated[0]).toBeDisplayString(
      'Consider adding \'unsafe-inline\' (ignored by browsers supporting ' +
      'nonces/hashes) to be backward compatible with older browsers.'
    );
  });

  it('missing semicolon', () => {
    const rawCsp = `script-src 'none' object-src 'none'`;
    const findings = evaluateRawCspForSyntax([rawCsp]);

    expect(findings).toHaveLength(1);

    const translated = findings[0].map(getTranslatedDescription);
    expect(translated).toHaveLength(1);
    expect(isIcuMessage(translated[0])).toBeTruthy();
    expect(translated[0]).toBeDisplayString(
      'Did you forget the semicolon? ' +
      'object-src seems to be a directive, not a keyword.'
    );
  });

  it('unknown directive', () => {
    const rawCsp = `foo-bar 'none'`;
    const findings = evaluateRawCspForSyntax([rawCsp]);

    expect(findings).toHaveLength(1);

    const translated = findings[0].map(getTranslatedDescription);
    expect(translated).toHaveLength(1);
    expect(isIcuMessage(translated[0])).toBeTruthy();
    expect(translated[0]).toBeDisplayString(
      'Unknown CSP directive.'
    );
  });

  it('unknown keyword', () => {
    const rawCsp = `script-src 'asdf'`;
    const findings = evaluateRawCspForSyntax([rawCsp]);

    expect(findings).toHaveLength(1);

    const translated = findings[0].map(getTranslatedDescription);
    expect(translated).toHaveLength(1);
    expect(isIcuMessage(translated[0])).toBeTruthy();
    expect(translated[0]).toBeDisplayString(
      '\'asdf\' seems to be an invalid keyword.'
    );
  });

  it('nonce length', () => {
    const rawCsp = `script-src 'nonce-0000'`;
    const findings = evaluateRawCspForSyntax([rawCsp]);

    expect(findings).toHaveLength(1);

    const translated = findings[0].map(getTranslatedDescription);
    expect(translated).toHaveLength(1);
    expect(isIcuMessage(translated[0])).toBeTruthy();
    expect(translated[0]).toBeDisplayString(
      'Nonces should be at least 8 characters long.'
    );
  });

  it('nonce charset', () => {
    const rawCsp = `script-src 'nonce-::::::::'`;
    const findings = evaluateRawCspForSyntax([rawCsp]);

    expect(findings).toHaveLength(1);

    const translated = findings[0].map(getTranslatedDescription);
    expect(translated).toHaveLength(1);
    expect(isIcuMessage(translated[0])).toBeTruthy();
    expect(translated[0]).toBeDisplayString(
      'Nonces should use the base64 charset.'
    );
  });

  it('deprecated reflected-xss', () => {
    const rawCsp = `reflected-xss 'none'`;
    const findings = evaluateRawCspForSyntax([rawCsp]);

    expect(findings).toHaveLength(1);

    const translated = findings[0].map(getTranslatedDescription);
    expect(translated).toHaveLength(1);
    expect(isIcuMessage(translated[0])).toBeTruthy();
    expect(translated[0]).toBeDisplayString(
      'reflected-xss is deprecated since CSP2. ' +
      'Please, use the X-XSS-Protection header instead.'
    );
  });

  it('deprecated referrer', () => {
    const rawCsp = `referrer 'none'`;
    const findings = evaluateRawCspForSyntax([rawCsp]);

    expect(findings).toHaveLength(1);

    const translated = findings[0].map(getTranslatedDescription);
    expect(translated).toHaveLength(1);
    expect(isIcuMessage(translated[0])).toBeTruthy();
    expect(translated[0]).toBeDisplayString(
      'referrer is deprecated since CSP2. ' +
      'Please, use the Referrer-Policy header instead.'
    );
  });

  it('deprecated disown-opener', () => {
    const rawCsp = `disown-opener 'none'`;
    const findings = evaluateRawCspForSyntax([rawCsp]);

    expect(findings).toHaveLength(1);

    const translated = findings[0].map(getTranslatedDescription);
    expect(translated).toHaveLength(1);
    expect(isIcuMessage(translated[0])).toBeTruthy();
    expect(translated[0]).toBeDisplayString(
      'disown-opener is deprecated since CSP3. ' +
      'Please, use the Cross-Origin-Opener-Policy header instead.'
    );
  });
});
