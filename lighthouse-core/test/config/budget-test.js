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
  let budget;
  beforeEach(() => {
    budget = [
      {
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
            // tolerance is optional, so not defined here.
          },
        ],
      },
      {
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
    const budgets = Budget.initializeBudget(budget);
    assert.equal(budgets.length, 2);

    // Sets resources sizes correctly
    assert.equal(budgets[0].resourceSizes.length, 2);
    assert.equal(budgets[0].resourceSizes[0].resourceType, 'script');
    assert.equal(budgets[0].resourceSizes[0].budget, 123);

    // Sets resource counts correctly
    assert.equal(budgets[0].resourceCounts.length, 2);
    assert.equal(budgets[0].resourceCounts[0].resourceType, 'total');
    assert.equal(budgets[0].resourceCounts[0].budget, 100);

    // Sets timings correctly
    assert.equal(budgets[0].timings.length, 2);
    assert.deepStrictEqual(budgets[0].timings[0], {
      metric: 'interactive',
      budget: 2000,
      tolerance: 1000,
    });
    assert.equal(budgets[0].timings[1].metric, 'first-contentful-paint');
    assert.equal(budgets[0].timings[1].budget, 1000);

    // Does not set unsupplied budgets
    assert.equal(budgets[1].timings, null);
  });

  it('accepts an empty array', () => {
    const budgets = Budget.initializeBudget([]);
    assert.deepStrictEqual(budgets, []);
  });

  it('throws error if an unsupported budget property is used', () => {
    budget[0].sizes = [];
    assert.throws(_ => Budget.initializeBudget(budget),
      /Budget has unrecognized properties: \[sizes\]/);
  });

  describe('top-level validation', () => {
    it('throws when provided an invalid budget array', () => {
      assert.throws(_ => Budget.initializeBudget(55),
        /Budget file is not defined as an array of budgets/);

      assert.throws(_ => Budget.initializeBudget(['invalid123']),
        /Budget file is not defined as an array of budgets/);

      assert.throws(_ => Budget.initializeBudget([null]),
        /Budget file is not defined as an array of budgets/);
    });

    it('throws when budget contains invalid resourceSizes entry', () => {
      budget[0].resourceSizes = 55;
      assert.throws(_ => Budget.initializeBudget(budget),
        /^Error: Invalid resourceSizes entry in budget at index 0$/);
    });

    it('throws when budget contains invalid resourceCounts entry', () => {
      budget[0].resourceCounts = 'A string';
      assert.throws(_ => Budget.initializeBudget(budget),
        /^Error: Invalid resourceCounts entry in budget at index 0$/);
    });

    it('throws when budget contains invalid timings entry', () => {
      budget[1].timings = false;
      assert.throws(_ => Budget.initializeBudget(budget),
        /^Error: Invalid timings entry in budget at index 1$/);
    });
  });

  describe('resource budget validation', () => {
    it('throws when an invalid resource type is supplied', () => {
      budget[0].resourceSizes[0].resourceType = 'movies';
      assert.throws(_ => Budget.initializeBudget(budget),
        // eslint-disable-next-line max-len
        /Invalid resource type: movies. \nValid resource types are: total, document,/);
    });

    it('throws when an invalid budget is supplied', () => {
      budget[0].resourceSizes[0].budget = '100 MB';
      assert.throws(_ => Budget.initializeBudget(budget), /Invalid budget: 100 MB/);
    });

    it('throws when an invalid property is supplied', () => {
      budget[0].resourceSizes[0].browser = 'Chrome';
      assert.throws(_ => Budget.initializeBudget(budget),
        /Resource Budget has unrecognized properties: \[browser\]/);
    });
  });

  describe('timing budget validation', () => {
    it('throws when an invalid metric is supplied', () => {
      budget[0].timings[0].metric = 'medianMeaningfulPaint';
      assert.throws(_ => Budget.initializeBudget(budget),
        // eslint-disable-next-line max-len
        /Invalid timing metric: medianMeaningfulPaint. \nValid timing metrics are: first-contentful-paint, /);
    });

    it('throws when an invalid budget is supplied', () => {
      budget[0].timings[0].budget = '100KB';
      assert.throws(_ => Budget.initializeBudget(budget), /Invalid budget: 100KB/);
    });

    it('throws when an invalid tolerance is supplied', () => {
      budget[0].timings[0].tolerance = '100ms';
      assert.throws(_ => Budget.initializeBudget(budget), /Invalid tolerance: 100ms/);
    });

    it('throws when an invalid property is supplied', () => {
      budget[0].timings[0].device = 'Phone';
      budget[0].timings[0].location = 'The middle somewhere, I don\'t know';
      assert.throws(_ => Budget.initializeBudget(budget),
        /Timing Budget has unrecognized properties: \[device, location\]/);
    });
  });
});
