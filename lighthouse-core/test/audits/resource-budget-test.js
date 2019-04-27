/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('../../audits/resource-budget.js');
const assert = require('assert');
const networkRecordsToDevtoolsLog = require('../network-records-to-devtools-log.js');

/* eslint-env jest */

describe('Performance: Resource budgets audit', () => {
  let artifacts;
  let context;
  beforeEach(() => {
    artifacts = {
      devtoolsLogs: {
        defaultPass: networkRecordsToDevtoolsLog([
          {url: 'http://example.com/file.html', resourceType: 'Document', transferSize: 30},
          {url: 'http://example.com/app.js', resourceType: 'Script', transferSize: 10},
          {url: 'http://third-party.com/script.js', resourceType: 'Script', transferSize: 50},
          {url: 'http://third-party.com/file.jpg', resourceType: 'Image', transferSize: 70},
        ]),
      },
      URL: {requestedURL: 'http://example.com', finalURL: 'http://example.com'},
    };
    context = {computedCache: new Map(), settings: {}};
  });

  describe('with a budget.json', () => {
    beforeEach(() => {
      context.settings.budgets = [{
        path: '/',
        resourceSizes: [{
          resourceType: 'script',
          budget: 1,
        }],
        resourceCounts: [{
          resourceType: 'script',
          budget: 10000,
        }],
      }];
    });

    it('includes table columns for request & file size overages', () => {
      return Audit.audit(artifacts, context).then(result => {
        assert.equal(result.details.headings.length, 5);
      });
    });

    it('displays request & file size overages correctly', () => {
      return Audit.audit(artifacts, context).then(result => {
        assert.equal(result.details.items[0].sizeOverBudget, 59);
        assert.equal(result.details.items[0].countOverBudget, undefined);
      });
    });

    it('only includes rows for resource types with budgets', () => {
      return Audit.audit(artifacts, context).then(result => {
        assert.equal(result.details.items.length, 1);
      });
    });

    it('sorts rows by descending file size overage', () => {
      context.settings.budgets = [{
        path: '/',
        resourceSizes: [
          {
            resourceType: 'document',
            budget: 0,
          },
          {
            resourceType: 'script',
            budget: 0,
          },
          {
            resourceType: 'image',
            budget: 0,
          },
        ],
      }];
      return Audit.audit(artifacts, context).then(result => {
        const items = result.details.items;
        assert.ok(items[0].sizeOverBudget >= items[1].sizeOverBudget);
        assert.ok(items[1].sizeOverBudget >= items[2].sizeOverBudget);
      });
    });

    it('uses the last matching budget', () => {
      context.settings.budgets = [{
        path: '/',
        resourceSizes: [
          {
            resourceType: 'image',
            budget: 0,
          },
        ],
      },
      {
        path: '/',
        resourceSizes: [
          {
            resourceType: 'script',
            budget: 0,
          },
        ],
      },
      ];
      return Audit.audit(artifacts, context).then(result => {
        const items = result.details.items;
        assert.ok(items[0].label.includes('script'));
      });
    });
  });

  describe('without a budget.json', () => {
    beforeEach(() => {
      context.settings.budgets = null;
    });

    it('table only includes resourceType, requests, and file size', () => {
      return Audit.audit(artifacts, context).then(result => {
        assert.equal(result.details.headings.length, 3);
      });
    });

    it('table includes all resource types', () => {
      return Audit.audit(artifacts, context).then(result => {
        assert.equal(result.details.items.length, 9);
      });
    });

    it('sorts rows by descending file size', () => {
      return Audit.audit(artifacts, context).then(result => {
        const items = result.details.items;
        assert.ok(items[0].size >= items[1].size);
        assert.ok(items[1].size >= items[2].size);
        assert.ok(items[2].size >= items[3].size);
      });
    });
  });
});
