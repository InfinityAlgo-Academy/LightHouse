/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('../../audits/resource-summary.js');
const assert = require('assert');
const networkRecordsToDevtoolsLog = require('../network-records-to-devtools-log.js');

/* eslint-env jest */

describe('Performance: Resource summary audit', () => {
  let artifacts;
  let context;
  beforeEach(() => {
    context = {computedCache: new Map()};

    artifacts = {
      devtoolsLogs: {
        defaultPass: networkRecordsToDevtoolsLog([
          {url: 'http://example.com/file.html', resourceType: 'Document', transferSize: 30},
          {url: 'http://example.com/app.js', resourceType: 'Script', transferSize: 10},
          {url: 'http://third-party.com/script.js', resourceType: 'Script', transferSize: 50},
          {url: 'http://third-party.com/file.jpg', resourceType: 'Image', transferSize: 70},
        ])},
      URL: {finalURL: 'https://example.com'},
    };
  });

  it('includes all resource types, regardless of whether page contains them', () => {
    return Audit.audit(artifacts, context).then(result => {
      assert.equal(Object.keys(result.details.items).length, 9);
    });
  });

  it('it displays "0" if there are no resources of that type', () => {
    return Audit.audit(artifacts, context).then(result => {
      const fontItem = result.details.items.find(item => item.resourceType === 'font');
      assert.equal(fontItem.count, 0);
      assert.equal(fontItem.size, 0);
    });
  });

  it('it sorts items by size (descending)', () => {
    return Audit.audit(artifacts, context).then(result => {
      const items = result.details.items;
      assert.ok(items[0].size >= items[1].size);
      assert.ok(items[1].size >= items[2].size);
      assert.ok(items[2].size >= items[3].size);
    });
  });
});
