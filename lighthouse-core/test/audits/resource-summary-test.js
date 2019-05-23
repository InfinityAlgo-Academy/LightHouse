/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const ResourceSummaryAudit = require('../../audits/resource-summary.js');
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
      URL: {requestedUrl: 'https://example.com', finalUrl: 'https://example.com'},
    };
  });

  it('has three table columns', async () => {
    const result = await ResourceSummaryAudit.audit(artifacts, context);
    expect(result.details.headings).toHaveLength(3);
  });

  it('has the correct score', async () => {
    const result = await ResourceSummaryAudit.audit(artifacts, context);
    expect(result.score).toBe(1);
  });

  it('has the correct display value', async () => {
    const result = await ResourceSummaryAudit.audit(artifacts, context);
    expect(result.displayValue).toBeDisplayString('4 requests • 0 KB');
  });

  it('includes the correct properties for each table item', async () => {
    const result = await ResourceSummaryAudit.audit(artifacts, context);
    const item = result.details.items[0];
    expect(item.resourceType).toEqual('total');
    expect(item.label).toBeDisplayString('Total');
    expect(item.requestCount).toBe(4);
    expect(item.size).toBe(160);
  });

  it('includes all resource types, regardless of whether page contains them', async () => {
    const result = await ResourceSummaryAudit.audit(artifacts, context);
    expect(Object.keys(result.details.items)).toHaveLength(9);
  });

  it('it displays "0" if there are no resources of that type', async () => {
    const result = await ResourceSummaryAudit.audit(artifacts, context);
    const fontItem = result.details.items.find(item => item.resourceType === 'font');
    expect(fontItem.requestCount).toBe(0);
    expect(fontItem.size).toBe(0);
  });

  describe('table ordering', () => {
    it('except for the last row, it sorts items by size (descending)', async () => {
      const result = await ResourceSummaryAudit.audit(artifacts, context);
      const items = result.details.items;
      items.slice(0, -2).forEach((item, index) => {
        expect(item.size).toBeGreaterThanOrEqual(items[index + 1].size);
      });
    });

    it('"Total" is the first row', async () => {
      const result = await ResourceSummaryAudit.audit(artifacts, context);
      expect(result.details.items[0].resourceType).toBe('total');
    });

    it('"Third-party" is the last-row', async () => {
      const result = await ResourceSummaryAudit.audit(artifacts, context);
      const items = result.details.items;
      expect(items[items.length - 1].resourceType).toBe('third-party');
    });
  });
});
