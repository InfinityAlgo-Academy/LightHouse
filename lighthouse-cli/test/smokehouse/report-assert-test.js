/**
 * @license Copyright 2022 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

/* eslint-disable no-control-regex */

import {findDifference, getAssertionReport} from './report-assert.js';
import {readJson} from '../../../root.js';

describe('findDifference', () => {
  const testCases = {
    'works (trivial passing)': {
      actual: {},
      expected: {},
      diff: null,
    },
    'works (trivial fail)': {
      actual: {},
      expected: {a: 1},
      diff: {path: '.a', actual: undefined, expected: 1},
    },
    'works (trivial fail, nested)': {
      actual: {a: {b: 2}},
      expected: {a: {b: 1}},
      diff: {path: '.a.b', actual: 2, expected: 1},
    },

    'range (1)': {
      actual: {duration: 100},
      expected: {duration: '>=100'},
      diff: null,
    },
    'range (2)': {
      actual: {},
      expected: {duration: '>=100'},
      diff: {path: '.duration', actual: undefined, expected: '>=100'},
    },
    'range (3)': {
      actual: {duration: 100},
      expected: {duration: '>100'},
      diff: {path: '.duration', actual: 100, expected: '>100'},
    },
    'range (4)': {
      actual: {duration: 100},
      expected: {duration: '<100'},
      diff: {path: '.duration', actual: 100, expected: '<100'},
    },

    'array (1)': {
      actual: {prices: [0, 1, 2, 3, 4, 5]},
      expected: {prices: {length: 6}},
      diff: null,
    },
    'array (2)': {
      actual: {prices: [0, 1, 2, 3, 4, 5]},
      expected: {prices: {length: '>0'}},
      diff: null,
    },
    'array (3)': {
      actual: {prices: [0, 1, 2, 3, 4, 5]},
      expected: {prices: [0, 1, 2, 3, 4, 5]},
      diff: null,
    },
    'array (4)': {
      actual: {prices: [0, 1, 2, 3, 4, 5]},
      expected: {prices: [0, 1, 2, 3, 4, 5, 6]},
      diff: {path: '.prices[6]', actual: undefined, expected: 6},
    },
    'array (5)': {
      actual: {prices: [0, 1, 2, 3, 4, 5]},
      expected: {prices: []},
      diff: {path: '.prices.length', actual: [0, 1, 2, 3, 4, 5], expected: []},
    },
    'array (6)': {
      actual: {prices: [0, 1, 2, 3, 4, 5]},
      expected: {prices: {'3': '>=3'}},
      diff: null,
    },
    'array (7)': {
      actual: {prices: [0, 1, 2, {nested: 3}, 4, 5]},
      expected: {prices: {'3': {nested: '>3'}}},
      diff: {path: '.prices[3].nested', actual: 3, expected: '>3'},
    },

    '_includes (1)': {
      actual: {prices: [0, 1, 2, 3, 4, 5]},
      expected: {prices: {_includes: [4]}},
      diff: null,
    },
    '_includes (2)': {
      actual: {prices: [0, 1, 2, 3, 4, 5]},
      expected: {prices: {_includes: [4, 4]}},
      diff: {path: '.prices', actual: 'Item not found in array', expected: 4},
    },
    '_includes (3)': {
      actual: {prices: [0, 1, 2, 3, 4, 5]},
      expected: {prices: {_includes: [100]}},
      diff: {path: '.prices', actual: 'Item not found in array', expected: 100},
    },
    '_includes (4)': {
      actual: {prices: ['0', '1', '2', '3', '4', '5']},
      expected: {prices: {_includes: [/\d/, /\d/, /\d/, /\d/, /\d/, /\d/]}},
      diff: null,
    },

    '_excludes (1)': {
      actual: {prices: [0, 1, 2, 3, 4, 5]},
      expected: {prices: {_excludes: [100]}},
      diff: null,
    },
    '_excludes (2)': {
      actual: {prices: [0, 1, 2, 3, 4, 5]},
      expected: {prices: {_excludes: [2]}},
      diff: {path: '.prices', actual: 2, expected: {
        expectedExclusion: 2,
        message: 'Expected to not find matching entry via _excludes',
      }},
    },

    '_includes and _excludes (1)': {
      actual: {prices: [0, 1, 2, 3, 4, 5]},
      expected: {prices: {_includes: [2], _excludes: [2]}},
      diff: null,
    },
    // Order matters.
    '_includes and _excludes (2)': {
      actual: {prices: [0, 1, 2, 3, 4, 5]},
      expected: {prices: {_excludes: [2], _includes: [2]}},
      diff: {path: '.prices', actual: 2, expected: {
        expectedExclusion: 2,
        message: 'Expected to not find matching entry via _excludes',
      }},
    },
    '_includes and _excludes (3)': {
      actual: {prices: [0, 1, 2, 3, 4, 5]},
      expected: {prices: {_includes: [2], _excludes: [2, 1]}},
      diff: {path: '.prices', actual: 1, expected: {
        expectedExclusion: 1,
        message: 'Expected to not find matching entry via _excludes',
      }},
    },
  };

  for (const [testName, {actual, expected, diff}] of Object.entries(testCases)) {
    it(testName, () => {
      expect(findDifference('', actual, expected)).toEqual(diff);
    });
  }
});

/**
 * Removes ANSI codes.
 * TODO: should make it so logger can disable these.
 * @param {string} text
 */
function clean(text) {
  return text
    .replace(/\x1B.*?m/g, '')
    .replace(/\x1b.*?m/g, '')
    .replace(/[✘×]/g, 'X')
    .trim();
}

describe('getAssertionReport', () => {
  const lhr = readJson('lighthouse-core/test/results/sample_v2.json');
  const artifacts = readJson('lighthouse-core/test/results/artifacts/artifacts.json');

  it('works (trivial passing)', () => {
    const report = getAssertionReport({lhr, artifacts}, {
      lhr: {
        audits: {},
        requestedUrl: 'http://localhost:10200/dobetterweb/dbw_tester.html',
        finalUrl: 'http://localhost:10200/dobetterweb/dbw_tester.html',
      },
    });
    expect(report).toMatchObject({passed: 3, failed: 0, log: ''});
  });

  it('works (trivial failing)', () => {
    const report = getAssertionReport({lhr, artifacts}, {
      lhr: {
        audits: {
          'cumulative-layout-shift': {
            details: {
              items: [],
            },
          },
        },
        requestedUrl: 'http://localhost:10200/dobetterweb/dbw_tester.html',
        finalUrl: 'http://localhost:10200/dobetterweb/dbw_tester.html',
      },
    });
    expect(report).toMatchObject({passed: 3, failed: 1});
    expect(clean(report.log)).toMatchSnapshot();
  });
});
