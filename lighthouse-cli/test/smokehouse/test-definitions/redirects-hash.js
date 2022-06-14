/**
 * @license Copyright 2022 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

/**
 * @type {Smokehouse.ExpectedRunnerResult}
 * Expected Lighthouse URL values for a single redirect with a hash.
 */
const expectations = {
  artifacts: {
    URL: {
      initialUrl: 'about:blank',
      requestedUrl: `http://localhost:10200/online-only.html?redirect=%2Fredirects-final.html#hash`,
      // The network request for the main document should exclude the hash
      mainDocumentUrl: 'http://localhost:10200/redirects-final.html',
      finalUrl: 'http://localhost:10200/redirects-final.html#hash',
    },
  },
  lhr: {
    requestedUrl: `http://localhost:10200/online-only.html?redirect=%2Fredirects-final.html#hash`,
    finalUrl: 'http://localhost:10200/redirects-final.html#hash',
    audits: {},
    runWarnings: [
      /The page may not be loading as expected because your test URL \(.*online-only.html.*#hash\) was redirected to .*redirects-final.html. Try testing the second URL directly./,
    ],
  },
};

export default {
  id: 'redirects-hash',
  expectations,
};
