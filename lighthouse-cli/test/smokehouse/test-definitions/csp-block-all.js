/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @param {[string, string][]} headers
 * @return {string}
 */
function headersParam(headers) {
  const headerString = new URLSearchParams(headers).toString();
  return new URLSearchParams([['extra_header', headerString]]).toString();
}

/**
 * Only allow the empty script with the source map.
 * Hash generated using https://strict-csp-codelab.glitch.me/csp_sha256_util.html
 * Easiest way to get script contents with whitespace is by copying script node in DevTools.
 */
const blockAllExceptInlineScriptCsp = headersParam([[
  'Content-Security-Policy',
  `default-src 'none'; script-src 'sha256-NCWlI90TxQpIfghtBWJyNU5Y92Nj8XhO+AYMm0gqGfQ='`,
]]);

/**
 * Same CSP as block-all-m91.js, but verifies correct behavior for M92.
 * @type {Smokehouse.ExpectedRunnerResult}
 */
const expectations = {
  artifacts: {
    _minChromiumMilestone: 92,
    RobotsTxt: {
      status: 200,
    },
    InspectorIssues: {
      contentSecurityPolicy: [],
    },
    SourceMaps: [{
      sourceMapUrl: 'http://localhost:10200/source-map/script.js.map',
      map: {},
      errorMessage: undefined,
    }],
  },
  lhr: {
    requestedUrl: 'http://localhost:10200/csp.html?' + blockAllExceptInlineScriptCsp,
    finalUrl: 'http://localhost:10200/csp.html?' + blockAllExceptInlineScriptCsp,
    audits: {},
  },
};

const testDefn = {
  id: 'csp-block-all',
  expectations,
};

export {
  blockAllExceptInlineScriptCsp,
  testDefn as default,
};
