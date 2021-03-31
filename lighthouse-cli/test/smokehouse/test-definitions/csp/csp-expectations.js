/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @type {Array<Smokehouse.ExpectedRunnerResult>}
 * Expected Lighthouse artifacts from Form gatherer
 */
const expectations = [
  {
    lhr: {
      // requestedUrl: 'http://localhost:10200/csp/csp.html?csp=script-src%20%27nonce-asdf%27%20https://example.com;%20foo-bar%20%27none%27%20style-src:%20self;',
      requestedUrl: 'http://localhost:10200/csp/csp-sticky.html?csp=style-src%20%27self%27',
      finalUrl: 'http://localhost:10200/csp/csp-sticky.html?csp=style-src%20%27self%27',
      audits: {
        'inspector-issues': {
          details: {
            // No CSP violiations from injecting styles in disableFixedAndStickyElementPointerEvents
            length: 0,
          }
        },
        'tap-targets': {
          details: {
            // Tap Target disableFixedAndStickyElementPointerEvents does its job and ignores sticky (but overlapping) targets
            items: []
          }
        }
      },
    },
  },
];

module.exports = expectations;
