/**
 * @license Copyright 2022 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

/** @type {LH.Config.Json} */
const config = {
  extends: 'lighthouse:default',
  settings: {
    onlyAudits: ['bf-cache'],
  },
};

/**
 * @type {Smokehouse.ExpectedRunnerResult}
 */
const expectations = {
  artifacts: {
    BFCacheFailures: [{
      notRestoredReasonsTree: {
        PageSupportNeeded: {
          UnloadHandlerExistsInMainFrame: [
            'http://localhost:10200/prevent-bf-cache.html',
          ],
        },
        Circumstantial: {},
        SupportPending: {},
      },
    }],
  },
  lhr: {
    requestedUrl: 'http://localhost:10200/prevent-bf-cache.html',
    finalDisplayedUrl: 'http://localhost:10200/prevent-bf-cache.html',
    audits: {
      'bf-cache': {
        details: {
          items: {
            _includes: [
              {
                reason: 'The page has an unload handler in the main frame.',
                failureType: 'Actionable',
                subItems: {
                  items: [{
                    frameUrl: 'http://localhost:10200/prevent-bf-cache.html',
                  }],
                },
              },
              {
                // The DevTools runner uses Puppeteer to launch Chrome which disables BFCache by default.
                // https://github.com/puppeteer/puppeteer/issues/8197
                //
                // If we ignore the Puppeteer args and force BFCache to be enabled, it causes thew viewport to be sized incorrectly for other tests.
                // These viewport issues are not present when Lighthouse is run from DevTools manually.
                // TODO: Investigate why BFCache causes viewport issues only in our DevTools smoke tests.
                _runner: 'devtools',
                reason: 'Back/forward cache is disabled by flags. Visit chrome://flags/#back-forward-cache to enable it locally on this device.',
                failureType: 'Not actionable',
                subItems: {
                  items: [{
                    frameUrl: 'http://localhost:10200/prevent-bf-cache.html',
                  }],
                },
              },
            ],
            // There should be no other failure reasons.
            _excludes: [{}],
          },
        },
      },
    },
  },
};

export default {
  id: 'bf-cache',
  expectations,
  config,
};


