/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @type {Smokehouse.ExpectedRunnerResult}
 * Expected Lighthouse audit values for a site with a single server-side redirect (2s).
 */
const singleServer = {
  lhr: {
    requestedUrl: `http://localhost:10200/online-only.html?delay=2000&redirect=%2Fredirects-final.html`,
    finalUrl: 'http://localhost:10200/redirects-final.html',
    audits: {
      'first-contentful-paint': {
        numericValue: '>=2000',
      },
      'interactive': {
        numericValue: '>=2000',
      },
      'speed-index': {
        numericValue: '>=2000',
      },
      'redirects': {
        score: 1,
        numericValue: '>=2000',
        details: {
          items: {
            length: 2,
          },
        },
      },
    },
    runWarnings: [
      /The page may not be loading as expected because your test URL \(.*online-only.html.*\) was redirected to .*redirects-final.html. Try testing the second URL directly./,
    ],
  },
};

/**
 * @type {Smokehouse.ExpectedRunnerResult}
 * Expected Lighthouse audit values for a site with multiple server-side redirects (3 x 1s).
 */
const multipleServer = {
  lhr: {
    requestedUrl: `http://localhost:10200/online-only.html?delay=1000&redirect_count=3&redirect=%2Fredirects-final.html`,
    finalUrl: 'http://localhost:10200/redirects-final.html',
    audits: {
      'first-contentful-paint': {
        numericValue: '>=3000',
      },
      'interactive': {
        numericValue: '>=3000',
      },
      'speed-index': {
        numericValue: '>=3000',
      },
      'redirects': {
        score: '<1',
        details: {
          items: {
            length: 4,
          },
        },
      },
    },
    runWarnings: [
      /The page may not be loading as expected because your test URL \(.*online-only.html.*\) was redirected to .*redirects-final.html. Try testing the second URL directly./,
    ],
  },
};

/**
 * @type {Smokehouse.ExpectedRunnerResult}
 * Expected Lighthouse audit values for a site with a client-side redirect (2s + 5s),
 * paints at 2s, then a server-side redirect (1s).
 */
const clientPaintServer = {
  // TODO: Assert performance metrics on client-side redirects, see https://github.com/GoogleChrome/lighthouse/pull/10325
  lhr: {
    requestedUrl: `http://localhost:10200/js-redirect.html?delay=2000&jsDelay=5000&jsRedirect=%2Fonline-only.html%3Fdelay%3D1000%26redirect%3D%2Fredirects-final.html`,
    finalUrl: 'http://localhost:10200/redirects-final.html',
    audits: {
      // Just captures the server-side at the moment, should be 8s in the future
      'first-contentful-paint': {
        numericValue: '>=1000',
      },
      'interactive': {
        numericValue: '>=1000',
      },
      'speed-index': {
        numericValue: '>=1000',
      },
      'redirects': {
        score: '<1',
        numericValue: '>=8000',
        details: {
          items: {
            length: 3,
          },
        },
      },
    },
    runWarnings: [
      /The page may not be loading as expected because your test URL \(.*js-redirect.html.*\) was redirected to .*redirects-final.html. Try testing the second URL directly./,
    ],
  },
};

/**
 * @type {Smokehouse.ExpectedRunnerResult}
 * Expected Lighthouse audit values for a site with a client-side redirect (2s + 5s), no paint.
 */
const singleClient = {
  // TODO: Assert performance metrics on client-side redirects, see https://github.com/GoogleChrome/lighthouse/pull/10325
  lhr: {
    requestedUrl: `http://localhost:10200/js-redirect.html?delay=2000&jsDelay=5000&jsRedirect=%2Fredirects-final.html`,
    finalUrl: 'http://localhost:10200/redirects-final.html',
    audits: {
    },
    runWarnings: [
      /The page may not be loading as expected because your test URL \(.*js-redirect.html.*\) was redirected to .*redirects-final.html. Try testing the second URL directly./,
    ],
  },
};

/**
 * @type {Smokehouse.ExpectedRunnerResult}
 * Expected Lighthouse audit values for a site with a client-side redirect (2s + 5s),
 * paints at 2s, then a server-side redirect (1s), followed by a history.pushState to an unrelated URL.
 */
const historyPushState = {
  // TODO: Assert performance metrics on client-side redirects, see https://github.com/GoogleChrome/lighthouse/pull/10325
  lhr: {
    requestedUrl: `http://localhost:10200/js-redirect.html?delay=2000&jsDelay=5000&jsRedirect=%2Fonline-only.html%3Fdelay%3D1000%26redirect%3D%2Fredirects-final.html%253FpushState`,
    // Note that the final URL is the URL of the network requested resource and not that page we end up on.
    // http://localhost:10200/push-state
    finalUrl: 'http://localhost:10200/redirects-final.html?pushState',
    audits: {
    },
    runWarnings: [
      /The page may not be loading as expected because your test URL \(.*js-redirect.html.*\) was redirected to .*redirects-final.html\?pushState. Try testing the second URL directly./,
    ],
  },
};

export {
  singleServer,
  multipleServer,
  clientPaintServer,
  singleClient,
  historyPushState,
};
