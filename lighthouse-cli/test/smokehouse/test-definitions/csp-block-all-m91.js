/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

import {blockAllExceptInlineScriptCsp} from './csp-block-all.js';

/**
 * @type {Smokehouse.ExpectedRunnerResult}
 */
const expectations = {
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

export default {
  id: 'csp-block-all-m91',
  expectations,
};
