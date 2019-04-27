/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Budget = require('../../config/budget.js');
const assert = require('assert');
/* eslint-env jest */

describe('Budget', () => {
  let budgetJson;
  beforeEach(() => {
    budgetJson = [
      {
        path: '/',
        resourceSizes: [
          {
            resourceType: 'script',
            budget: 123,
          },
          {
            resourceType: 'image',
            budget: 456,
          },
        ],
        resourceCounts: [
          {
            resourceType: 'total',
            budget: 100,
          },
          {
            resourceType: 'third-party',
            budget: 10,
          },
        ],
        timings: [
          {
            metric: 'interactive',
            budget: 2000,
            tolerance: 1000,
          },
          {
            metric: 'first-contentful-paint',
            budget: 1000,
            tolerance: 500,
          },
        ],
      },
      {
        path: '/',
        resourceSizes: [
          {
            resourceType: 'script',
            budget: 1000,
          },
        ],
      },
    ];
  });

  it('initializes correctly', () => {
    const budget = Budget.initializeBudget(budgetJson);
    assert.equal(budget.length, 2);

    assert.equal(budget[0].path, '/');

    // Sets resources sizes correctly
    assert.equal(budget[0].resourceSizes.length, 2);
    assert.equal(budget[0].resourceSizes[0].resourceType, 'script');
    assert.equal(budget[0].resourceSizes[0].budget, 123 * 1024);

    // Sets resource counts correctly
    assert.equal(budget[0].resourceCounts.length, 2);
    assert.equal(budget[0].resourceCounts[0].resourceType, 'total');
    assert.equal(budget[0].resourceCounts[0].budget, 100);

    // Sets timings correctly
    assert.equal(budget[0].timings.length, 2);
    assert.equal(budget[0].timings[1].metric, 'first-contentful-paint');
    assert.equal(budget[0].timings[1].budget, 1000);
    assert.equal(budget[0].timings[1].tolerance, 500);

    // Does not set unsupplied budget
    assert.equal(budget[1].timings, null);
  });

  it('throws error if an unsupported budget property is used', () => {
    budgetJson[0].sizes = [];
    assert.throws(_ => Budget.initializeBudget(budgetJson), /[sizes]/);
  });

  describe('resource budget validation', () => {
    it('throws when an invalid resource type is supplied', () => {
      budgetJson[0].resourceSizes[0].resourceType = 'movies';
      assert.throws(_ => Budget.initializeBudget(budgetJson), /Invalid resource type/);
    });

    it('throws when an invalid budget is supplied', () => {
      budgetJson[0].resourceSizes[0].budget = '100 MB';
      assert.throws(_ => Budget.initializeBudget(budgetJson), /Invalid budget/);
    });

    it('throws when an invalid property is supplied', () => {
      budgetJson[0].resourceSizes[0].browser = 'Chrome';
      assert.throws(_ => Budget.initializeBudget(budgetJson), /[browser]/);
    })
    ;
    it('throws when snake case is not used', () => {
      budgetJson[0].resourceSizes[0].resourceType = 'thirdParty';
      assert.throws(_ => Budget.initializeBudget(budgetJson), /Invalid resource type/);
    });
  });

  describe('timing budget validation', () => {
    it('throws when an invalid metric is supplied', () => {
      budgetJson[0].timings[0].metric = 'lastMeaningfulPaint';
      assert.throws(_ => Budget.initializeBudget(budgetJson), /Invalid timing metric/);
    });

    it('throws when an invalid budget is supplied', () => {
      budgetJson[0].timings[0].budget = '100KB';
      assert.throws(_ => Budget.initializeBudget(budgetJson), /Invalid budget/);
    });

    it('throws when an invalid tolerance is supplied', () => {
      budgetJson[0].timings[0].tolerance = '100ms';
      assert.throws(_ => Budget.initializeBudget(budgetJson), /Invalid tolerance/);
    });

    it('throws when an invalid property is supplied', () => {
      budgetJson[0].timings[0].device = 'Phone';
      assert.throws(_ => Budget.initializeBudget(budgetJson), /[device]/);
    });

    it('throws when "time-to-interactive is supplied', () => {
      budgetJson[0].timings[0].metric = 'time-to-interactive';
      assert.throws(_ => Budget.initializeBudget(budgetJson), /Invalid timing metric/);
    });
  });

  describe('path validation', () => {
    it('initializes correctly', () => {
      const budgetArr = [{}];

      budgetArr[0].path = '/';
      assert.equal(Budget.initializeBudget(budgetArr)[0].path, '/');

      budgetArr[0].path = '/*';
      assert.equal(Budget.initializeBudget(budgetArr)[0].path, '/*');

      budgetArr[0].path = '/fish*.php';
      assert.equal(Budget.initializeBudget(budgetArr)[0].path, '/fish*.php');

      budgetArr[0].path = '/*.php$';
      assert.equal(Budget.initializeBudget(budgetArr)[0].path, '/*.php$');
    });
  });

  describe('path validation', () => {
    it('throws error if an invalid path is used', () => {
      const budget = {};

      budget.path = '';
      assert.throws(_ => Budget.initializeBudget(budget), /[A valid path]/);

      budget.path = 'cat';
      assert.throws(_ => Budget.initializeBudget(budget), /[Invalid path]/);

      budget.path = '/cat*cat*cat';
      assert.throws(_ => Budget.initializeBudget(budget), /[Invalid path]/);

      budget.path = '/cat$html';
      assert.throws(_ => Budget.initializeBudget(budget), /[Invalid path]/);
    });

    it('matches root', () => {
      assert.ok(Budget.urlMatchesPattern('https://google.com', '/'));
      assert.ok(Budget.urlMatchesPattern('https://google.com', '*'));
    });

    it('ignores origin', () => {
      assert.equal(Budget.urlMatchesPattern('https://yt.com/videos?id=', '/videos'), true);
      assert.equal(Budget.urlMatchesPattern('https://go.com/dogs', '/go'), false);
    });

    it('is correct', () => {
      const pathMatch = (path, pattern) => {
        const origin = 'https://example.com';
        return Budget.urlMatchesPattern(origin + path, pattern);
      };

      assert.equal(pathMatch('/anything', '/'), true);
      assert.equal(pathMatch('/anything', '/*'), true);
      assert.equal(pathMatch('/anything', '/any'), true);
      assert.equal(pathMatch('/anything', '/anything1'), false);

      assert.equal(pathMatch('/fish', '/fish*'), true);
      assert.equal(pathMatch('/fishfood', '/*food'), true);
      assert.equal(pathMatch('/fish.php', '/*.php$'), true);
      assert.equal(pathMatch('/fis/', '/fish*'), false);

      assert.equal(pathMatch('/fish.php?species=', '/*.php$'), false);
      assert.equal(pathMatch('/Fish.PHP', '/fish.php$'), false);

      assert.equal(pathMatch('/folder/filename.php', '/*.php$'), true);
      assert.equal(pathMatch('/folder/filename.php', '/folder*.php$'), true);
      assert.equal(pathMatch('/filename.php/', '/folder*.php$'), false);
      assert.equal(pathMatch('/filename.php?parameters', '/*.php$'), false);
    });
  });
});
