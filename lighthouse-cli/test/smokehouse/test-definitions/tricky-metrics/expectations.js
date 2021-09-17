/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @fileoverview
 * Expected Lighthouse audit values for tricky metrics tests that previously failed to be computed.
 * We only place lower bounds because we are checking that these metrics *can* be computed and that
 * we wait long enough to compute them. Upper bounds aren't very helpful here and tend to cause flaky failures.
 */

/**
 * @type {Smokehouse.ExpectedRunnerResult}
 */
const trickyTti = {
  lhr: {
    requestedUrl: 'http://localhost:10200/tricky-tti.html',
    finalUrl: 'http://localhost:10200/tricky-tti.html',
    audits: {
      'interactive': {
        // stalls for ~5 seconds, ~5 seconds out, so should be at least ~10s
        numericValue: '>9900',
      },
    },
  },
};

/**
 * @type {Smokehouse.ExpectedRunnerResult}
 */
const trickyTtiLateFcp = {
  lhr: {
    requestedUrl: 'http://localhost:10200/tricky-tti-late-fcp.html',
    finalUrl: 'http://localhost:10200/tricky-tti-late-fcp.html',
    audits: {
      'interactive': {
        // FCP at least ~5 seconds out
        numericValue: '>4900',
      },
    },
  },
};

/**
 * @type {Smokehouse.ExpectedRunnerResult}
 */
const delayedLcp = {
  lhr: {
    requestedUrl: 'http://localhost:10200/delayed-lcp.html',
    finalUrl: 'http://localhost:10200/delayed-lcp.html',
    audits: {
      'largest-contentful-paint': {
        // LCP is after the ~7s XHR and the ~7s image.
        numericValue: '>14000',
      },
    },
  },
};

/**
 * @type {Smokehouse.ExpectedRunnerResult}
 */
const delayedFcp = {
  lhr: {
    requestedUrl: 'http://localhost:10200/delayed-fcp.html',
    finalUrl: 'http://localhost:10200/delayed-fcp.html',
    audits: {
      'first-contentful-paint': {
        numericValue: '>1', // We just want to check that it doesn't error
      },
    },
  },
};

/**
 * @type {Smokehouse.ExpectedRunnerResult}
 * Lighthouse expecations that metrics are computed even if a debugger statement
 * is left in the page's JS.
 */
const debuggerStatement = {
  lhr: {
    requestedUrl: 'http://localhost:10200/debugger.html',
    finalUrl: 'http://localhost:10200/debugger.html',
    audits: {
      'first-contentful-paint': {
        numericValue: '>1', // We just want to check that it doesn't error
      },
    },
  },
};

export {
  trickyTti,
  trickyTtiLateFcp,
  delayedLcp,
  delayedFcp,
  debuggerStatement,
};
