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

// Only allow the empty script with the source map.
// Hash generated using https://strict-csp-codelab.glitch.me/csp_sha256_util.html
// Easiest way to get script contents with whitespace is by copying script node in DevTools.
const blockAllExceptInlineScriptCsp = headersParam([[
  'Content-Security-Policy',
  `default-src 'none'; script-src 'sha256-NCWlI90TxQpIfghtBWJyNU5Y92Nj8XhO+AYMm0gqGfQ='`,
]]);

/**
 * @type {Smokehouse.ExpectedRunnerResult}
 * Expectations of CSP results with a default Lighthouse run.
 */
const allowAll = {
  artifacts: {
    RobotsTxt: {
      status: 200,
    },
    InspectorIssues: {contentSecurityPolicy: []},
    SourceMaps: [{
      sourceMapUrl: 'http://localhost:10200/source-map/script.js.map',
      map: {},
      errorMessage: undefined,
    }],
  },
  lhr: {
    requestedUrl: 'http://localhost:10200/csp.html',
    finalUrl: 'http://localhost:10200/csp.html',
    audits: {},
  },
};

/**
 * @type {Smokehouse.ExpectedRunnerResult}
 */
const blockAllM91 = {
  artifacts: {
    _maxChromiumMilestone: 91,
    RobotsTxt: {
      status: null,
      content: null,
    },
    InspectorIssues: {
      contentSecurityPolicy: [
        {
          // https://github.com/GoogleChrome/lighthouse/issues/10225
          //
          // Fixed with new fetcher using M92.
          blockedURL: 'http://localhost:10200/robots.txt',
          violatedDirective: 'connect-src',
          isReportOnly: false,
          contentSecurityPolicyViolationType: 'kURLViolation',
        },
      ],
    },
    SourceMaps: [{
      // Doesn't trigger a CSP violation because iframe is injected after InspectorIssues gatherer finishes.
      // https://github.com/GoogleChrome/lighthouse/pull/12044#issuecomment-788274938
      //
      // Fixed with new fetcher using M92.
      sourceMapUrl: 'http://localhost:10200/source-map/script.js.map',
      errorMessage: 'Error: Timed out fetching resource.',
      map: undefined,
    }],
  },
  lhr: {
    requestedUrl: 'http://localhost:10200/csp.html?' + blockAllExceptInlineScriptCsp,
    finalUrl: 'http://localhost:10200/csp.html?' + blockAllExceptInlineScriptCsp,
    audits: {},
  },
};

/**
 * @type {Smokehouse.ExpectedRunnerResult}
 */
const blockAll = {
  // Same CSP as above, but verifies correct behavior for M92.
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

export {
  allowAll,
  blockAllM91,
  blockAll,
};
