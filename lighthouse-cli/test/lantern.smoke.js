/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const config = {
  extends: 'lighthouse:full',
  settings: {
    onlyCategories: ['performance'],
    precomputedLanternData: {
      additionalRttByOrigin: {
        'http://localhost:10200': 500,
      },
      serverResponseTimeByOrigin: {
        'http://localhost:10200': 1000,
      },
    },
  },
};

/** @type {Array<Smokehouse.TestDfnV2>} */
module.exports = [
  {
    batch: 'performance',
    url: 'http://localhost:10200/online-only.html',
    config,
    assertions: {
      lhr: {
        audits: {
          'first-contentful-paint': {numericValue: '>2000'},
          'first-cpu-idle': {numericValue: '>2000'},
          'interactive': {numericValue: '>2000'},
        },
      },
    },
  },
  {
    batch: 'performance',
    url: 'http://localhost:10200/tricky-main-thread.html?setTimeout',
    config,
    assertions: {
      lhr: {
        audits: {
          // The scripts stalls for 3 seconds and lantern has a 4x multiplier so 12s minimum.
          'interactive': {numericValue: process.env.APPVEYOR ? '>3000' : '>12000'},
          'bootup-time': {
            details: {
              items: [
                {
                  scripting: '>1000',
                  // FIXME: Appveyor finds the following assertion very flaky for some reason :(
                  url: process.env.APPVEYOR ? /main-thread/ : /main-thread-consumer/,
                },
              ],
            },
          },
        },
      },
    },
  },
  {
    batch: 'performance',
    url: 'http://localhost:10200/tricky-main-thread.html?fetch',
    config,
    assertions: {
      lhr: {
        audits: {
          // The scripts stalls for 3 seconds and lantern has a 4x multiplier so 12s minimum.
          'interactive': {numericValue: process.env.APPVEYOR ? '>3000' : '>12000'},
          'bootup-time': {
            details: {
              items: [
                {
                  scripting: '>1000',
                  // TODO: requires sampling profiler and async stacks, see https://github.com/GoogleChrome/lighthouse/issues/8526
                  // url: /main-thread-consumer/,
                },
              ],
            },
          },
        },
      },
    },
  },
];
